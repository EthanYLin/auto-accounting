'use server';

import { createClient } from '@/lib/supabase/server';
import type {
  Account,
  AccountInsert,
  BudgetType,
  BudgetTypeInsert,
  BudgetTypeUpdate,
  MainCategory,
  MainCategoryInsert,
  MainCategoryUpdate,
  SubCategory,
  SubCategoryInsert,
  SubCategoryUpdate,
  Transaction,
  TransactionInsert,
  TransactionUpdate,
  TransactionSplit,
  TransactionSplitInsert,
  MatchingRule,
  MatchingRuleInsert,
  MatchingRuleUpdate,
} from '@/types';

type ActionResult<T> = { success: boolean; data?: T; error?: string };

type SupabaseWithUser = {
  success: boolean;
  supabase?: Awaited<ReturnType<typeof createClient>>;
  user?: { id: string };
  error?: string;
};

/**
 * 获取 Supabase 客户端及当前用户
 */
async function getSupabaseWithUser(): Promise<SupabaseWithUser> {
  // 创建 Supabase 客户端
  const supabase = await createClient();
  if (!supabase) return { success: false, error: 'Supabase 客户端创建失败' };

  // 获取当前用户
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) return { success: false, error: '获取用户信息失败' };
  if (!user) return { success: false, error: '未登录' };
  return { success: true, supabase, user: { id: user.id } };
}

const ok = <T>(data: T): ActionResult<T> => ({ success: true, data });
const fail = (error: string): ActionResult<never> => ({ success: false, error });

async function withSupabaseUser<T>(
  operation: string,
  fn: (ctx: { supabase: Awaited<ReturnType<typeof createClient>>; userId: string }) => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  try {
    const auth = await getSupabaseWithUser();
    if (!auth.success || !auth.supabase || !auth.user) {
      return { success: false, error: auth.error ?? '认证失败' };
    }

    return await fn({ supabase: auth.supabase, userId: auth.user.id });
  } catch (error) {
    console.error(`${operation}异常:`, error);
    return { success: false, error: error instanceof Error ? error.message : `${operation}失败` };
  }
}

// ========================================================
// 账户相关
// ========================================================
/**
 * 获取当前用户的所有账户
 */
export async function getAccounts(): Promise<ActionResult<Account[]>> {
  return withSupabaseUser('获取账户', async ({ supabase, userId }) => {
    const { data, error } = await supabase
      .from('account')
      .select('*')
      .eq('user_id', userId)
      .order('id', { ascending: true });

    if (error) {
      console.error('获取账户失败:', error);
      return fail(error.message);
    }

    return ok(data || []);
  });
}

/**
 * 新增账户
 */
export async function createAccount(name: string): Promise<ActionResult<Account>> {
  return withSupabaseUser('新增账户', async ({ supabase, userId }) => {
    const { data, error } = await supabase
      .from('account')
      .insert({ name, user_id: userId } satisfies AccountInsert)
      .select()
      .single();

    if (error) {
      return fail(error.message);
    }

    return ok(data as Account);
  });
}

/**
 * 更新账户
 */
export async function updateAccount(id: number, name: string): Promise<ActionResult<Account>> {
  return withSupabaseUser('更新账户', async ({ supabase, userId }) => {
    const { data, error } = await supabase
      .from('account')
      .update({ name })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return fail(error.message);
    }

    return ok(data as Account);
  });
}

/**
 * 删除账户
 */
export async function deleteAccount(id: number): Promise<ActionResult<null>> {
  return withSupabaseUser('删除账户', async ({ supabase, userId }) => {
    const { error } = await supabase.from('account').delete().eq('id', id).eq('user_id', userId);

    if (error) {
      return fail(error.message);
    }

    return ok(null);
  });
}

// ========================================================
// 类别及预算计划相关
// ========================================================
/**
 * 获取当前用户的所有主类别
 */
export async function getMainCategories(): Promise<ActionResult<MainCategory[]>> {
  return withSupabaseUser('获取主类别', async ({ supabase, userId }) => {
    const { data, error } = await supabase
      .from('main_category')
      .select('*')
      .eq('user_id', userId)
      .order('id', { ascending: true });

    if (error) {
      console.error('获取主类别失败:', error);
      return fail(error.message);
    }

    return ok(data || []);
  });
}

