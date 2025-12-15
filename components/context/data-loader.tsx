'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAppData } from '@/components/context/app-data-context';
import { getUser } from '@/app/actions/auth';

/**
 * 数据加载器组件
 * 在用户登录时自动加载数据
 */
export function DataLoader() {
  const { loadData, clearData, accounts, isLoading } = useAppData();
  const pathname = usePathname();
  const [lastUser, setLastUser] = useState<string | null>(null);

  useEffect(() => {
    // 检查用户是否已登录
    const checkUserAndLoadData = async () => {
      try {
        const user = await getUser();
        const userId = user?.id || null;

        // 用户状态发生变化
        if (userId !== lastUser) {
          setLastUser(userId);

          if (user && accounts.length === 0 && !isLoading) {
            console.log('用户已登录，开始加载数据...');
            await loadData();
          } else if (!user && accounts.length > 0) {
            console.log('用户未登录，清空数据...');
            clearData();
          }
        }
      } catch (error) {
        console.error('检查用户状态时出错:', error);
      }
    };

    checkUserAndLoadData();
  }, [pathname, lastUser, accounts.length, isLoading, loadData, clearData]);

  return null; // 这个组件不渲染任何内容
}

