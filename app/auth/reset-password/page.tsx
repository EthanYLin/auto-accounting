"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardHeader, CardBody, CardFooter } from "@heroui/react";
import { Input } from "@heroui/react";
import { Button } from "@heroui/react";
import { Link } from "@heroui/react";
import { Divider } from "@heroui/react";
import { Alert } from "@heroui/react";

import { updatePassword } from "@/app/actions/auth";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordContent />
    </Suspense>
  );
}

function ResetPasswordFallback() {
  return (
    <div className="w-full max-w-md">
      <Card className="w-full">
        <CardHeader className="flex flex-col gap-1 items-start px-6 pt-6">
          <h1 className="text-2xl font-bold">重置密码</h1>
          <p className="text-sm text-default-500">正在验证重置链接...</p>
        </CardHeader>
        <Divider />
        <CardBody className="px-6 py-6">
          <div className="h-40 rounded-lg bg-default-100" />
        </CardBody>
      </Card>
    </div>
  );
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (password.length < 6) {
      setError("密码长度至少为 6 个字符");
      return;
    }

    if (password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }

    if (!sessionReady) {
      setError("重置链接无效或已过期，请重新获取邮件");
      return;
    }

    setLoading(true);

    try {
      const result = await updatePassword(password);
      if (result?.error) {
        setError(result.error);
        setLoading(false);
      } else if (result?.success) {
        setSuccess(true);
        router.push("/auth/login?message=密码已重置，请使用新密码登录");
      }
    } catch (err) {
      console.error("重置密码错误:", err);
      if (err instanceof Error) {
        if (err.message.includes("fetch") || err.message.includes("network")) {
          setError("网络连接失败，请检查网络后重试");
        } else {
          setError(`重置密码失败: ${err.message}`);
        }
      } else {
        setError("重置密码失败，请重试");
      }
      setLoading(false);
    }
  };

  useEffect(() => {
    const errorParam = searchParams.get("error");
    const errorDesc = searchParams.get("error_description");
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");

    if (errorParam) {
      const msg = errorDesc
        ? decodeURIComponent(errorDesc)
        : "重置链接无效或已过期，请重新获取邮件";

      setLinkError(msg);
      setError(msg);
      return;
    }

    if (!tokenHash || type !== "recovery") {
      const msg = "重置链接无效或已过期，请重新获取邮件";
      setLinkError(msg);
      setError(msg);
      return;
    }

    const supabase = createClient();

    setLoading(true);
    supabase.auth
      .verifyOtp({
        token_hash: tokenHash,
        type: "recovery",
      })
      .then(({ error: verifyError }) => {
        if (verifyError) {
          const msg = verifyError.message || "重置链接无效或已过期，请重新获取邮件";
          setLinkError(msg);
          setError(msg);
          setSessionReady(false);
        } else {
          setSessionReady(true);
          setLinkError(null);
          setError("");
        }
      })
      .catch((err) => {
        console.error("verifyOtp 错误:", err);
        const msg = "重置链接无效或已过期，请重新获取邮件";
        setLinkError(msg);
        setError(msg);
        setSessionReady(false);
      })
      .finally(() => setLoading(false));
  }, [searchParams]);

  if (linkError) {
    return (
      <div className="w-full max-w-md">
        <Card className="w-full">
          <CardBody className="px-6 py-6 flex flex-col gap-4">
            <Alert color="danger" title="重置链接无效或已过期">
              {linkError}
            </Alert>
            <Button as={Link} className="w-full" color="primary" href="/auth/forgot-password">
              重新获取重置邮件
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="w-full max-w-md">
        <Card className="w-full">
          <CardHeader className="flex flex-col gap-1 items-start px-6 pt-6">
            <h1 className="text-2xl font-bold">密码更新成功</h1>
          </CardHeader>
          <Divider />
          <CardBody className="px-6 py-6">
            <div className="flex flex-col gap-4">
              <div className="text-sm text-success-700 dark:text-success-400 bg-success-100 dark:bg-success-900/30 px-4 py-3 rounded-lg">
                <p>您的密码已更新。</p>
              </div>
              <Button as={Link} className="w-full" color="primary" href="/auth/login">
                继续
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md">
      <Card className="w-full">
        <CardHeader className="flex flex-col gap-1 items-start px-6 pt-6">
          <h1 className="text-2xl font-bold">重置密码</h1>
          <p className="text-sm text-default-500">请设置一个新密码</p>
        </CardHeader>
        <Divider />
        <CardBody className="px-6 py-6">
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <Input
              isRequired
              autoComplete="new-password"
              classNames={{ input: "text-base" }}
              description="密码长度至少为 6 个字符"
              label="新密码"
              labelPlacement="outside-top"
              type="password"
              value={password}
              variant="bordered"
              onChange={(e) => setPassword(e.target.value)}
            />
            <Input
              isRequired
              autoComplete="new-password"
              classNames={{ input: "text-base" }}
              label="确认新密码"
              labelPlacement="outside-top"
              type="password"
              value={confirmPassword}
              variant="bordered"
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            {error && (
              <div className="text-sm text-danger bg-danger-50 dark:bg-danger-900/20 px-3 py-2 rounded-lg">
                {error}
              </div>
            )}

            <Button className="w-full" color="primary" isLoading={loading} type="submit">
              更新密码
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
  );
}
