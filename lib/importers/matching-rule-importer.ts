import type { AppDataValue, MatchingRule, NewTransactionData } from "@/types";
import type { Importer } from "./types";

import { getAmountSymbol } from "../transaction/transaction-display";

import { appendRemark } from "./shared";

export class MatchingRuleImporter implements Importer {
  description(): string {
    return "按规则填写部分字段";
  }

  /**
   * 按规则 id 升序对每条交易（及子交易）尝试匹配，命中则写入分类、预算类型、名称等目标字段。
   */
  async handle(
    transactions: NewTransactionData[],
    appData: AppDataValue,
    onProgress?: (message: string) => void,
  ): Promise<NewTransactionData[]> {
    onProgress?.("正在应用匹配规则…");
    const rules = [...(appData.matchingRules ?? [])].sort((a, b) => a.id - b.id);
    return transactions.map((tx) => {
      let next = this.applyMatchingRulesToOne(tx, rules, appData);
      if (next.children?.length) {
        next = {
          ...next,
          children: next.children.map((c) => this.applyMatchingRulesToOne(c, rules, appData)),
        };
      }
      return next;
    });
  }

  /**
   * 对单条交易依次尝试规则：已有名称或主分类则跳过；否则找到第一条同时满足条件且能解析目标 id 的规则并应用。
   */
  private applyMatchingRulesToOne(
    tx: NewTransactionData,
    rules: MatchingRule[],
    appData: AppDataValue,
  ): NewTransactionData {
    if (String(tx.name ?? "").trim() !== "" || tx.main_category) return tx;
    for (const rule of rules) {
      if (!this.satisfy(rule, tx)) continue;
      const applied = this.apply(tx, rule, appData);
      if (applied) return applied;
    }
    return tx;
  }

  /** 判断金额是否落在规则配置的 [f_original_amount_ge, f_original_amount_le] 区间内（未配置边界则视为不限制）。 */
  private amountRangeMatches(rule: MatchingRule, amount: number): boolean {
    const ge = rule.f_original_amount_ge;
    const le = rule.f_original_amount_le;
    const hasGe = ge != null;
    const hasLe = le != null;
    if (!hasGe && !hasLe) return true;
    if (hasGe && amount < ge) return false;
    if (hasLe && amount > le) return false;
    return true;
  }

  /** 将 pattern 作为正则测试 value；pattern 非法时返回 false，不抛错。 */
  private regexTest(pattern: string, value: string): boolean {
    try {
      return new RegExp(pattern).test(value);
    } catch {
      return false;
    }
  }

  /**
   * 检查规则前置条件：金额区间、时间/标题正则（若配置）、以及交易类型 t_tx_type（若配置）。
   * 金额取 original_amount，缺省时用 amount。
   */
  private satisfy(rule: MatchingRule, tx: NewTransactionData): boolean {
    if (!tx.transaction_type) return false;
    if (
      rule.t_tx_type != null &&
      getAmountSymbol(tx.transaction_type) !== getAmountSymbol(rule.t_tx_type)
    )
      return false;

    const amt = tx.original_amount ?? tx.amount;
    if (!this.amountRangeMatches(rule, amt)) return false;

    const timeStr = tx.datetime ?? "";
    if (rule.f_time != null && rule.f_time.trim() !== "") {
      if (!this.regexTest(rule.f_time.trim(), timeStr)) return false;
    }

    if (rule.f_title != null && rule.f_title.trim() !== "") {
      const titleStr = tx.title ?? "";
      if (!this.regexTest(rule.f_title.trim(), titleStr)) return false;
    }

    return true;
  }

  /**
   * 将规则中的目标主类、子类、预算类型、名称、商户写入交易副本；任一 id 在 appData 中无法解析或与主类不一致则返回 null，由调用方尝试下一条规则。
   */
  private apply(
    tx: NewTransactionData,
    rule: MatchingRule,
    appData: AppDataValue,
  ): NewTransactionData | null {
    const next: NewTransactionData = { ...tx };
    let changed = false;

    if (rule.t_tx_type != null) {
      next.transaction_type = rule.t_tx_type;
      changed = true;
    }

    if (rule.t_main_category_id != null) {
      const mc = appData.mainCategories.find((m) => m.id === rule.t_main_category_id);
      if (!mc) return null;
      next.main_category = mc;
      changed = true;
    }

    if (rule.t_sub_category_id != null) {
      const sc = appData.subCategories.find((s) => s.id === rule.t_sub_category_id);
      if (!sc) return null;
      if (rule.t_main_category_id != null && sc.main_category_id !== rule.t_main_category_id)
        return null;
      next.sub_category = sc;
      if (rule.t_main_category_id == null) {
        const mc = appData.mainCategories.find((m) => m.id === sc.main_category_id);
        if (!mc) return null;
        next.main_category = mc;
      }
      changed = true;
    }

    if (rule.t_budget_type_id != null) {
      const bt = appData.budgetTypes.find((b) => b.id === rule.t_budget_type_id);
      if (!bt) return null;
      next.budget_type = bt;
      changed = true;
    }

    if (rule.t_name != null && rule.t_name.trim() !== "") {
      next.name = rule.t_name.trim();
      changed = true;
    }
    if (rule.t_merchant != null && rule.t_merchant.trim() !== "") {
      next.merchant = rule.t_merchant.trim();
      changed = true;
    }

    if (changed) {
      next.remark = appendRemark(tx.remark, "[R]");
      if (next.status === "待处理") next.status = "经自动处理填写";
    }

    return next;
  }
}
