'use client'

import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/react";
import { Avatar } from "@heroui/react";
import { signOut } from "@/app/actions/auth";
import { useRouter } from "next/navigation";
import { useAppData } from "@/components/context/app-data-context";

interface UserMenuProps {
  user: {
    email?: string;
    user_metadata?: {
      nickname?: string;
    };
  };
}

export function UserMenu({ user }: UserMenuProps) {
  const router = useRouter();
  const { clearData } = useAppData();
  const displayName = user.user_metadata?.nickname || user.email || '';

  const handleSignOut = async () => {
    const result = await signOut();
    if (result?.success) {
      // 清空缓存的数据
      clearData();
      router.push('/auth/login');
    }
  };

  return (
    <Dropdown placement="bottom-end">
      <DropdownTrigger>
        <Avatar
          as="button"
          className="transition-transform"
          size="sm"
          name={displayName[0]?.toUpperCase()}
          showFallback
          aria-label="用户菜单"
        />
      </DropdownTrigger>
      <DropdownMenu aria-label="用户菜单" variant="flat">
        <DropdownItem key="profile" className="h-14 gap-2" textValue="用户信息">
          <p className="font-semibold">{displayName || '未设置昵称'}</p>
          {user.email && <p className="text-small text-default-500">{user.email}</p>}
        </DropdownItem>
        <DropdownItem key="logout" color="danger" onClick={handleSignOut}>
          退出登录
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}