/**
 * 新增主类别
 */
export async function createMainCategory(
  payload: Omit<MainCategoryInsert, 'user_id'>,
): Promise<ActionResult<MainCategory>> {
  return withSupabaseUser('新增主类别', async ({ supabase, userId }) => {
    const { data, error } = await supabase
      .from('main_category')
      .insert({ ...payload, user_id: userId })
      .select()
      .single();

    if (error) {
      return fail(error.message);
    }

    return ok(data as MainCategory);
  });
}

/**
 * 更新主类别
 */
export async function updateMainCategory(
  id: number,
  payload: Partial<Omit<MainCategoryUpdate, 'user_id'>>,
): Promise<ActionResult<MainCategory>> {
  return withSupabaseUser('更新主类别', async ({ supabase, userId }) => {
    const { data, error } = await supabase
      .from('main_category')
      .update(payload)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return fail(error.message);
    }

    return ok(data as MainCategory);
  });
}

/**
 * 删除主类别
 */
export async function deleteMainCategory(id: number): Promise<ActionResult<null>> {
  return withSupabaseUser('删除主类别', async ({ supabase, userId }) => {
    const { error } = await supabase.from('main_category').delete().eq('id', id).eq('user_id', userId);

    if (error) {
      return fail(error.message);
    }

    return ok(null);
  });
}

// ========================================================
// 子类别相关
// ========================================================
/**
 * 获取当前用户的所有子类别
 */
export async function getSubCategories(): Promise<ActionResult<SubCategory[]>> {
  return withSupabaseUser('获取子类别', async ({ supabase, userId }) => {
    const { data, error } = await supabase
      .from('sub_category')
      .select('*')
      .eq('user_id', userId)
      .order('id', { ascending: true });

    if (error) {
      console.error('获取子类别失败:', error);
      return fail(error.message);
    }

    return ok(data || []);
  });
}

/**
 * 新增子类别
 */
export async function createSubCategory(
  payload: Omit<SubCategoryInsert, 'user_id'>,
): Promise<ActionResult<SubCategory>> {
  return withSupabaseUser('新增子类别', async ({ supabase, userId }) => {
    const { data, error } = await supabase
      .from('sub_category')
      .insert({ ...payload, user_id: userId })
      .select()
      .single();

    if (error) {
      return fail(error.message);
    }

    return ok(data as SubCategory);
  });
}

/**
 * 更新子类别
 */
export async function updateSubCategory(
  id: number,
  payload: Partial<Omit<SubCategoryUpdate, 'user_id'>>,
): Promise<ActionResult<SubCategory>> {
  return withSupabaseUser('更新子类别', async ({ supabase, userId }) => {
    const { data, error } = await supabase
      .from('sub_category')
      .update(payload)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return fail(error.message);
    }

    return ok(data as SubCategory);
  });
}

/**
 * 删除子类别
 */
export async function deleteSubCategory(id: number): Promise<ActionResult<null>> {
  return withSupabaseUser('删除子类别', async ({ supabase, userId }) => {
    const { error } = await supabase.from('sub_category').delete().eq('id', id).eq('user_id', userId);

    if (error) {
      return fail(error.message);
    }

    return ok(null);
  });
}

// ========================================================
// 预算计划相关
// ========================================================
/**
 * 获取当前用户的所有预算计划
 */
export async function getBudgetTypes(): Promise<ActionResult<BudgetType[]>> {
  return withSupabaseUser('获取预算计划', async ({ supabase, userId }) => {
    const { data, error } = await supabase
      .from('budget_type')
      .select('*')
      .eq('user_id', userId)
      .order('id', { ascending: true });

    if (error) {
      console.error('获取预算计划失败:', error);
      return fail(error.message);
    }

    return ok(data || []);
  });
}


/**
 * 新增预算计划
 */
