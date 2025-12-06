'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardHeader, CardBody, CardFooter } from '@heroui/card'
import { Input } from '@heroui/input'
import { Button } from '@heroui/button'
import { Link } from '@heroui/link'
import { Divider } from '@heroui/divider'
import { Alert } from '@heroui/alert'
import { updatePassword } from '@/app/actions/auth'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [linkError, setLinkError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (password.length < 6) {
      setError('密码长度至少为 6 个字符')
      return
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    if (!sessionReady) {
      setError('重置链接无效或已过期，请重新获取邮件')
      return
    }

    setLoading(true)

    try {
      const result = await updatePassword(password)
      if (result?.error) {
        setError(result.error)
      } else if (result?.success) {
        setSuccess(true)
        router.push('/auth/login?message=密码已重置，请使用新密码登录')
      }
    } catch (err) {
      console.error('重置密码错误:', err)
      if (err instanceof Error) {
        if (err.message.includes('fetch') || err.message.includes('network')) {
          setError('网络连接失败，请检查网络后重试')
        } else {
          setError(`重置密码失败: ${err.message}`)
        }
      } else {
        setError('重置密码失败，请重试')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const errorParam = searchParams.get('error')
    const errorDesc = searchParams.get('error_description')
    const tokenHash = searchParams.get('token_hash')
    const type = searchParams.get('type')

    if (errorParam) {
      const msg =
        errorDesc
          ? decodeURIComponent(errorDesc)
          : '重置链接无效或已过期，请重新获取邮件'
      setLinkError(msg)
      setError(msg)
      return
    }

    if (!tokenHash || type !== 'recovery') {
      const msg = '重置链接无效或已过期，请重新获取邮件'
      setLinkError(msg)
      setError(msg)
      return
    }

    const supabase = createClient()
    setLoading(true)
    supabase.auth
      .verifyOtp({
        token_hash: tokenHash,
        type: 'recovery',
      })
      .then(({ error: verifyError }) => {
        if (verifyError) {
          const msg = verifyError.message || '重置链接无效或已过期，请重新获取邮件'
          setLinkError(msg)
          setError(msg)
          setSessionReady(false)
        } else {
          setSessionReady(true)
          setLinkError(null)
          setError('')
        }
      })
      .catch((err) => {
        console.error('verifyOtp 错误:', err)
        const msg = '重置链接无效或已过期，请重新获取邮件'
        setLinkError(msg)
        setError(msg)
        setSessionReady(false)
      })
      .finally(() => setLoading(false))
  }, [searchParams])

  if (linkError) {
    return (
      <div className="w-full max-w-md">
        <Card className="w-full">
          <CardBody className="px-6 py-6 flex flex-col gap-4">
            <Alert color="danger" title="重置链接无效或已过期">
              {linkError}
            </Alert>
            <Button
              as={Link}
              href="/auth/forgot-password"
              color="primary"
              className="w-full"
            >
              重新获取重置邮件
            </Button>
          </CardBody>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="w-full max-w-md">
        <Card className="w-full">
          <CardHeader className="flex flex-col gap-1 items-start px-6 pt-6">
            <h1 className="text-2xl font-bold">密码更新成功</h1>
          </CardHeader>
          <Divider />
          <CardBody className="px-6 py-6">
            <div className="flex flex-col gap-4">
              <div className="text-sm text-success-700 dark:text-success-400 bg-success-100 dark:bg-success-900/30 px-4 py-3 rounded-lg">
                <p>您的密码已更新。</p>
              </div>
              <Button
                as={Link}
                href="/auth/login"
                color="primary"
                className="w-full"
              >
                继续
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md">
      <Card className="w-full">
        <CardHeader className="flex flex-col gap-1 items-start px-6 pt-6">
          <h1 className="text-2xl font-bold">重置密码</h1>
          <p className="text-sm text-default-500">请设置一个新密码</p>
        </CardHeader>
        <Divider />
        <CardBody className="px-6 py-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              type="password"
              label="新密码"
              variant="bordered"
              labelPlacement="outside-top"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              isRequired
              autoComplete="new-password"
              description="密码长度至少为 6 个字符"
            />
            <Input
              type="password"
              label="确认新密码"
              variant="bordered"
              labelPlacement="outside-top"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              isRequired
              autoComplete="new-password"
            />

            {error && (
              <div className="text-sm text-danger bg-danger-50 dark:bg-danger-900/20 px-3 py-2 rounded-lg">
                {error}
              </div>
            )}

            <Button
              type="submit"
              color="primary"
              isLoading={loading}
              className="w-full"
            >
              更新密码
            </Button>
          </form>
        </CardBody>
        <Divider />
        <CardFooter className="px-6 py-4">
          <p className="text-sm text-default-500">
            <Link href="/auth/login" size="sm">
              返回登录
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}


