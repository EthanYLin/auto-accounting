'use server';

import { createClient } from '@/lib/supabase/server';
import type { Account, MainCategory, SubCategory, BudgetType } from '@/types';

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
      .order('name');

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
      .order('transaction_type')
      .order('label');

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
      .order('main_category_id')
      .order('label');

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
      .order('name');

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

