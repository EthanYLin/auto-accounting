import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const code = searchParams.get('code')
  
  // 检查是否是 Supabase 返回的错误
  const error = searchParams.get('error')
  const error_description = searchParams.get('error_description')

  const redirectTo = request.nextUrl.clone()
  redirectTo.searchParams.delete('token_hash')
  redirectTo.searchParams.delete('type')
  redirectTo.searchParams.delete('code')
  redirectTo.searchParams.delete('error')
  redirectTo.searchParams.delete('error_code')
  redirectTo.searchParams.delete('error_description')
  redirectTo.searchParams.delete('next')

  // 如果 URL 中已经包含错误信息（如链接过期）
  if (error) {
    redirectTo.pathname = '/auth/confirm/error'
    if (error_description?.includes('expired')) {
      redirectTo.searchParams.set('error', '验证链接已过期，请重新注册或重置密码')
    } else {
      redirectTo.searchParams.set('error', error_description || '邮箱验证失败')
    }
    return NextResponse.redirect(redirectTo)
  }

  const supabase = await createClient()

  // 处理 PKCE 流程（使用 code 参数）
  if (code) {
    try {
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (exchangeError) {
        console.error('exchangeCodeForSession 错误:', exchangeError)
        redirectTo.pathname = '/auth/confirm/error'
        if (exchangeError.message?.includes('expired')) {
          redirectTo.searchParams.set('error', '验证链接已过期，请重新注册或重置密码')
        } else {
          redirectTo.searchParams.set('error', `验证失败: ${exchangeError.message}`)
        }
        return NextResponse.redirect(redirectTo)
      }

      if (data?.session) {
        // 成功，跳转到确认成功页面
        redirectTo.pathname = '/auth/confirm/success'
        return NextResponse.redirect(redirectTo)
      }
    } catch (err) {
      console.error('处理确认链接错误:', err)
      redirectTo.pathname = '/auth/confirm/error'
      redirectTo.searchParams.set('error', '处理验证链接时发生错误')
      return NextResponse.redirect(redirectTo)
    }
  }

  // 处理旧的 token_hash 流程
  if (token_hash && type) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    })

    if (!verifyError) {
      // 根据不同的 OTP 类型跳转到不同的页面
      if (type === 'signup' || type === 'email') {
        // 注册确认成功，跳转到确认成功页面
        redirectTo.pathname = '/auth/confirm/success'
      } else if (type === 'recovery') {
        // 密码重置，跳转到重置密码页面
        redirectTo.pathname = '/auth/reset-password'
      } else {
        // 其他类型，跳转到首页
        redirectTo.pathname = '/'
      }
      return NextResponse.redirect(redirectTo)
    }
    
    console.error('verifyOtp 错误:', verifyError)
  }

  // 返回错误页面
  redirectTo.pathname = '/auth/confirm/error'
  redirectTo.searchParams.set('error', '邮箱验证失败，请重试')
  return NextResponse.redirect(redirectTo)
}

