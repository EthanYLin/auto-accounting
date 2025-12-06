'use client'

import {
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
} from "@heroui/dropdown";
import { Avatar } from "@heroui/avatar";
import { signOut } from "@/app/actions/auth";
import { useRouter } from "next/navigation";
import { useAppData } from "@/contexts/app-data-context";

interface UserMenuProps {
  user: {
    email?: string;
  };
}

export function UserMenu({ user }: UserMenuProps) {
  const router = useRouter();
  const { clearData } = useAppData();

  const handleSignOut = async () => {
    const result = await signOut();
    if (result?.success) {
      // 清空缓存的数据
      clearData();
      router.push('/auth/login');
    }
  };

  const handleChangePassword = () => {
    router.push('/auth/change-password');
  };

  return (
    <Dropdown placement="bottom-end">
      <DropdownTrigger>
        <Avatar
          as="button"
          className="transition-transform"
          size="sm"
          name={user.email?.[0].toUpperCase()}
          showFallback
          aria-label="用户菜单"
        />
      </DropdownTrigger>
      <DropdownMenu aria-label="用户菜单" variant="flat">
        <DropdownItem key="profile" className="h-14 gap-2" textValue="用户信息">
          <p className="font-semibold">{user.email}</p>
        </DropdownItem>
        <DropdownItem key="change-password" onClick={handleChangePassword}>
          修改密码
        </DropdownItem>
        <DropdownItem key="logout" color="danger" onClick={handleSignOut}>
          退出登录
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}

