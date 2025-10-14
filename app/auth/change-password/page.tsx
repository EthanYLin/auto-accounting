'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardBody, CardFooter } from '@heroui/card'
import { Input } from '@heroui/input'
import { Button } from '@heroui/button'
import { Link } from '@heroui/link'
import { Divider } from '@heroui/divider'
import { changePassword } from '@/app/actions/auth'

export default function ChangePasswordPage() {
  const [oldPassword, setOldPassword] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

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
      const result = await changePassword(oldPassword, password)
      if (result?.error) {
        setError(result.error)
      } else if (result?.success) {
        setSuccess(true)
        // 3秒后返回首页
        setTimeout(() => {
          router.push('/')
        }, 3000)
      }
    } catch (err) {
      console.error('修改密码错误:', err)
      if (err instanceof Error) {
        if (err.message.includes('fetch') || err.message.includes('network')) {
          setError('网络连接失败，请检查网络后重试')
        } else {
          setError(`修改密码失败: ${err.message}`)
        }
      } else {
        setError('修改密码失败，请重试')
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
            <h1 className="text-2xl font-bold">密码修改成功</h1>
          </CardHeader>
          <Divider />
          <CardBody className="px-6 py-6">
            <div className="flex flex-col gap-4">
              <div className="text-sm text-success-700 dark:text-success-400 bg-success-100 dark:bg-success-900/30 px-4 py-3 rounded-lg">
                <p className="font-semibold mb-2">密码已更新！</p>
                <p>您的密码已成功修改。</p>
                <p className="mt-2">3 秒后将自动返回首页...</p>
              </div>
              <Button
                as={Link}
                href="/"
                color="primary"
                className="w-full"
              >
                立即返回首页
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
          <h1 className="text-2xl font-bold">修改密码</h1>
          <p className="text-sm text-default-500">请输入您的新密码</p>
        </CardHeader>
        <Divider />
        <CardBody className="px-6 py-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              type="password"
              label="当前密码"
              variant="bordered"
              labelPlacement="outside-top"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
              isRequired
              autoComplete="current-password"
            />
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
              修改密码
            </Button>
          </form>
        </CardBody>
        <Divider />
        <CardFooter className="px-6 py-4">
          <p className="text-sm text-default-500">
            <Link href="/" size="sm">
              返回首页
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}

