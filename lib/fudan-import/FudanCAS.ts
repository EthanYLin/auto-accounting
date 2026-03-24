/**
 * 复旦统一身份认证（CAS）登录模块（仅限服务端使用）
 *
 * 依赖 Node.js 内置 crypto 模块与 fetch，不可在客户端导入。
 */
import crypto from "crypto";

// ─────────────────────────────────────────────
// Cookie Jar：跨请求维护会话 Cookie
// ─────────────────────────────────────────────

export class CookieJar {
  private cookies: Record<string, string> = {};

  /** 从响应 Set-Cookie 头中解析并合并 Cookie */
  updateFromResponse(response: Response): void {
    const setCookieHeaders: string[] =
      (response.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.() ?? [];

    for (const header of setCookieHeaders) {
      const [nameValue] = header.split(";");
      const eqIndex = nameValue.indexOf("=");
      if (eqIndex > 0) {
        const name = nameValue.slice(0, eqIndex).trim();
        const value = nameValue.slice(eqIndex + 1).trim();
        this.cookies[name] = value;
      }
    }
  }

  /** 生成适合放入请求头的 Cookie 字符串 */
  toCookieHeader(): string {
    return Object.entries(this.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }
}

// ─────────────────────────────────────────────
// FetchSession：封装带 Cookie 的 fetch 会话
// ─────────────────────────────────────────────

export class FetchSession {
  readonly jar: CookieJar = new CookieJar();

  /** 发送携带当前 Cookie 的请求，并自动更新 Cookie Jar */
  async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = new Headers(options.headers as HeadersInit | undefined);
    const cookieStr = this.jar.toCookieHeader();
    if (cookieStr) headers.set("Cookie", cookieStr);

    const response = await fetch(url, { ...options, headers });
    this.jar.updateFromResponse(response);
    return response;
  }
}

// ─────────────────────────────────────────────
// 辅助函数
// ─────────────────────────────────────────────

/**
 * 尝试从 URL 的 fragment 参数中提取 CAS 登录上下文。
 */
function extractLoginContext(url: string): { lck: string; entityId: string; theme: string } | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname !== "id.fudan.edu.cn") return null;

    const fragment = parsed.hash.slice(1); // 去掉 '#'
    if (!fragment.includes("?")) return null;

    const queryStr = fragment.split("?")[1];
    const params = new URLSearchParams(queryStr);

    const lck = params.get("lck");
    const entityId = params.get("entityId");
    const theme = params.get("theme");

    if (!lck || !entityId || !theme) return null;
    return { lck, entityId, theme };
  } catch {
    return null;
  }
}

/**
 * 使用 RSA PKCS#1 v1.5 对明文加密，返回 Base64 字符串。
 *
 * @param message 待加密的明文字符串
 * @param pubKey  PKCS#1 格式的公钥（不含 PEM 头尾行）
 */
function rsaEncrypt(message: string, pubKey: string): string {
  // 服务器返回的公钥 base64 可能是 SPKI 或 PKCS#1 格式。
  let keyObject: crypto.KeyObject;

  try {
    // 优先尝试 SPKI（SubjectPublicKeyInfo）
    const spkiPem = `-----BEGIN PUBLIC KEY-----\n${pubKey}\n-----END PUBLIC KEY-----`;
    keyObject = crypto.createPublicKey({ key: spkiPem, format: "pem", type: "spki" });
  } catch {
    // 回退到 PKCS#1（BEGIN RSA PUBLIC KEY）
    const pkcs1Pem = `-----BEGIN RSA PUBLIC KEY-----\n${pubKey}\n-----END RSA PUBLIC KEY-----`;
    keyObject = crypto.createPublicKey({ key: pkcs1Pem, format: "pem", type: "pkcs1" });
  }

  const encrypted = crypto.publicEncrypt(
    { key: keyObject, padding: crypto.constants.RSA_PKCS1_PADDING },
    new TextEncoder().encode(message),
  );
  return encrypted.toString("base64");
}

// ─────────────────────────────────────────────
// CAS 端点
// ─────────────────────────────────────────────

