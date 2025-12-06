'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardHeader, CardBody, CardFooter } from '@heroui/card'
import { Input } from '@heroui/input'
import { Button } from '@heroui/button'
import { Link } from '@heroui/link'
import { Divider } from '@heroui/divider'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'request' | 'sent'>('request')
  const [info, setInfo] = useState('')
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    const presetEmail = searchParams.get('email')
    if (presetEmail) {
      setEmail(presetEmail)
    }
  }, [searchParams])

  const loginHref = email ? `/auth/login?email=${encodeURIComponent(email)}` : '/auth/login'

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setInfo('')
    setLoading(true)

    try {
      const supabase = createClient()
      const redirectTo =
        process.env.NEXT_PUBLIC_APP_URL
          ? `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`
          : `${window.location.origin}/auth/reset-password`

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      })

      if (resetError) {
        setError(resetError.message)
      } else {
        setStep('sent')
        setCooldown(60)
        setInfo('我们已向您的邮箱发送重置链接，请查看邮箱并点击重置链接。')
      }
    } catch (err) {
      console.error('重置密码错误:', err)
      if (err instanceof Error) {
        if (err.message.includes('fetch') || err.message.includes('network')) {
          setError('网络连接失败，请检查网络后重试')
        } else {
          setError(`发送重置邮件失败: ${err.message}`)
        }
      } else {
        setError('发送重置邮件失败，请重试')
      }
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-md">
        <Card className="w-full">
          <CardHeader className="flex flex-col gap-1 items-start px-6 pt-6">
            <h1 className="text-2xl font-bold">邮件已发送</h1>
          </CardHeader>
          <Divider />
          <CardBody className="px-6 py-6">
            <div className="flex flex-col gap-4">
            <div className="text-sm text-success-700 dark:text-success-400 bg-success-100 dark:bg-success-900/30 px-4 py-3 rounded-lg">
                <p>请在邮件中点击重置密码链接，在打开的页面设置新密码。</p>
                <p className="mt-2">如果未收到，请检查垃圾邮件，或稍后重新发送。</p>
              </div>
              <p className="text-sm text-default-500">
                如果没有自动跳转，请点击下方按钮。
              </p>
              <Button
                as={Link}
                href={loginHref}
                color="primary"
                className="w-full"
              >
                返回登录
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
          <h1 className="text-2xl font-bold">忘记密码</h1>
          <p className="text-sm text-default-500">
            输入邮箱，我们会发送重置密码链接到您的邮箱
          </p>
        </CardHeader>
        <Divider />
        <CardBody className="px-6 py-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              type="email"
              label="邮箱"
              variant="bordered"
              labelPlacement="outside-top"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              isRequired
              autoComplete="email"
              isDisabled={step === 'sent'}
            />

            {error && (
              <div className="text-sm text-danger bg-danger-50 dark:bg-danger-900/20 px-3 py-2 rounded-lg">
                {error}
              </div>
            )}
            {info && (
              <div className="text-sm text-success-700 dark:text-success-400 bg-success-100 dark:bg-success-900/30 px-3 py-2 rounded-lg">
                {info}
              </div>
            )}

            <Button
              type="submit"
              variant={step === 'request' ? 'solid' : 'flat'}
              color={step === 'request' ? 'primary' : 'default'}
              isLoading={loading}
              className="w-full"
              isDisabled={step === 'sent' && cooldown > 0}
            >
              {step === 'request'
                ? '发送重置邮件'
                : cooldown > 0
                  ? `重发邮件（${cooldown}s）`
                  : '重发邮件'}
            </Button>

          </form>
        </CardBody>
        <Divider />
        <CardFooter className="px-6 py-4">
          <p className="text-sm text-default-500">
            记起密码了？{' '}
            <Link href={loginHref} size="sm">
              返回登录
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}