export async function createBudgetType(name: string, icon?: string): Promise<ActionResult<BudgetType>> {
  return withSupabaseUser('新增预算计划', async ({ supabase, userId }) => {
    const { data, error } = await supabase
      .from('budget_type')
      .insert({ name, icon: icon ?? null, user_id: userId } satisfies BudgetTypeInsert)
      .select()
      .single();

    if (error) {
      return fail(error.message);
    }

    return ok(data as BudgetType);
  });
}

/**
 * 更新预算计划
 */
export async function updateBudgetType(id: number, name: string, icon?: string): Promise<ActionResult<BudgetType>> {
  return withSupabaseUser('更新预算计划', async ({ supabase, userId }) => {
    const { data, error } = await supabase
      .from('budget_type')
      .update({ name, icon: icon ?? null } satisfies BudgetTypeUpdate)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return fail(error.message);
    }

    return ok(data as BudgetType);
  });
}

/**
 * 删除预算计划
 */
export async function deleteBudgetType(id: number): Promise<ActionResult<null>> {
  return withSupabaseUser('删除预算计划', async ({ supabase, userId }) => {
    const { error } = await supabase.from('budget_type').delete().eq('id', id).eq('user_id', userId);

    if (error) {
      return fail(error.message);
    }

    return ok(null);
  });
}


// ========================================================
// 交易记录相关
// ========================================================

/**
 * 获取当前用户的所有交易记录
 */
export async function getAllTransactions(): Promise<ActionResult<Transaction[]>> {
  return withSupabaseUser('获取所有交易记录', async ({ supabase, userId }) => {
    const { data, error } = await supabase
      .from('transaction')
      .select('*')
      .eq('user_id', userId)
      .order('datetime', { ascending: false });

    if (error) {
      return fail(error.message);
    }

    return ok(data as Transaction[]);
  });
}


/**
 * 插入交易记录
 */
export async function insertTransaction(payload: Omit<TransactionInsert, 'user_id'>): Promise<ActionResult<Transaction>> {
  return withSupabaseUser('插入交易记录', async ({ supabase, userId }) => {
    const { data, error } = await supabase
      .from('transaction')
      .insert({ ...payload, user_id: userId })
      .select()
      .single();

    if (error) {
      return fail(error.message);
    }

    return ok(data as Transaction);
  });
}

/**
 * 批量插入交易记录
 */
export async function bulkInsertTransactions(
  transactions: Array<Omit<TransactionInsert, 'user_id'>>
): Promise<ActionResult<Transaction[]>> {
    return withSupabaseUser('批量插入交易记录', async ({ supabase, userId }) => {
    // 为所有交易添加 user_id
    const transactionsWithUserId = transactions.map(tx => ({ ...tx, user_id: userId }));

    const { data, error } = await supabase
      .from('transaction')
      .insert(transactionsWithUserId)
      .select();

    if (error) {
      return fail(error.message);
    }

    return ok(data as Transaction[]);
  });
}

/**
 * 更新交易记录
 */
export async function updateTransaction(
  id: number,
  payload: Partial<Omit<TransactionUpdate, 'user_id'>>
): Promise<ActionResult<Transaction>> {
  return withSupabaseUser('更新交易记录', async ({ supabase, userId }) => {
    const { data, error } = await supabase
      .from('transaction')
      .update(payload)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return fail(error.message);
    }

    return ok(data as Transaction);
  });
}

/**
 * 批量删除交易记录
 */
export async function bulkDeleteTransactions(ids: number[]): Promise<ActionResult<null>> {
  return withSupabaseUser('批量删除交易记录', async ({ supabase, userId }) => {
    const { error } = await supabase.from('transaction').delete().in('id', ids).eq('user_id', userId);

    if (error) {
      return fail(error.message);
    }

    return ok(null);
  });
}

/**
 * 删除当前用户的所有交易记录
 */
export async function deleteAllTransactions(): Promise<ActionResult<null>> {
  return withSupabaseUser('删除所有交易记录', async ({ supabase, userId }) => {
    const { error } = await supabase
      .from('transaction')
      .delete()
      .eq('user_id', userId);

    if (error) {
      return fail(error.message);
    }

    return ok(null);
  });
}

// ========================================================
// 拆账记录相关
// ========================================================

/**
 * 获取当前用户的所有拆账记录
 */
