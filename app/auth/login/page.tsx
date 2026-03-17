"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader, CardBody, CardFooter } from "@heroui/card";
import { Input } from "@heroui/input";
import { Button } from "@heroui/button";
import { Link } from "@heroui/link";
import { Divider } from "@heroui/divider";

import { signIn } from "@/app/actions/auth";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}

function LoginPageFallback() {
  return (
    <div className="w-full max-w-md">
      <Card className="w-full">
        <CardHeader className="flex flex-col gap-1 items-start px-6 pt-6">
          <h1 className="text-2xl font-bold">登录</h1>
          <p className="text-sm text-default-500">正在加载登录表单...</p>
        </CardHeader>
        <Divider />
        <CardBody className="px-6 py-6">
          <div className="h-40 rounded-lg bg-default-100" />
        </CardBody>
      </Card>
    </div>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const presetEmail = searchParams.get("email");

    if (presetEmail) {
      setEmail(presetEmail);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn(email, password);

      if (result?.error) {
        setError(result.error);
      } else if (result?.success) {
        router.push("/");
        router.refresh();
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes("fetch") || err.message.includes("network")) {
          setError("网络连接失败，请检查网络后重试");
        } else {
          setError(`登录失败: ${err.message}`);
        }
      } else {
        setError("登录失败，请重试");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <Card className="w-full">
        <CardHeader className="flex flex-col gap-1 items-start px-6 pt-6">
          <h1 className="text-2xl font-bold">登录</h1>
          <p className="text-sm text-default-500">欢迎回来，请登录您的账号</p>
        </CardHeader>
        <Divider />
        <CardBody className="px-6 py-6">
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <Input
              isRequired
              autoComplete="email"
              label="邮箱"
              labelPlacement="outside-top"
              type="email"
              value={email}
              variant="bordered"
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              isRequired
              autoComplete="current-password"
              label="密码"
              labelPlacement="outside-top"
              type="password"
              value={password}
              variant="bordered"
              onChange={(e) => setPassword(e.target.value)}
            />

            {error && (
              <div className="text-sm text-danger bg-danger-50 dark:bg-danger-900/20 px-3 py-2 rounded-lg">
                {error}
              </div>
            )}

            <div className="flex justify-end">
              <Link
                href={
                  email
                    ? `/auth/forgot-password?email=${encodeURIComponent(email)}`
                    : "/auth/forgot-password"
                }
                size="sm"
              >
                忘记密码？
              </Link>
            </div>

            <Button
              className="w-full"
              color="primary"
              isLoading={loading}
              type="submit"
            >
              登录
            </Button>
          </form>
        </CardBody>
        <Divider />
        <CardFooter className="px-6 py-4">
          <p className="text-sm text-default-500">
            还没有账号？{" "}
            <Link href="/auth/register" size="sm">
              立即注册
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
