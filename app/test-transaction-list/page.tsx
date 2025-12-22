'use client';

import React, { useState } from 'react';
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Modal, ModalContent, ModalBody } from "@heroui/modal";
import { Divider } from "@heroui/divider";
import { Chip } from "@heroui/chip";
import { TransactionListSelector } from '@/components/transaction/transaction-list-selector';
import { useTransactionCache } from '@/components/context/transaction-cache-context';
import { useAppData } from '@/components/context/app-data-context';
import { generateMockTransactions } from '@/lib/test-utils/generate-mock-transactions';

export default function TestTransactionListPage() {
  const { transactions, setTransactions, loadTransactions, syncTransactions, isLoading } = useTransactionCache();
  const { accounts, mainCategories, subCategories, budgetTypes } = useAppData();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [currentTransactionId, setCurrentTransactionId] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 生成测试数据（追加50条）
  const handleGenerateData = () => {
    // 找到当前最大的ID
    const maxId = transactions.length > 0 
      ? Math.max(...transactions.map(t => t.id))
      : 0;
    
    const newMockData = generateMockTransactions(
      50,
      accounts,
      mainCategories,
      subCategories,
      budgetTypes,
      true
    );
    
    // 调整新数据的ID，避免重复
    const adjustedData = newMockData.map(tx => ({
      ...tx,
      id: tx.id + maxId,
      parent_id: tx.parent_id ? tx.parent_id + maxId : null,
    }));
    
    setTransactions([...transactions, ...adjustedData]);
  };

  // 刷新数据（从云端加载）
  const handleRefresh = async () => {
    await loadTransactions();
  };

  // 同步数据（上传到云端）
  const handleSync = async () => {
    await syncTransactions();
  };

  // 打开Modal
  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  // 处理选择完成
  const handleConfirm = (ids: number[]) => {
    setSelectedIds(ids);
    setIsModalOpen(false);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <h1 className="text-3xl font-bold mb-6">交易列表选择器测试页面</h1>

      {/* 操作按钮区 */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-xl font-semibold">操作区</h2>
        </CardHeader>
        <Divider />
        <CardBody>
          {accounts.length === 0 ? (
            <div className="text-warning mb-3">
              <p className="text-sm">⚠️ 检测到没有账户数据，请先前往设置页面创建账户、类别等基础数据，再使用此测试页面。</p>
            </div>
          ) : (
            <div className="text-success-600 mb-3">
              <p className="text-sm">
                ✓ 已加载 {accounts.length} 个账户、{mainCategories.length} 个主类别、
                {subCategories.length} 个子类别、{budgetTypes.length} 个预算计划
              </p>
            </div>
          )}
          <div className="flex gap-3 flex-wrap">
            <Button
              color="primary"
              onPress={handleGenerateData}
              isDisabled={isLoading || accounts.length === 0}
            >
              生成测试数据（50条）
            </Button>
            <Button
              color="secondary"
              onPress={handleRefresh}
              isLoading={isLoading}
            >
              刷新（从云端加载）
            </Button>
            <Button
              color="success"
              onPress={handleSync}
              isLoading={isLoading}
            >
              同步（上传到云端）
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* 交易选择器触发 */}
      <Card className="mb-6">
        <CardHeader>
          <h2 className="text-xl font-semibold">交易列表选择器测试</h2>
        </CardHeader>
        <Divider />
        <CardBody>
          <div className="flex gap-3 items-end">
            <Input
              label="当前交易ID（可选）"
              placeholder="输入交易ID"
              value={currentTransactionId}
              onValueChange={setCurrentTransactionId}
              type="number"
              variant="bordered"
              size="sm"
              className="max-w-xs"
            />
            <Button
              color="primary"
              onPress={handleOpenModal}
            >
              打开选择器
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Modal - 交易列表选择器 */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        placement='center'
        size="5xl"
        scrollBehavior="inside"
        hideCloseButton
      >
        <ModalContent className="max-h-[90vh]">
          <ModalBody className="p-6 flex flex-col overflow-hidden">
            <TransactionListSelector
              selectedIds={selectedIds}
              currentTransactionId={currentTransactionId ? parseInt(currentTransactionId) : undefined}
              onConfirm={handleConfirm}
            />
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* 选择结果显示 */}
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">选择结果</h2>
        </CardHeader>
        <Divider />
        <CardBody>
          {selectedIds.length === 0 ? (
            <p className="text-gray-500">暂未选择任何交易记录</p>
          ) : (
            <div>
              <p className="mb-3 text-sm text-gray-600">
                已选择 <span className="font-semibold text-primary">{selectedIds.length}</span> 条记录
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedIds.map(id => (
                  <Chip key={id} color="primary" variant="flat">
                    ID: {id}
                  </Chip>
                ))}
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}


