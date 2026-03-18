import type {
  Account,
  BudgetType,
  MainCategory,
  MainCategoryInsert,
  MatchingRule,
  MatchingRuleInsert,
  SubCategory,
  SubCategoryInsert,
  TransactionType,
} from "@/types";

import { z } from "zod";

import { TRANSACTION_TYPES } from "@/constants/transaction-type";

const transactionTypeValues = TRANSACTION_TYPES.map((item) => item.type) as [
  TransactionType,
  ...TransactionType[],
];

const optionalNumericTextSchema = z
  .string()
  .trim()
  .refine((value) => value === "" || !Number.isNaN(Number(value)), {
    message: "请输入有效数字",
  });

const optionalIdSchema = z
  .string()
  .trim()
  .refine((value) => value === "" || /^\d+$/.test(value), {
    message: "请选择有效选项",
  });

const optionalTransactionTypeSchema = z.union([
  z.enum(transactionTypeValues),
  z.literal(""),
]);

export const accountFormSchema = z.object({
  name: z.string().trim().min(1, "请输入账户名称").max(100, "账户名称过长"),
});

export type AccountFormValues = z.infer<typeof accountFormSchema>;

export const defaultAccountFormValues: AccountFormValues = {
  name: "",
};

export function getAccountFormValues(account?: Account): AccountFormValues {
  return account ? { name: account.name } : defaultAccountFormValues;
}

export function toAccountPayload(values: AccountFormValues) {
  return values.name.trim();
}

export const budgetFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "请输入预算计划名称")
    .max(100, "预算计划名称过长"),
  icon: z.string().trim().max(16, "图标过长"),
});

export type BudgetFormValues = z.infer<typeof budgetFormSchema>;

export const defaultBudgetFormValues: BudgetFormValues = {
  name: "",
  icon: "",
};

export function getBudgetFormValues(budget?: BudgetType): BudgetFormValues {
  return budget
    ? {
        name: budget.name,
        icon: budget.icon ?? "",
      }
    : defaultBudgetFormValues;
}

export function toBudgetPayload(values: BudgetFormValues) {
  return {
    name: values.name.trim(),
    icon: values.icon.trim() || undefined,
  };
}

export const mainCategoryFormSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "请输入主类别名称")
    .max(100, "主类别名称过长"),
  transaction_type: z.enum(transactionTypeValues),
  icon: z.string().trim().max(16, "图标过长"),
  back_color: z.string().trim().max(100, "背景色配置过长"),
  fore_color: z.string().trim().max(100, "前景色配置过长"),
});

export type MainCategoryFormValues = z.infer<typeof mainCategoryFormSchema>;

export const defaultMainCategoryFormValues: MainCategoryFormValues = {
  label: "",
  transaction_type: TRANSACTION_TYPES[0].type,
  icon: "",
  back_color: "",
  fore_color: "",
};

export function getMainCategoryFormValues(
  item?: MainCategory,
): MainCategoryFormValues {
  return item
    ? {
        label: item.label,
        transaction_type: item.transaction_type,
        icon: item.icon,
        back_color: item.back_color,
        fore_color: item.fore_color,
      }
    : defaultMainCategoryFormValues;
}

export function toMainCategoryPayload(
  values: MainCategoryFormValues,
): Omit<MainCategoryInsert, "user_id"> {
  return {
    label: values.label.trim(),
    transaction_type: values.transaction_type,
    icon: values.icon.trim() || "📂",
    back_color: values.back_color.trim() || "#EEF2FF",
    fore_color: values.fore_color.trim() || "#111827",
  };
}

export const subCategoryFormSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "请输入子类别名称")
    .max(100, "子类别名称过长"),
  main_category_id: z.string().trim().min(1, "请选择主类别"),
  budget_type_id: optionalIdSchema,
  icon: z.string().trim().max(16, "图标过长"),
  back_color: z.string().trim().max(100, "背景色配置过长"),
  fore_color: z.string().trim().max(100, "前景色配置过长"),
});

export type SubCategoryFormValues = z.infer<typeof subCategoryFormSchema>;

export const defaultSubCategoryFormValues: SubCategoryFormValues = {
  label: "",
  main_category_id: "",
  budget_type_id: "",
  icon: "",
  back_color: "",
  fore_color: "",
};

