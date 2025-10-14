'use client'

import { JSX, SVGProps, useState } from 'react'
import { Card, CardHeader, CardBody, CardFooter } from '@heroui/card'
import { Input } from '@heroui/input'
import { Button } from '@heroui/button'
import { Link } from '@heroui/link'
import { Divider } from '@heroui/divider'
import { signIn } from '@/app/actions/auth'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn(email, password)
      if (result?.error) {
        setError(result.error)
      }
    } catch (err) {
      console.error('登录错误:', err)
      if (err instanceof Error) {
        if (err.message.includes('fetch') || err.message.includes('network')) {
          setError('网络连接失败，请检查网络后重试')
        } else {
          setError(`登录失败: ${err.message}`)
        }
      } else {
        setError('登录失败，请重试')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md">
      <Card className="w-full">
        <CardHeader className="flex flex-col gap-1 items-start px-6 pt-6">
          <h1 className="text-2xl font-bold">登录</h1>
          <p className="text-sm text-default-500">欢迎回来，请登录您的账号</p>
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
              autoComplete="current-password"
            />

            {error && (
              <div className="text-sm text-danger bg-danger-50 dark:bg-danger-900/20 px-3 py-2 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <Link href="/auth/forgot-password" size="sm">
                忘记密码？
              </Link>
            </div>

            <Button
              type="submit"
              color="primary"
              isLoading={loading}
              className="w-full"
            >
              登录
            </Button>
          </form>
        </CardBody>
        <Divider />
        <CardFooter className="px-6 py-4">
          <p className="text-sm text-default-500">
            还没有账号？{' '}
            <Link href="/auth/register" size="sm">
              立即注册
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}

