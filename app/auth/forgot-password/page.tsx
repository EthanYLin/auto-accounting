'use client'

import { useState } from 'react'
import { Card, CardHeader, CardBody, CardFooter } from '@heroui/card'
import { Input } from '@heroui/input'
import { Button } from '@heroui/button'
import { Link } from '@heroui/link'
import { Divider } from '@heroui/divider'
import { resetPassword } from '@/app/actions/auth'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess(false)
    setLoading(true)

    try {
      const result = await resetPassword(email)
      if (result?.error) {
        setError(result.error)
      } else if (result?.success) {
        setSuccess(true)
      }
    } catch (err) {
      setError('发送重置邮件失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-md">
        <Card className="w-full">
          <CardHeader className="flex flex-col gap-1 items-start px-6 pt-6">
            <h1 className="text-2xl font-bold">重置密码邮件已发送</h1>
          </CardHeader>
          <Divider />
          <CardBody className="px-6 py-6">
            <div className="flex flex-col gap-4">
              <div className="text-sm text-success bg-success-50 dark:bg-success-900/20 px-4 py-3 rounded-lg">
                <p className="font-semibold mb-2">邮件已发送！</p>
                <p>我们已经向您的邮箱发送了密码重置链接。</p>
                <p className="mt-2">请查收邮件并点击链接重置密码。</p>
              </div>
              <p className="text-sm text-default-500">
                如果您没有收到邮件，请检查垃圾邮件文件夹。
              </p>
              <Button
                as={Link}
                href="/auth/login"
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
            输入您的邮箱地址，我们将发送密码重置链接
          </p>
        </CardHeader>
        <Divider />
        <CardBody className="px-6 py-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              type="email"
              label="邮箱"
              placeholder="请输入您的邮箱"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              isRequired
              autoComplete="email"
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
              发送重置邮件
            </Button>
          </form>
        </CardBody>
        <Divider />
        <CardFooter className="px-6 py-4">
          <p className="text-sm text-default-500">
            记起密码了？{' '}
            <Link href="/auth/login" size="sm">
              返回登录
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}