export async function getAllTransactionSplits(): Promise<ActionResult<TransactionSplit[]>> {
  return withSupabaseUser('获取拆账记录', async ({ supabase, userId }) => {
    const { data, error } = await supabase
      .from('transaction_split')
      .select('*')
      .eq('user_id', userId)
      .order('id', { ascending: true });

    if (error) {
      return fail(error.message);
    }

    return ok(data as TransactionSplit[]);
  });
}

/**
 * 批量插入交易拆账记录
 */
export async function bulkInsertTransactionSplits(
  splits: Array<Omit<TransactionSplitInsert, 'user_id'>>
): Promise<ActionResult<TransactionSplit[]>> {
  return withSupabaseUser('批量插入拆账记录', async ({ supabase, userId }) => {
    if (splits.length === 0) {
      return ok([]);
    }

    // 为所有拆账记录添加 user_id，并排除 id 字段（让数据库自动生成）
    const splitsWithUserId = splits.map(split => {
      const { id, ...splitWithoutId } = split;
      return { ...splitWithoutId, user_id: userId };
    });

    const { data, error } = await supabase
      .from('transaction_split')
      .insert(splitsWithUserId)
      .select();

    if (error) {
      return fail(error.message);
    }

    return ok(data as TransactionSplit[]);
  });
}

/**
 * 删除指定交易的所有拆账记录
 */
export async function deleteTransactionSplits(transactionId: number): Promise<ActionResult<null>> {
  return withSupabaseUser('删除指定交易的所有拆账记录', async ({ supabase, userId }) => {
    const { error } = await supabase.from('transaction_split').delete().eq('transaction_id', transactionId).eq('user_id', userId);
    
    if (error) {
      return fail(error.message);
    }

    return ok(null);
  });
}

/**
 * 删除当前用户的所有拆账记录
 */
export async function deleteAllTransactionSplits(): Promise<ActionResult<null>> {
  return withSupabaseUser('删除当前用户的所有拆账记录', async ({ supabase, userId }) => {
    const { error } = await supabase.from('transaction_split').delete().eq('user_id', userId);

    if (error) {
      return fail(error.message);
    }

    return ok(null);
  });
}

// ========================================================
// 匹配规则相关
// ========================================================

/**
 * 获取当前用户的所有匹配规则
 */
export async function getMatchingRules(): Promise<ActionResult<MatchingRule[]>> {
  return withSupabaseUser('获取匹配规则', async ({ supabase, userId }) => {
    const { data, error } = await supabase
      .from('matching_rule')
      .select('*')
      .eq('user_id', userId)
      .order('id', { ascending: true });

    if (error) {
      console.error('获取匹配规则失败:', error);
      return fail(error.message);
    }

    return ok(data || []);
  });
}

/**
 * 新增匹配规则
 */
export async function createMatchingRule(
  payload: Omit<MatchingRuleInsert, 'user_id'>
): Promise<ActionResult<MatchingRule>> {
  return withSupabaseUser('新增匹配规则', async ({ supabase, userId }) => {
    const { data, error } = await supabase
      .from('matching_rule')
      .insert({ ...payload, user_id: userId })
      .select()
      .single();

    if (error) {
      return fail(error.message);
    }

    return ok(data as MatchingRule);
  });
}

/**
 * 更新匹配规则
 */
export async function updateMatchingRule(
  id: number,
  payload: Partial<Omit<MatchingRuleUpdate, 'user_id'>>
): Promise<ActionResult<MatchingRule>> {
  return withSupabaseUser('更新匹配规则', async ({ supabase, userId }) => {
    const { data, error } = await supabase
      .from('matching_rule')
      .update(payload)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return fail(error.message);
    }

    return ok(data as MatchingRule);
  });
}

/**
 * 删除匹配规则
 */
export async function deleteMatchingRule(id: number): Promise<ActionResult<null>> {
  return withSupabaseUser('删除匹配规则', async ({ supabase, userId }) => {
    const { error } = await supabase.from('matching_rule').delete().eq('id', id).eq('user_id', userId);

    if (error) {
      return fail(error.message);
    }

    return ok(null);
  });
}
