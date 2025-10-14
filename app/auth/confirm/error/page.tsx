'use client'

import { useSearchParams } from 'next/navigation'
import { Card, CardHeader, CardBody } from '@heroui/card'
import { Button } from '@heroui/button'
import { Link } from '@heroui/link'
import { Divider } from '@heroui/divider'

export default function ConfirmErrorPage() {
  const searchParams = useSearchParams()
  const error = searchParams.get('error') || '邮箱验证失败'

  return (
    <div className="w-full max-w-md">
      <Card className="w-full">
        <CardHeader className="flex flex-col gap-1 items-start px-6 pt-6">
          <h1 className="text-2xl font-bold">验证失败</h1>
        </CardHeader>
        <Divider />
        <CardBody className="px-6 py-6">
          <div className="flex flex-col gap-4">
            <div className="text-sm text-danger bg-danger-50 dark:bg-danger-900/20 px-4 py-3 rounded-lg">
              <p className="font-semibold mb-2">邮箱验证失败</p>
              <p>{error}</p>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                as={Link}
                href="/auth/register"
                color="primary"
                className="w-full"
              >
                重新注册
              </Button>
              <Button
                as={Link}
                href="/auth/login"
                variant="bordered"
                className="w-full"
              >
                返回登录
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