export function getSubCategoryFormValues(
  item?: SubCategory,
  defaultMainCategoryId?: number | null,
): SubCategoryFormValues {
  if (item) {
    return {
      label: item.label,
      main_category_id: String(item.main_category_id),
      budget_type_id: item.budget_type_id ? String(item.budget_type_id) : "",
      icon: item.icon,
      back_color: item.back_color,
      fore_color: item.fore_color,
    };
  }

  return {
    ...defaultSubCategoryFormValues,
    main_category_id: defaultMainCategoryId
      ? String(defaultMainCategoryId)
      : "",
  };
}

export function toSubCategoryPayload(
  values: SubCategoryFormValues,
): Omit<SubCategoryInsert, "user_id"> {
  return {
    label: values.label.trim(),
    main_category_id: Number(values.main_category_id),
    budget_type_id: values.budget_type_id
      ? Number(values.budget_type_id)
      : null,
    icon: values.icon.trim() || "📌",
    back_color: values.back_color.trim() || "bg-gray-100 dark:bg-gray-800",
    fore_color: values.fore_color.trim() || "text-gray-800 dark:text-gray-200",
  };
}

export const matchingRuleFormSchema = z
  .object({
    f_title: z.string().trim().min(1, "请输入导入描述的正则表达式"),
    f_original_amount_ge: optionalNumericTextSchema,
    f_original_amount_le: optionalNumericTextSchema,
    f_time: z.string().trim().max(120, "时间规则过长"),
    t_tx_type: optionalTransactionTypeSchema,
    t_main_category_id: optionalIdSchema,
    t_sub_category_id: optionalIdSchema,
    t_budget_type_id: optionalIdSchema,
    t_name: z.string().trim().max(120, "名称过长"),
    t_merchant: z.string().trim().max(120, "商家过长"),
  })
  .superRefine((values, ctx) => {
    const min =
      values.f_original_amount_ge === ""
        ? null
        : Number(values.f_original_amount_ge);
    const max =
      values.f_original_amount_le === ""
        ? null
        : Number(values.f_original_amount_le);

    if (min !== null && max !== null && min > max) {
      ctx.addIssue({
        code: "custom",
        message: "最大金额不能小于最小金额",
        path: ["f_original_amount_le"],
      });
    }

    if (values.t_sub_category_id && !values.t_main_category_id) {
      ctx.addIssue({
        code: "custom",
        message: "选择子类别前请先选择主类别",
        path: ["t_sub_category_id"],
      });
    }
  });

export type MatchingRuleFormValues = z.infer<typeof matchingRuleFormSchema>;

export const defaultMatchingRuleFormValues: MatchingRuleFormValues = {
  f_title: "",
  f_original_amount_ge: "",
  f_original_amount_le: "",
  f_time: "",
  t_tx_type: "",
  t_main_category_id: "",
  t_sub_category_id: "",
  t_budget_type_id: "",
  t_name: "",
  t_merchant: "",
};

export function getMatchingRuleFormValues(
  rule?: MatchingRule,
): MatchingRuleFormValues {
  return rule
    ? {
        f_title: rule.f_title,
        f_original_amount_ge: rule.f_original_amount_ge?.toString() ?? "",
        f_original_amount_le: rule.f_original_amount_le?.toString() ?? "",
        f_time: rule.f_time ?? "",
        t_tx_type: rule.t_tx_type ?? "",
        t_main_category_id: rule.t_main_category_id
          ? String(rule.t_main_category_id)
          : "",
        t_sub_category_id: rule.t_sub_category_id
          ? String(rule.t_sub_category_id)
          : "",
        t_budget_type_id: rule.t_budget_type_id
          ? String(rule.t_budget_type_id)
          : "",
        t_name: rule.t_name ?? "",
        t_merchant: rule.t_merchant ?? "",
      }
    : defaultMatchingRuleFormValues;
}

export function toMatchingRulePayload(
  values: MatchingRuleFormValues,
): Omit<MatchingRuleInsert, "user_id"> {
  return {
    f_title: values.f_title.trim(),
    f_original_amount_ge:
      values.f_original_amount_ge === ""
        ? null
        : Number(values.f_original_amount_ge),
    f_original_amount_le:
      values.f_original_amount_le === ""
        ? null
        : Number(values.f_original_amount_le),
    f_time: values.f_time.trim() || null,
    t_tx_type: values.t_tx_type || null,
    t_main_category_id: values.t_main_category_id
      ? Number(values.t_main_category_id)
      : null,
    t_sub_category_id: values.t_sub_category_id
      ? Number(values.t_sub_category_id)
      : null,
    t_budget_type_id: values.t_budget_type_id
      ? Number(values.t_budget_type_id)
      : null,
    t_name: values.t_name.trim() || null,
    t_merchant: values.t_merchant.trim() || null,
  };
}
