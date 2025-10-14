'use client'

import { Card, CardHeader, CardBody } from '@heroui/card'
import { Button } from '@heroui/button'
import { Link } from '@heroui/link'
import { Divider } from '@heroui/divider'

export default function ConfirmSuccessPage() {
  return (
    <div className="w-full max-w-md">
      <Card className="w-full">
        <CardHeader className="flex flex-col gap-1 items-start px-6 pt-6">
          <h1 className="text-2xl font-bold">邮箱确认成功</h1>
        </CardHeader>
        <Divider />
        <CardBody className="px-6 py-6">
          <div className="flex flex-col gap-4">
            <div className="text-sm text-success bg-success-50 dark:bg-success-900/20 px-4 py-3 rounded-lg">
              <p className="font-semibold mb-2">您的邮箱已成功确认！</p>
              <p>欢迎加入，您现在可以开始使用所有功能了。</p>
            </div>
            <Button
              as={Link}
              href="/"
              color="primary"
              className="w-full"
            >
              前往首页
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}

