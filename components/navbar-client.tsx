"use client";

import { useState } from "react";
import NextLink from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  Navbar as HeroUINavbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  NavbarMenu,
  NavbarMenuItem,
  NavbarMenuToggle,
} from "@heroui/navbar";
import { Button } from "@heroui/button";
import { link as linkStyles } from "@heroui/theme";
import type { User } from "@supabase/supabase-js";

import { siteConfig } from "@/models/site-config";
import { ThemeSwitch } from "@/components/theme-switch";
import { UserMenu } from "@/components/user-menu";

interface NavbarClientProps {
  user: User | null;
}

export function NavbarClient({ user }: NavbarClientProps) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const isItemActive = (href: string) => {
    try {
      const url = new URL(
        href,
        typeof window !== "undefined" ? window.location.origin : "http://localhost",
      );
      return pathname === url.pathname;
    } catch {
      return pathname === href;
    }
  };

  return (
    <HeroUINavbar
      isBordered
      maxWidth="xl"
      position="sticky"
      isMenuOpen={isMenuOpen}
      onMenuOpenChange={setIsMenuOpen}
    >
      <NavbarContent className="basis-1/2 sm:basis-auto" justify="start">
        <NavbarBrand className="max-w-fit">
          <NextLink className="font-bold text-inherit" href="/">
            自动记账
          </NextLink>
        </NavbarBrand>
        <div className="hidden lg:flex gap-4">
          {siteConfig.navItems.map((item) => (
            <NavbarItem key={item.href} isActive={isItemActive(item.href)}>
              <NextLink
                className={clsx(
                  linkStyles({ color: "foreground" }),
                  "relative",
                  isItemActive(item.href)
                    ? "text-primary font-semibold after:content-[''] after:absolute after:left-0 after:right-0 after:-bottom-1 after:h-[2px] after:bg-primary after:rounded-full"
                    : "text-foreground",
                )}
                href={item.href}
              >
                {item.label}
              </NextLink>
            </NavbarItem>
          ))}
        </div>
      </NavbarContent>

      <NavbarContent className="hidden sm:flex" justify="end">
        <NavbarItem>
          <ThemeSwitch />
        </NavbarItem>
        {user ? (
          <NavbarItem>
            <UserMenu user={user} />
          </NavbarItem>
        ) : (
          <>
            <NavbarItem>
              <Button as={NextLink} href="/auth/login" variant="flat" size="sm">
                登录
              </Button>
            </NavbarItem>
            <NavbarItem>
              <Button as={NextLink} href="/auth/register" color="primary" size="sm">
                注册
              </Button>
            </NavbarItem>
          </>
        )}
      </NavbarContent>

      <NavbarContent className="sm:hidden" justify="end">
        <NavbarMenuToggle
          aria-label={isMenuOpen ? "关闭导航菜单" : "打开导航菜单"}
          className="text-foreground"
        />
      </NavbarContent>

      <NavbarMenu>
        {siteConfig.navItems.map((item) => (
          <NavbarMenuItem key={item.href} isActive={isItemActive(item.href)}>
            <NextLink
              className={clsx(
                "w-full relative",
                isItemActive(item.href)
                  ? "text-primary font-semibold after:content-[''] after:absolute after:left-0 after:right-0 after:-bottom-1 after:h-[2px] after:bg-primary after:rounded-full"
                  : "text-foreground",
              )}
              href={item.href}
              onClick={() => setIsMenuOpen(false)}
            >
              {item.label}
            </NextLink>
          </NavbarMenuItem>
        ))}

        {!user ? (
          <NavbarMenuItem>
            <div className="flex items-center gap-3 py-2">
              <Button as={NextLink} href="/auth/login" fullWidth variant="flat" size="sm">
                登录
              </Button>
              <Button as={NextLink} href="/auth/register" fullWidth color="primary" size="sm">
                注册
              </Button>
            </div>
          </NavbarMenuItem>
        ) : (
          <NavbarMenuItem>
            <div className="flex items-center justify-between py-2">
              <span className="text-small text-default-500">账户</span>
              <UserMenu user={user} />
            </div>
          </NavbarMenuItem>
        )}

        <NavbarMenuItem>
          <div className="flex items-center justify-between py-2">
            <span className="text-small text-default-500">主题</span>
            <ThemeSwitch />
          </div>
        </NavbarMenuItem>
      </NavbarMenu>
    </HeroUINavbar>
  );
}

