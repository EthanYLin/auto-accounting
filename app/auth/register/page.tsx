'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardBody, CardFooter } from '@heroui/card'
import { Input } from '@heroui/input'
import { Button } from '@heroui/button'
import { Link } from '@heroui/link'
import { Divider } from '@heroui/divider'
import { InputOtp } from '@heroui/input-otp'
import { sendSignupOtp, verifySignupOtp } from '@/app/actions/auth'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [nickname, setNickname] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [otp, setOtp] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [step, setStep] = useState<'request' | 'verify'>('request')
  const [info, setInfo] = useState('')
  const [cooldown, setCooldown] = useState(0)

  const resendOtp = async () => {
    setError('')
    setInfo('')
    setLoading(true)
    try {
      const result = await sendSignupOtp(email, nickname)
      if (result?.error) {
        setError(result.error)
      } else if (result?.success) {
        setInfo('验证码已重新发送，请查收邮箱')
        setOtp('')
        setStep('verify')
        setCooldown(60)
      }
    } catch (err) {
      console.error('重发验证码错误:', err)
      if (err instanceof Error) {
        setError(`重发失败: ${err.message}`)
      } else {
        setError('重发失败，请重试')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  const verifyCode = async (code: string) => {
    if (!code || code.length < 6 || loading) return
    setError('')
    setSuccess(false)
    setInfo('')
    setLoading(true)
    try {
      const result = await verifySignupOtp(email, code, password)
      if (result?.error) {
        setError(result.error)
      } else if (result?.success) {
        setSuccess(true)
        router.push('/')
        router.refresh()
      }
    } catch (err) {
      console.error('注册错误:', err)
      if (err instanceof Error) {
        if (err.message.includes('fetch') || err.message.includes('network')) {
          setError('网络连接失败，请检查网络后重试')
        } else {
          setError(`注册失败: ${err.message}`)
        }
      } else {
        setError('注册失败，请重试')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setInfo('')

    if (step === 'request') {
      if (!password || password.length < 6) {
        setError('密码长度至少为 6 个字符')
        return
      }
      if (password !== confirmPassword) {
        setError('两次输入的密码不一致')
        return
      }
    }

    if (step === 'request') {
      setLoading(true)
      try {
        const result = await sendSignupOtp(email, nickname)
        if (result?.error) {
          setError(result.error)
        } else if (result?.success) {
          setStep('verify')
          setCooldown(60)
          setInfo('验证码已发送至邮箱，请输入 6 位验证码完成注册')
        }
      } catch (err) {
        console.error('注册错误:', err)
        if (err instanceof Error) {
          if (err.message.includes('fetch') || err.message.includes('network')) {
            setError('网络连接失败，请检查网络后重试')
          } else {
            setError(`注册失败: ${err.message}`)
          }
        } else {
          setError('注册失败，请重试')
        }
      } finally {
        setLoading(false)
      }
    } else {
      await verifyCode(otp)
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-md">
        <Card className="w-full">
          <CardHeader className="flex flex-col gap-1 items-start px-6 pt-6">
            <h1 className="text-2xl font-bold">注册成功</h1>
          </CardHeader>
          <Divider />
          <CardBody className="px-6 py-6">
            <div className="flex flex-col gap-4">
              <div className="text-sm text-success-700 dark:text-success-400 bg-success-100 dark:bg-success-900/30 px-4 py-3 rounded-lg">
              <p>注册成功，已自动登录。</p>
              <p className="mt-2">现在可以开始使用账户啦！</p>
              </div>
              <p className="text-sm text-default-500 text-center">
              页面将跳转至首页。
              </p>
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
          <h1 className="text-2xl font-bold">注册</h1>
          <p className="text-sm text-default-500">创建您的账号</p>
        </CardHeader>
        <Divider />
        <CardBody className="px-6 py-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {step === 'request' ? (
              <>
                <Input
                  type="text"
                  label="昵称"
                  variant="bordered"
                  labelPlacement="outside-top"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  isRequired
                  autoComplete="nickname"
                />
                <Input
                  type="email"
                  label="邮箱"
                  variant="bordered"
                  labelPlacement="outside-top"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  isRequired
                  autoComplete="email"
                />
                <Input
                  type="password"
                  label="密码"
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
                  label="确认密码"
                  variant="bordered"
                  labelPlacement="outside-top"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  isRequired
                  autoComplete="new-password"
                />
              </>
            ) : (
              <>
                <div className="rounded-lg border border-default-200 px-4 py-3 bg-default-50">
                  <p className="text-xs text-default-500 mb-1">昵称</p>
                  <p className="text-sm font-semibold">{nickname}</p>
                  <p className="text-xs text-default-500 mt-3 mb-1">邮箱</p>
                  <p className="text-sm font-semibold break-all">{email}</p>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="text-sm font-medium">验证码</div>
                  <InputOtp
                    length={6}
                    value={otp}
                    onValueChange={(val) => {
                      setOtp(val)
                      if (val.length === 6) {
                        verifyCode(val)
                      }
                    }}
                    size="lg"
                    variant="bordered"
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    classNames={{
                      input: 'text-2xl font-semibold',
                      wrapper: 'w-full',
                    }}
                  />
                  <p className="text-xs text-default-500">请输入邮件中的 6 位验证码</p>
                </div>
              </>
            )}

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
              color="primary"
              isLoading={loading}
              className="w-full"
            >
              {step === 'request' ? '发送验证码' : '验证并注册'}
            </Button>

            {step === 'verify' && (
              <div className="text-xs text-default-500 text-right">
                {cooldown > 0 ? (
                  <span className="text-default-400">重新发送 ({cooldown}s)</span>
                ) : (
                  <button
                    type="button"
                    className="text-primary underline decoration-solid decoration-1"
                    onClick={resendOtp}
                    disabled={loading}
                  >
                    重新发送验证码
                  </button>
                )}
              </div>
            )}
          </form>
        </CardBody>
        <Divider />
        <CardFooter className="px-6 py-4">
          <p className="text-sm text-default-500">
            已有账号？{' '}
            <Link href="/auth/login" size="sm">
              立即登录
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}

