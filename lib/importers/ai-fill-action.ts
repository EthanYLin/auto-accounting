"use server";

import OpenAI from "openai";

import { getAmountSymbol } from "../transaction/transaction-display";

// ─── Types ──────────────────────────────────────────────────────────────────────

// ─── Request ───────────────────────────────────────────────────────────────────

export type TxSymbol = ReturnType<typeof getAmountSymbol>;

export interface AiRequest {
  tx_index: number;
  tx_symbol: TxSymbol;
  tx_info: Record<string, unknown>;
}

export interface AiCategoryOption {
  option_id: number;
  transaction_type: string;
  main_category: string;
  sub_category: string;
}

export interface AiRequestGroup {
  requests: AiRequest[];
  options: Record<TxSymbol, AiCategoryOption[]>;
}

// ─── Response ───────────────────────────────────────────────────────────────────

export interface AiResponse {
  option_id: number | null;
  name: string | null;
  merchant: string | null;
}

export interface AiResponseGroup {
  responses: Record<number, AiResponse | null>;
}

const client = new OpenAI({
  apiKey: process.env.API_KEY,
  baseURL: process.env.BASE_URL,
});

/** 单次 API 调用超过此时长无响应则中止，进入下一次 retry */
const FETCH_TIMEOUT_MS = 10_000;

const SYSTEM_PROMPT = `根据用户提供的交易信息，运用常识推断交易的商户名称和交易名称；并在所有类别中找到最适合该交易的类别ID。
你的答案需要以JSON格式输出。请确保输出的JSON对象包含以下字段：
- option_id: number | null。交易所属类别的ID。如果无法判断，请保持null。
- name: string | null。交易的名称(商品或服务的名称，一般与商户名称相同)，如果无法判断请保持null。
- merchant: string | null。交易的商户名称(填写用户实际交易的商户名称，而不是平台名称，如美团、淘宝等)，如果无法判断请保持null。

EXAMPLE INPUT:
categories = [
  { "option_id": 8, "transaction_type": "支出", "main_category": "娱乐", "sub_category": "外出吃饭" },
  { "option_id": 9, "transaction_type": "支出", "main_category": "娱乐", "sub_category": "聚会/唱歌" }
]

transaction = {
  "商品": "惠食佳·朱雀",
  "备注": "/",
  "收/支": "支出",
  "金额(元)": "¥438.00",
  "交易对方": "美团",
  "交易时间": "2025-12-31 19:17:24",
  "交易类型": "商户消费",
  "当前状态": "支付成功",
  "支付方式": "零钱"
}

EXAMPLE JSON OUTPUT:
{
  "option_id": 8,
  "name": "惠食佳",
  "merchant": "惠食佳"
}`;

function isValidAiAnswerResult(obj: unknown): obj is AiResponse {
  if (typeof obj !== "object" || obj === null) return false;
  const r = obj as Record<string, unknown>;
  return (
    (r.option_id === null || typeof r.option_id === "number") &&
    (r.name === null || typeof r.name === "string") &&
    (r.merchant === null || typeof r.merchant === "string")
  );
}

async function fetchAnswer(
  txInput: Record<string, unknown>,
  options: AiCategoryOption[],
): Promise<AiResponse | null> {
  const userPrompt = `categories = ${JSON.stringify(options, null, 2)}\ntransaction = ${JSON.stringify(txInput, null, 2)}`;

  const MAX_RETRIES = 3;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await client.chat.completions.create(
        {
          model: process.env.MODEL as string,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
        },
        { signal: controller.signal },
      );

      const content = response.choices[0]?.message?.content;
      if (!content) continue;

      const parsed: unknown = JSON.parse(content);
      if (isValidAiAnswerResult(parsed)) return parsed;
    } catch (err) {
      console.error(`[fetchAnswer] 第 ${attempt}/${MAX_RETRIES} 次调用失败`, err);
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 500 * attempt));
        continue;
      }
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  return null;
}

/**
 * 按顺序对每条请求调用 AI；`responses` 的 key 为各请求的 `tx_index`。
 */
export async function askAi(group: AiRequestGroup): Promise<AiResponseGroup> {
  const results = await Promise.all(
    group.requests.map(async (req) => {
      const options = group.options[req.tx_symbol] ?? [];
      const answer = await fetchAnswer(req.tx_info, options);
      return { tx_index: req.tx_index, answer };
    }),
  );
  const responses: Record<number, AiResponse | null> = {};
  for (const { tx_index, answer } of results) {
    responses[tx_index] = answer;
  }
  return { responses };
}
