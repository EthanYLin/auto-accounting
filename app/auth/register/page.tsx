'use client'

import { useState } from 'react'
import { Card, CardHeader, CardBody, CardFooter } from '@heroui/card'
import { Input } from '@heroui/input'
import { Button } from '@heroui/button'
import { Link } from '@heroui/link'
import { Divider } from '@heroui/divider'
import { signUp } from '@/app/actions/auth'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    // 验证密码
    if (password.length < 6) {
      setError('密码长度至少为 6 个字符')
      return
    }

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    setLoading(true)

    try {
      const result = await signUp(email, password)
      if (result?.error) {
        setError(result.error)
      } else if (result?.success) {
        setSuccess(true)
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
              <div className="text-sm text-success bg-success-50 dark:bg-success-900/20 px-4 py-3 rounded-lg">
                <p>我们已经向您的邮箱发送了一封验证邮件。</p>
                <p className="mt-2">请查收邮件并点击验证链接完成注册。</p>
              </div>
              <p className="text-sm text-default-500 text-center">
                您可以关闭此页面，查收邮件完成注册。
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
              注册
            </Button>
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

