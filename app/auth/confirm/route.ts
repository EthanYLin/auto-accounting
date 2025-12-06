import { type EmailOtpType } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

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
  redirectTo.searchParams.delete('redirect')

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

  // 创建响应对象以便设置 cookies
  let response = NextResponse.next({
    request,
  })

  // 创建 Supabase 客户端，并确保 cookies 被设置到响应中
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 处理 PKCE 流程（使用 code 参数）
  if (code) {
    try {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
      
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

      // 检查是否是密码恢复流程
      // 从 URL 的 next 参数或 redirect 参数中获取目标路径
      const next = searchParams.get('next')
      const redirect = searchParams.get('redirect')
      
      // 如果有明确的重定向路径，使用它
      if (next && next.includes('reset-password')) {
        redirectTo.pathname = '/auth/reset-password'
      } else if (redirect && redirect.includes('reset-password')) {
        redirectTo.pathname = '/auth/reset-password'
      } else {
        // 默认情况下，跳转到确认成功页面
        redirectTo.pathname = '/auth/confirm/success'
      }
      
      // 创建新的重定向响应，并复制所有 cookies
      const redirectResponse = NextResponse.redirect(redirectTo)
      
      // 将 response 中的 cookies 复制到 redirectResponse
      response.cookies.getAll().forEach(cookie => {
        redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
      })
      
      return redirectResponse
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
      
      // 创建新的重定向响应，并复制所有 cookies
      const redirectResponse = NextResponse.redirect(redirectTo)
      
      // 将 response 中的 cookies 复制到 redirectResponse
      response.cookies.getAll().forEach(cookie => {
        redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
      })
      
      return redirectResponse
    }
    
    console.error('verifyOtp 错误:', verifyError)
  }

  // 返回错误页面
  redirectTo.pathname = '/auth/confirm/error'
  redirectTo.searchParams.set('error', '邮箱验证失败，请重试')
  return NextResponse.redirect(redirectTo)
}

