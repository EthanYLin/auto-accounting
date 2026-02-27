'use client';

import React, { useState } from 'react';
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Input } from "@heroui/input";
import { Modal, ModalContent, ModalBody } from "@heroui/modal";
import { Divider } from "@heroui/divider";
import { Chip } from "@heroui/chip";
import { TransactionListSelector } from '@/components/homepage/common/transaction-list-selector';
import { useTransactionCache } from '@/components/context/transaction-cache-context';
import { useAppData } from '@/components/context/app-data-context';
import { useError } from '@/components/context/error-context';
import { generateMockTransactions } from '@/lib/test-utils/generate-mock-transactions';

export default function TestTransactionListPage() {
  const { transactions, setTransactions, loadTransactions, syncTransactions, deleteTransactions, deleteAllTransactions, isLoading } = useTransactionCache();
  const { accounts, mainCategories, subCategories, budgetTypes } = useAppData();
  const { showError } = useError();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [currentTransactionId, setCurrentTransactionId] = useState<string>('');
  const [deleteIds, setDeleteIds] = useState<string>('');
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
      parent_id: tx.parent ? tx.parent.id + maxId : null,
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

  // 测试错误提示
  const handleTestError = () => {
    showError(
      '这是一个测试错误', 
      '这是一条测试错误消息，用于验证 ErrorProvider 是否正常工作。\n\n如果你看到这个弹窗，说明错误提示功能运行正常！✨'
    );
  };

  // 删除指定 ID 的交易记录
  const handleDelete = async () => {
    if (!deleteIds.trim()) {
      showError('输入错误', '请输入要删除的交易记录 ID（多个 ID 用逗号分隔）');
      return;
    }

    // 解析 ID 字符串（支持逗号分隔）
    const ids = deleteIds
      .split(',')
      .map(id => parseInt(id.trim()))
      .filter(id => !isNaN(id));

    if (ids.length === 0) {
      showError('输入错误', '没有有效的 ID');
      return;
    }

    const result = await deleteTransactions(ids);
    if (!result.success) {
      showError('删除失败', result.error || '未知错误');
    } else {
      setDeleteIds(''); // 清空输入框
    }
  };

  // 删除所有交易记录
  const handleDeleteAll = async () => {
    if (transactions.length === 0) {
      showError('操作提示', '当前没有交易记录');
      return;
    }

    const confirmed = window.confirm(
      `确定要删除所有 ${transactions.length} 条交易记录吗？此操作不可撤销！`
    );

    if (!confirmed) {
      return;
    }

    const result = await deleteAllTransactions();
    if (!result.success) {
      showError('删除失败', result.error || '未知错误');
    }
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
          <div className="flex gap-3 flex-wrap mb-4">
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
            <Button
              color="danger"
              variant="flat"
              onPress={handleTestError}
            >
              🧪 测试错误提示
            </Button>
          </div>

          {/* 删除操作区 */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-semibold mb-3 text-default-600">删除操作</h3>
            <div className="flex gap-3 flex-wrap items-end">
              <Input
                label="要删除的 ID（多个用逗号分隔）"
                placeholder="例如: 1,2,3"
                value={deleteIds}
                onValueChange={setDeleteIds}
                variant="bordered"
                size="sm"
                className="max-w-xs"
              />
              <Button
                color="warning"
                onPress={handleDelete}
                isDisabled={isLoading || !deleteIds.trim()}
                size="sm"
              >
                删除指定记录
              </Button>
              <Button
                color="danger"
                onPress={handleDeleteAll}
                isDisabled={isLoading || transactions.length === 0}
                size="sm"
              >
                删除所有记录
              </Button>
            </div>
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


