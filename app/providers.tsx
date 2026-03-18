"use client";

import type { ThemeProviderProps } from "next-themes";

import * as React from "react";
import { HeroUIProvider } from "@heroui/react";
import { useRouter } from "next/navigation";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { I18nProvider } from "@react-aria/i18n";
import { ToastProvider } from "@heroui/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppDataProvider } from "@/components/context/app-data-context";
import { SaveButtonOverrideProvider } from "@/components/context/save-button-override-context";
import { TransactionStoreProvider } from "@/components/context/transaction-store-context";
import { TransactionEditorProvider } from "@/components/context/transaction-editor-context";
import { ErrorProvider } from "@/components/context/error-context";

export interface ProvidersProps {
  children: React.ReactNode;
  themeProps?: ThemeProviderProps;
}

declare module "@react-types/shared" {
  interface RouterConfig {
    routerOptions: NonNullable<
      Parameters<ReturnType<typeof useRouter>["push"]>[1]
    >;
  }
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 分钟内不会自动重新请求
        refetchOnWindowFocus: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === "undefined") {
    // 服务端：每次返回新实例
    return makeQueryClient();
  }
  // 浏览器：单例
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}

export function Providers({ children, themeProps }: ProvidersProps) {
  const router = useRouter();
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <HeroUIProvider navigate={router.push}>
        <I18nProvider locale="zh-CN">
          <NextThemesProvider {...themeProps}>
            <AppDataProvider>
              <ErrorProvider>
                <SaveButtonOverrideProvider>
                  <TransactionStoreProvider>
                    <TransactionEditorProvider>
                      {children}
                    </TransactionEditorProvider>
                  </TransactionStoreProvider>
                </SaveButtonOverrideProvider>
              </ErrorProvider>
            </AppDataProvider>
          </NextThemesProvider>
        </I18nProvider>
        <ToastProvider placement="top-center" />
      </HeroUIProvider>
    </QueryClientProvider>
  );
}
