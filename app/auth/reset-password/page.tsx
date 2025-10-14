'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardBody, CardFooter } from '@heroui/card'
import { Input } from '@heroui/input'
import { Button } from '@heroui/button'
import { Link } from '@heroui/link'
import { Divider } from '@heroui/divider'
import { updatePassword } from '@/app/actions/auth'

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

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
      const result = await updatePassword(password)
      if (result?.error) {
        setError(result.error)
      } else if (result?.success) {
        // 密码更新成功，跳转到登录页
        router.push('/auth/login?message=密码重置成功，请使用新密码登录')
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

  return (
    <div className="w-full max-w-md">
      <Card className="w-full">
        <CardHeader className="flex flex-col gap-1 items-start px-6 pt-6">
          <h1 className="text-2xl font-bold">重置密码</h1>
          <p className="text-sm text-default-500">请输入您的新密码</p>
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
              重置密码
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

