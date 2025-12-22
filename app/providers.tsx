"use client";

import type { ThemeProviderProps } from "next-themes";

import * as React from "react";
import { HeroUIProvider } from "@heroui/system";
import { useRouter } from "next/navigation";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { I18nProvider } from "@react-aria/i18n";
import { AppDataProvider } from "@/components/context/app-data-context";
import { TransactionCacheProvider } from "@/components/context/transaction-cache-context";

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

export function Providers({ children, themeProps }: ProvidersProps) {
  const router = useRouter();

  return (
    <HeroUIProvider navigate={router.push}>
      <I18nProvider locale="zh-CN">
        <NextThemesProvider {...themeProps}>
          <AppDataProvider>
            <TransactionCacheProvider>
              {children}
            </TransactionCacheProvider>
          </AppDataProvider>
        </NextThemesProvider>
      </I18nProvider>
    </HeroUIProvider>
  );
}
