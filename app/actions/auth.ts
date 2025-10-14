'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function signIn(email: string, password: string) {
  let supabase
  try {
    supabase = await createClient()
  } catch (err) {
    console.error('创建 Supabase 客户端错误:', err)
    return { error: '服务异常，请稍后重试' }
  }

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return { error: error.message }
    }
  } catch (err) {
    console.error('signIn 错误:', err)
    if (err instanceof Error) {
      return { error: `登录异常: ${err.message}` }
    }
    return { error: '登录服务异常，请稍后重试' }
  }

  // redirect() 不应该被 try-catch 包裹
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signUp(email: string, password: string) {
  try {
    const supabase = await createClient()

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/confirm`,
      },
    })

    if (error) {
      return { error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('signUp 错误:', err)
    if (err instanceof Error) {
      return { error: `注册异常: ${err.message}` }
    }
    return { error: '注册服务异常，请稍后重试' }
  }
}

export async function signOut() {
  let supabase
  try {
    supabase = await createClient()
  } catch (err) {
    console.error('创建 Supabase 客户端错误:', err)
    return { error: '服务异常，请稍后重试' }
  }

  try {
    const { error } = await supabase.auth.signOut()

    if (error) {
      return { error: error.message }
    }
  } catch (err) {
    console.error('signOut 错误:', err)
    if (err instanceof Error) {
      return { error: `登出异常: ${err.message}` }
    }
    return { error: '登出服务异常，请稍后重试' }
  }

  // redirect() 不应该被 try-catch 包裹
  revalidatePath('/', 'layout')
  redirect('/auth/login')
}

export async function resetPassword(email: string) {
  try {
    const supabase = await createClient()

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/reset-password`,
    })

    if (error) {
      return { error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('resetPassword 错误:', err)
    if (err instanceof Error) {
      return { error: `重置密码异常: ${err.message}` }
    }
    return { error: '重置密码服务异常，请稍后重试' }
  }
}

export async function updatePassword(password: string) {
  try {
    const supabase = await createClient()

    const { error } = await supabase.auth.updateUser({
      password,
    })

    if (error) {
      return { error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('updatePassword 错误:', err)
    if (err instanceof Error) {
      return { error: `更新密码异常: ${err.message}` }
    }
    return { error: '更新密码服务异常，请稍后重试' }
  }
}

export async function changePassword(oldPassword: string, newPassword: string) {
  try {
    const supabase = await createClient()

    // 获取当前用户的邮箱
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user?.email) {
      return { error: '未找到用户信息' }
    }

    // 验证旧密码
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: oldPassword,
    })

    if (signInError) {
      return { error: '当前密码不正确' }
    }

    // 更新为新密码
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      return { error: error.message }
    }

    return { success: true }
  } catch (err) {
    console.error('changePassword 错误:', err)
    if (err instanceof Error) {
      return { error: `修改密码异常: ${err.message}` }
    }
    return { error: '修改密码服务异常，请稍后重试' }
  }
}

export async function getUser() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    return user
  } catch (err) {
    console.error('getUser 错误:', err)
    return null
  }
}

