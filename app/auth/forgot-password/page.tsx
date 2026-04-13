"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardHeader, CardBody, CardFooter } from "@heroui/react";
import { Input } from "@heroui/react";
import { Button } from "@heroui/react";
import { Link } from "@heroui/react";
import { Divider } from "@heroui/react";

import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<ForgotPasswordFallback />}>
      <ForgotPasswordContent />
    </Suspense>
  );
}

function ForgotPasswordFallback() {
  return (
    <div className="w-full max-w-md">
      <Card className="w-full">
        <CardHeader className="flex flex-col items-start gap-1 px-6 pt-6">
          <h1 className="text-2xl font-bold">忘记密码</h1>
          <p className="text-sm text-default-500">正在加载重置入口...</p>
        </CardHeader>
        <Divider />
        <CardBody className="px-6 py-6">
          <div className="h-32 rounded-lg bg-default-100" />
        </CardBody>
      </Card>
    </div>
  );
}

function ForgotPasswordContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"request" | "sent">("request");
  const [cooldown, setCooldown] = useState(0);
  const isSent = step === "sent";
  const loginHref = email ? `/auth/login?email=${encodeURIComponent(email)}` : "/auth/login";
  const resendLabel = cooldown > 0 ? `重发邮件（${cooldown}s）` : "重发邮件";
  const submitLabel = isSent ? resendLabel : "发送重置邮件";

  useEffect(() => {
    const presetEmail = searchParams.get("email");

    if (presetEmail) setEmail(presetEmail);
  }, [searchParams]);

  useEffect(() => {
    if (cooldown <= 0) return;

    const timer = window.setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setInfo("");
    setLoading(true);

    try {
      const supabase = createClient();
      const redirectTo = process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password`
        : `${window.location.origin}/auth/reset-password`;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });

      if (resetError) {
        setError(resetError.message);
      } else {
        setStep("sent");
        setCooldown(60);
        setInfo("我们已向您的邮箱发送重置链接，请查看邮箱并点击重置链接。");
      }
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes("fetch") || err.message.includes("network")) {
          setError("网络连接失败，请检查网络后重试");
        } else {
          setError(`发送重置邮件失败: ${err.message}`);
        }
      } else {
        setError("发送重置邮件失败，请重试");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md">
      <Card className="w-full">
        <CardHeader className="flex flex-col items-start gap-1 px-6 pt-6">
          <h1 className="text-2xl font-bold">忘记密码</h1>
          <p className="text-sm text-default-500">输入邮箱，我们会发送重置密码链接到您的邮箱</p>
        </CardHeader>
        <Divider />
        <CardBody className="px-6 py-6">
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <Input
              isRequired
              autoComplete="email"
              classNames={{ input: "text-base" }}
              isDisabled={isSent}
              label="邮箱"
              labelPlacement="outside-top"
              type="email"
              value={email}
              variant="bordered"
              onChange={(e) => setEmail(e.target.value)}
            />
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
              className="w-full"
              color={isSent ? "default" : "primary"}
              isDisabled={isSent && cooldown > 0}
              isLoading={loading}
              type="submit"
              variant={isSent ? "flat" : "solid"}
            >
              {submitLabel}
            </Button>
          </form>
        </CardBody>
        <Divider />
        <CardFooter className="px-6 py-4">
          <p className="text-sm text-default-500">
            记起密码了？{" "}
            <Link href={loginHref} size="sm">
              返回登录
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