const QUERY_AUTH_METHODS_URL = "https://id.fudan.edu.cn/idp/authn/queryAuthMethods";
const GET_JS_PUBLIC_KEY_URL = "https://id.fudan.edu.cn/idp/authn/getJsPublicKey";
const AUTH_EXECUTE_URL = "https://id.fudan.edu.cn/idp/authn/authExecute";
const AUTHN_ENGINE_URL = "https://id.fudan.edu.cn/idp/authCenter/authnEngine?locale=zh-CN";

// ─────────────────────────────────────────────
// 登录结果类型
// ─────────────────────────────────────────────

export type CasLoginResult =
  | { success: true; locationValue: string; session: FetchSession }
  | { success: false; error: string };

// ─────────────────────────────────────────────
// 主登录函数
// ─────────────────────────────────────────────

/**
 * 执行复旦 CAS 登录流程，成功后返回已认证的会话和票据跳转地址。
 *
 * @param serviceUrl  登录成功后回跳的服务地址
 * @param uid         统一身份认证账号
 * @param pwd         统一身份认证密码
 */
export async function casLogin(
  serviceUrl: string,
  uid: string,
  pwd: string,
): Promise<CasLoginResult> {
  const session = new FetchSession();

  try {
    // ── Step 1. 沿重定向链获取 lck、entityId ──────────────────────────
    let currentUrl = serviceUrl;
    let lck: string | null = null;
    let entityId: string | null = null;

    for (let i = 0; i < 10; i++) {
      const response = await session.fetch(currentUrl, { redirect: "manual" });

      const status = response.status;
      if (status < 300 || status >= 400) {
        throw new Error("重定向链结束，但未获取到 lck 和 entityId");
      }

      const location = response.headers.get("Location");
      if (!location) throw new Error("CAS 重定向响应缺少 Location 头");

      const ctx = extractLoginContext(location);
      if (ctx) {
        lck = ctx.lck;
        entityId = ctx.entityId;
        break;
      }

      currentUrl = location;
    }

    if (!lck || !entityId) {
      throw new Error("重定向次数超过上限，未获取到完整的 CAS 登录上下文");
    }

    // ── Step 2. 查询可用认证方式，提取 authChainCode ──────────────────
    const queryResp = await session.fetch(QUERY_AUTH_METHODS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entityId, lck }),
    });
    const queryData = (await queryResp.json()) as { data: { moduleCode: string; authChainCode: string }[] };
    const authMethods = queryData.data;

    if (authMethods[0]?.moduleCode !== "userAndPwd") {
      throw new Error(`不支持的认证方式: ${authMethods[0]?.moduleCode}，预期为 userAndPwd`);
    }
    const authChainCode: string = authMethods[0].authChainCode;

    // ── Step 3. 获取前端 JS 公钥 ─────────────────────────────────────
    const pubKeyResp = await session.fetch(GET_JS_PUBLIC_KEY_URL);
    const pubKeyData = (await pubKeyResp.json()) as { data: string };
    const pubKey: string = pubKeyData.data;

    // ── Step 4. 提交登录请求，获取 loginToken ────────────────────────
    const loginPayload = {
      authModuleCode: "userAndPwd",
      authChainCode,
      entityId,
      requestType: "chain_type",
      lck,
      authPara: {
        loginName: uid,
        password: rsaEncrypt(pwd, pubKey),
        verifyCode: "",
      },
    };

    const loginResp = await session.fetch(AUTH_EXECUTE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(loginPayload),
      redirect: "manual",
    });
    const loginData = (await loginResp.json()) as { loginToken: string };
    const loginToken: string = loginData.loginToken;

    // ── Step 5. 用 loginToken 换取服务票据，提取 locationValue ────────
    const ticketResp = await session.fetch(AUTHN_ENGINE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ loginToken }).toString(),
    });
    const ticketText = await ticketResp.text();

    const locationMatch = ticketText.match(/locationValue\s*=\s*["']([^"']+)['"]/);
    if (!locationMatch) {
      throw new Error("换取票据失败：响应体中未找到 locationValue。（请检查用户名及密码是否正确）");
    }

    return { success: true, locationValue: locationMatch[1], session };
  } catch (e) {
    return {
      success: false,
      error: `CAS 登录失败: ${e instanceof Error ? e.message : String(e)}`,
    };
  }
}
