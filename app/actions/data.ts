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
} from '@/models';

type ActionResult<T> = { success: boolean; data?: T; error?: string };

type SupabaseWithUser =
  | { supabase: Awaited<ReturnType<typeof createClient>>; user: { id: string } }
  | { error: string };

/**
 * 获取 Supabase 客户端及当前用户
 */
async function getSupabaseWithUser(): Promise<SupabaseWithUser> {
  const supabase = await createClient();

  if (!supabase) {
    return { error: 'Supabase 客户端创建失败' };
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    return { error: '获取用户信息失败' };
  }

  if (!user) {
    return { error: '未登录' };
  }

  return { supabase, user: { id: user.id } };
}

/**
 * 获取当前用户的所有账户
 */
export async function getAccounts(): Promise<{ success: boolean; data?: Account[]; error?: string }> {
  try {
    const supabase = await createClient();
    
    if (!supabase) {
      console.error('Supabase 客户端创建失败');
      return { success: false, error: 'Supabase 客户端创建失败' };
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError) {
      console.error('获取用户信息失败:', userError);
      return { success: false, error: '获取用户信息失败' };
    }

    if (!user) {
      return { success: false, error: '未登录' };
    }

    const { data, error } = await supabase
      .from('account')
      .select('*')
      .eq('user_id', user.id)
    .order('id', { ascending: true });

    if (error) {
      console.error('获取账户失败:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('获取账户异常:', error);
    if (error instanceof Error) {
      return { success: false, error: `获取账户异常: ${error.message}` };
    }
    return { success: false, error: '获取账户失败' };
  }
}

/**
 * 获取当前用户的所有主类别
 */
export async function getMainCategories(): Promise<{ success: boolean; data?: MainCategory[]; error?: string }> {
  try {
    const supabase = await createClient();
    
    if (!supabase) {
      console.error('Supabase 客户端创建失败');
      return { success: false, error: 'Supabase 客户端创建失败' };
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError) {
      console.error('获取用户信息失败:', userError);
      return { success: false, error: '获取用户信息失败' };
    }

    if (!user) {
      return { success: false, error: '未登录' };
    }

    const { data, error } = await supabase
      .from('main_category')
      .select('*')
      .eq('user_id', user.id)
    .order('id', { ascending: true });

    if (error) {
      console.error('获取主类别失败:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('获取主类别异常:', error);
    if (error instanceof Error) {
      return { success: false, error: `获取主类别异常: ${error.message}` };
    }
    return { success: false, error: '获取主类别失败' };
  }
}

/**
 * 获取当前用户的所有子类别
 */
export async function getSubCategories(): Promise<{ success: boolean; data?: SubCategory[]; error?: string }> {
  try {
    const supabase = await createClient();
    
    if (!supabase) {
      console.error('Supabase 客户端创建失败');
      return { success: false, error: 'Supabase 客户端创建失败' };
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError) {
      console.error('获取用户信息失败:', userError);
      return { success: false, error: '获取用户信息失败' };
    }

    if (!user) {
      return { success: false, error: '未登录' };
    }

    const { data, error } = await supabase
      .from('sub_category')
      .select('*')
      .eq('user_id', user.id)
    .order('id', { ascending: true });

    if (error) {
      console.error('获取子类别失败:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('获取子类别异常:', error);
    if (error instanceof Error) {
      return { success: false, error: `获取子类别异常: ${error.message}` };
    }
    return { success: false, error: '获取子类别失败' };
  }
}

/**
 * 获取当前用户的所有预算计划
 */
export async function getBudgetTypes(): Promise<{ success: boolean; data?: BudgetType[]; error?: string }> {
  try {
    const supabase = await createClient();
    
    if (!supabase) {
      console.error('Supabase 客户端创建失败');
      return { success: false, error: 'Supabase 客户端创建失败' };
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError) {
      console.error('获取用户信息失败:', userError);
      return { success: false, error: '获取用户信息失败' };
    }

    if (!user) {
      return { success: false, error: '未登录' };
    }

    const { data, error } = await supabase
      .from('budget_type')
      .select('*')
      .eq('user_id', user.id)
    .order('id', { ascending: true });

    if (error) {
      console.error('获取预算计划失败:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    console.error('获取预算计划异常:', error);
    if (error instanceof Error) {
      return { success: false, error: `获取预算计划异常: ${error.message}` };
    }
    return { success: false, error: '获取预算计划失败' };
  }
}

/**
 * 新增账户
 */
export async function createAccount(name: string): Promise<ActionResult<Account>> {
  try {
    const auth = await getSupabaseWithUser();
    if ('error' in auth) {
      return { success: false, error: auth.error };
    }

    const { supabase, user } = auth;
    const { data, error } = await supabase
      .from('account')
      .insert({ name, user_id: user.id } satisfies AccountInsert)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as Account };
  } catch (error) {
    console.error('新增账户异常:', error);
    return { success: false, error: error instanceof Error ? error.message : '新增账户失败' };
  }
}

/**
 * 更新账户
 */
export async function updateAccount(id: number, name: string): Promise<ActionResult<Account>> {
  try {
    const auth = await getSupabaseWithUser();
    if ('error' in auth) {
      return { success: false, error: auth.error };
    }

    const { supabase, user } = auth;
    const { data, error } = await supabase
      .from('account')
      .update({ name })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as Account };
  } catch (error) {
    console.error('更新账户异常:', error);
    return { success: false, error: error instanceof Error ? error.message : '更新账户失败' };
  }
}

/**
 * 删除账户
 */
export async function deleteAccount(id: number): Promise<ActionResult<null>> {
  try {
    const auth = await getSupabaseWithUser();
    if ('error' in auth) {
      return { success: false, error: auth.error };
    }

    const { supabase, user } = auth;
    const { error } = await supabase.from('account').delete().eq('id', id).eq('user_id', user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: null };
  } catch (error) {
    console.error('删除账户异常:', error);
    return { success: false, error: error instanceof Error ? error.message : '删除账户失败' };
  }
}

/**
 * 新增预算计划
 */
export async function createBudgetType(name: string, icon?: string): Promise<ActionResult<BudgetType>> {
  try {
    const auth = await getSupabaseWithUser();
    if ('error' in auth) {
      return { success: false, error: auth.error };
    }

    const { supabase, user } = auth;
    const { data, error } = await supabase
      .from('budget_type')
      .insert({ name, icon: icon ?? null, user_id: user.id } satisfies BudgetTypeInsert)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as BudgetType };
  } catch (error) {
    console.error('新增预算计划异常:', error);
    return { success: false, error: error instanceof Error ? error.message : '新增预算计划失败' };
  }
}

/**
 * 更新预算计划
 */
export async function updateBudgetType(id: number, name: string, icon?: string): Promise<ActionResult<BudgetType>> {
  try {
    const auth = await getSupabaseWithUser();
    if ('error' in auth) {
      return { success: false, error: auth.error };
    }

    const { supabase, user } = auth;
    const { data, error } = await supabase
      .from('budget_type')
      .update({ name, icon: icon ?? null } satisfies BudgetTypeUpdate)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as BudgetType };
  } catch (error) {
    console.error('更新预算计划异常:', error);
    return { success: false, error: error instanceof Error ? error.message : '更新预算计划失败' };
  }
}

/**
 * 删除预算计划
 */
export async function deleteBudgetType(id: number): Promise<ActionResult<null>> {
  try {
    const auth = await getSupabaseWithUser();
    if ('error' in auth) {
      return { success: false, error: auth.error };
    }

    const { supabase, user } = auth;
    const { error } = await supabase.from('budget_type').delete().eq('id', id).eq('user_id', user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: null };
  } catch (error) {
    console.error('删除预算计划异常:', error);
    return { success: false, error: error instanceof Error ? error.message : '删除预算计划失败' };
  }
}

/**
 * 新增主类别
 */
export async function createMainCategory(
  payload: Omit<MainCategoryInsert, 'user_id'>,
): Promise<ActionResult<MainCategory>> {
  try {
    const auth = await getSupabaseWithUser();
    if ('error' in auth) {
      return { success: false, error: auth.error };
    }

    const { supabase, user } = auth;
    const { data, error } = await supabase
      .from('main_category')
      .insert({ ...payload, user_id: user.id })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as MainCategory };
  } catch (error) {
    console.error('新增主类别异常:', error);
    return { success: false, error: error instanceof Error ? error.message : '新增主类别失败' };
  }
}

/**
 * 更新主类别
 */
export async function updateMainCategory(
  id: number,
  payload: Partial<Omit<MainCategoryUpdate, 'user_id'>>,
): Promise<ActionResult<MainCategory>> {
  try {
    const auth = await getSupabaseWithUser();
    if ('error' in auth) {
      return { success: false, error: auth.error };
    }

    const { supabase, user } = auth;
    const { data, error } = await supabase
      .from('main_category')
      .update(payload)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as MainCategory };
  } catch (error) {
    console.error('更新主类别异常:', error);
    return { success: false, error: error instanceof Error ? error.message : '更新主类别失败' };
  }
}

/**
 * 删除主类别
 */
export async function deleteMainCategory(id: number): Promise<ActionResult<null>> {
  try {
    const auth = await getSupabaseWithUser();
    if ('error' in auth) {
      return { success: false, error: auth.error };
    }

    const { supabase, user } = auth;
    const { error } = await supabase.from('main_category').delete().eq('id', id).eq('user_id', user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: null };
  } catch (error) {
    console.error('删除主类别异常:', error);
    return { success: false, error: error instanceof Error ? error.message : '删除主类别失败' };
  }
}

/**
 * 新增子类别
 */
export async function createSubCategory(
  payload: Omit<SubCategoryInsert, 'user_id'>,
): Promise<ActionResult<SubCategory>> {
  try {
    const auth = await getSupabaseWithUser();
    if ('error' in auth) {
      return { success: false, error: auth.error };
    }

    const { supabase, user } = auth;
    const { data, error } = await supabase
      .from('sub_category')
      .insert({ ...payload, user_id: user.id })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as SubCategory };
  } catch (error) {
    console.error('新增子类别异常:', error);
    return { success: false, error: error instanceof Error ? error.message : '新增子类别失败' };
  }
}

/**
 * 更新子类别
 */
export async function updateSubCategory(
  id: number,
  payload: Partial<Omit<SubCategoryUpdate, 'user_id'>>,
): Promise<ActionResult<SubCategory>> {
  try {
    const auth = await getSupabaseWithUser();
    if ('error' in auth) {
      return { success: false, error: auth.error };
    }

    const { supabase, user } = auth;
    const { data, error } = await supabase
      .from('sub_category')
      .update(payload)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data as SubCategory };
  } catch (error) {
    console.error('更新子类别异常:', error);
    return { success: false, error: error instanceof Error ? error.message : '更新子类别失败' };
  }
}

/**
 * 删除子类别
 */
export async function deleteSubCategory(id: number): Promise<ActionResult<null>> {
  try {
    const auth = await getSupabaseWithUser();
    if ('error' in auth) {
      return { success: false, error: auth.error };
    }

    const { supabase, user } = auth;
    const { error } = await supabase.from('sub_category').delete().eq('id', id).eq('user_id', user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: null };
  } catch (error) {
    console.error('删除子类别异常:', error);
    return { success: false, error: error instanceof Error ? error.message : '删除子类别失败' };
  }
}

