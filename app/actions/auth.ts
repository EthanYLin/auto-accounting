"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

// 登录：邮箱 + 密码
export async function signIn(email: string, password: string) {
  let supabase;
  try {
    supabase = await createClient();
  } catch (err) {
    console.error("创建 Supabase 客户端错误:", err);
    return { error: "服务异常，请稍后重试" };
  }

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error.message };
    }

    revalidatePath("/", "layout");
    return { success: true };
  } catch (err) {
    console.error("signIn 错误:", err);
    if (err instanceof Error) {
      return { error: `登录异常: ${err.message}` };
    }
    return { error: "登录服务异常，请稍后重试" };
  }
}

// 注册：发 OTP，验证后设置密码
export async function sendSignupOtp(email: string, nickname: string) {
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedNickname = nickname.trim();
  if (!trimmedEmail) return { error: "邮箱不能为空" };
  if (!trimmedNickname) return { error: "昵称不能为空" };

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: undefined,
        data: { nickname: trimmedNickname },
      },
    });

    if (error) {
      return { error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("sendSignupOtp 错误:", err);
    if (err instanceof Error) {
      return { error: `发送验证码异常: ${err.message}` };
    }
    return { error: "发送验证码服务异常，请稍后重试" };
  }
}

export async function verifySignupOtp(email: string, token: string, password: string) {
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedToken = token.trim();

  if (!trimmedEmail) return { error: "邮箱不能为空" };
  if (!trimmedToken) return { error: "验证码不能为空" };
  if (!password || password.length < 6) return { error: "密码长度至少为 6 个字符" };

  try {
    const supabase = await createClient();

    const { data, error } = await supabase.auth.verifyOtp({
      email: trimmedEmail,
      token: trimmedToken,
      type: "email",
    });

    if (error) {
      return { error: error.message };
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });
    if (updateError) {
      return { error: updateError.message };
    }

    revalidatePath("/", "layout");
    return { success: true, session: data?.session };
  } catch (err) {
    console.error("verifySignupOtp 错误:", err);
    if (err instanceof Error) {
      return { error: `验证验证码异常: ${err.message}` };
    }
    return { error: "验证验证码服务异常，请稍后重试" };
  }
}

// 重置密码：标准 Magic Link 流程（发送邮件 -> 跳转重置页 -> updateUser）
export async function resetPassword(email: string) {
  const trimmedEmail = email.trim().toLowerCase();
  if (!trimmedEmail) return { error: "邮箱不能为空" };

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: `${getAppUrl()}/auth/reset-password`,
    });

    if (error) {
      return { error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.error("resetPassword 错误:", err);
    if (err instanceof Error) {
      return { error: `发送重置邮件异常: ${err.message}` };
    }
    return { error: "发送重置邮件服务异常，请稍后重试" };
  }
}

export async function updatePassword(password: string) {
  if (!password || password.length < 6) {
    return { error: "密码长度至少为 6 个字符" };
  }

  try {
    const supabase = await createClient();

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();
    if (sessionError) {
      return { error: `无法获取会话: ${sessionError.message}` };
    }
    if (!session) {
      return { error: "重置链接已失效，请重新获取邮件" };
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      return { error: error.message };
    }
    return { success: true };
  } catch (err) {
    console.error("updatePassword 错误:", err);
    if (err instanceof Error) {
      return { error: `更新密码异常: ${err.message}` };
    }
    return { error: "更新密码服务异常，请稍后重试" };
  }
}

export async function signOut() {
  let supabase;
  try {
    supabase = await createClient();
  } catch (err) {
    console.error("创建 Supabase 客户端错误:", err);
    return { error: "服务异常，请稍后重试" };
  }

  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("signOut 错误:", err);
    if (err instanceof Error) {
      return { error: `登出异常: ${err.message}` };
    }
    return { error: "登出服务异常，请稍后重试" };
  }
}

export async function getUser() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return user;
  } catch (err) {
    if (
      err instanceof Error &&
      (err.message.includes("Dynamic server usage") ||
        ("digest" in err && err.digest === "DYNAMIC_SERVER_USAGE"))
    ) {
      return null;
    }

    console.error("getUser 错误:", err);
    return null;
  }
}
