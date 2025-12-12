"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@heroui/button";
import { Card, CardBody, CardHeader } from "@heroui/card";
import { Chip } from "@heroui/chip";
import { Divider } from "@heroui/divider";
import { Input, Textarea } from "@heroui/input";
import { Modal, ModalBody, ModalContent, ModalFooter, ModalHeader, useDisclosure } from "@heroui/modal";
import { Select, SelectItem } from "@heroui/select";
import { Spinner } from "@heroui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
} from "@heroui/table";
import { Tab, Tabs } from "@heroui/tabs";

import { useAppData } from "@/contexts/app-data-context";
import type {
  Account,
  BudgetType,
  MainCategory,
  SubCategory,
  TransactionType,
} from "@/types";
import { TRANSACTION_TYPES } from "@/constants/transaction";
import { FourChainSelector } from "@/components/four-chain-selector";
import type { FourChainSelection } from "@/types/four-chain-selector";
import {
  createAccount,
  createBudgetType,
  createMainCategory,
  createSubCategory,
  deleteAccount,
  deleteBudgetType,
  deleteMainCategory,
  deleteSubCategory,
  updateAccount,
  updateBudgetType,
  updateMainCategory,
  updateSubCategory,
} from "@/app/actions/data";

type MainCategoryForm = {
  id?: number;
  label: string;
  transaction_type: TransactionType;
  icon: string;
  back_color: string;
  fore_color: string;
};

type SubCategoryForm = {
  id?: number;
  label: string;
  main_category_id: number | "";
  budget_type_id: number | null;
  icon: string;
  back_color: string;
  fore_color: string;
};

export default function SettingsPage() {
  const {
    accounts,
    mainCategories,
    subCategories,
    budgetTypes,
    isLoading,
    loadData,
    error: loadError,
  } = useAppData();

  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // FourChainSelector测试状态
  const [chainSelection, setChainSelection] = useState<FourChainSelection>(null);

  // 账户
  const [accountName, setAccountName] = useState("");
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const accountModal = useDisclosure();

  // 预算
  const [budgetName, setBudgetName] = useState("");
  const [budgetIcon, setBudgetIcon] = useState("");
  const [editingBudget, setEditingBudget] = useState<BudgetType | null>(null);
  const budgetModal = useDisclosure();

  // 主类别
  const [mainForm, setMainForm] = useState<MainCategoryForm>({
    label: "",
    transaction_type: TRANSACTION_TYPES[0],
    icon: "",
    back_color: "",
    fore_color: "",
  });
  const mainModal = useDisclosure();

  // 子类别
  const [subForm, setSubForm] = useState<SubCategoryForm>({
    label: "",
    main_category_id: "",
    budget_type_id: null,
    icon: "",
    back_color: "",
    fore_color: "",
  });
  const subModal = useDisclosure();

  // 子类别筛选
  const [subFilterType, setSubFilterType] = useState<TransactionType | "">(TRANSACTION_TYPES[0]);
  const [subFilterMainId, setSubFilterMainId] = useState<number | "">("");

  // 删除确认
  type DeleteTarget =
    | { type: "account"; data: Account }
    | { type: "budget"; data: BudgetType }
    | { type: "main"; data: MainCategory }
    | { type: "sub"; data: SubCategory };
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const deleteModal = useDisclosure();

  // 初始化或刷新数据
  useEffect(() => {
    if (!isLoading && accounts.length === 0 && mainCategories.length === 0) {
      void loadData();
    }
  }, [accounts.length, isLoading, loadData, mainCategories.length]);

  const mainCategoryMap = useMemo(
    () =>
      new Map<number, MainCategory>(
        mainCategories.map((item) => [item.id, item]),
      ),
    [mainCategories],
  );

  const budgetTypeMap = useMemo(
    () => new Map<number, BudgetType>(budgetTypes.map((b) => [b.id, b])),
    [budgetTypes],
  );

  // 根据交易类型筛选主类别
  const filteredMainCategories = useMemo(
    () => subFilterType
      ? mainCategories.filter((m) => m.transaction_type === subFilterType)
      : mainCategories,
    [mainCategories, subFilterType],
  );

  // 根据主类别筛选子类别
  const filteredSubCategories = useMemo(
    () => subFilterMainId
      ? subCategories.filter((s) => s.main_category_id === subFilterMainId)
      : subCategories,
    [subCategories, subFilterMainId],
  );

  const resetFeedback = () => {
    setActionError(null);
    setActionSuccess(null);
  };

  const runAction = async (
    fn: () => Promise<{ success: boolean; error?: string }>,
    successMsg: string,
    onSuccess?: () => void,
  ) => {
    resetFeedback();
    setActionLoading(true);
    const result = await fn();
    setActionLoading(false);

    if (!result.success) {
      setActionError(result.error || "操作失败，请重试");
      return;
    }

    setActionSuccess(successMsg);
    onSuccess?.(); // 立即执行成功回调（如关闭弹窗）
    await loadData(); // 然后在后台刷新数据
  };

  // === 账户 ===
  const openAccountModal = (account?: Account) => {
    resetFeedback();
    if (account) {
      setEditingAccount(account);
      setAccountName(account.name);
    } else {
      setEditingAccount(null);
      setAccountName("");
    }
    accountModal.onOpen();
  };

  const handleSaveAccount = async () => {
    if (!accountName.trim()) {
      setActionError("请输入账户名称");
      return;
    }

    await runAction(
      () =>
        editingAccount
          ? updateAccount(editingAccount.id, accountName.trim())
          : createAccount(accountName.trim()),
      editingAccount ? "账户已更新" : "账户已创建",
      () => accountModal.onClose(), // 成功后立即关闭弹窗
    );
  };

  const handleDeleteAccount = (account: Account) => {
    setDeleteTarget({ type: "account", data: account });
    deleteModal.onOpen();
  };

  // === 预算计划 ===
  const openBudgetModal = (budget?: BudgetType) => {
    resetFeedback();
    if (budget) {
      setEditingBudget(budget);
      setBudgetName(budget.name);
      setBudgetIcon(budget.icon || "");
    } else {
      setEditingBudget(null);
      setBudgetName("");
      setBudgetIcon("");
    }
    budgetModal.onOpen();
  };

  const handleSaveBudget = async () => {
    if (!budgetName.trim()) {
      setActionError("请输入预算计划名称");
      return;
    }

    await runAction(
      () =>
        editingBudget
          ? updateBudgetType(editingBudget.id, budgetName.trim(), budgetIcon.trim() || undefined)
          : createBudgetType(budgetName.trim(), budgetIcon.trim() || undefined),
      editingBudget ? "预算计划已更新" : "预算计划已创建",
      () => budgetModal.onClose(), // 成功后立即关闭弹窗
    );
  };

  const handleDeleteBudget = (budget: BudgetType) => {
    setDeleteTarget({ type: "budget", data: budget });
    deleteModal.onOpen();
  };

  // === 主类别 ===
  const openMainModal = (item?: MainCategory) => {
    resetFeedback();
    if (item) {
      setMainForm({
        id: item.id,
        label: item.label,
        transaction_type: item.transaction_type,
        icon: item.icon,
        back_color: item.back_color,
        fore_color: item.fore_color,
      });
    } else {
      setMainForm({
        label: "",
        transaction_type: TRANSACTION_TYPES[0],
        icon: "",
        back_color: "",
        fore_color: "",
      });
    }
    mainModal.onOpen();
  };

  const handleSaveMain = async () => {
    if (!mainForm.label.trim()) {
      setActionError("请输入主类别名称");
      return;
    }

    const payload = {
      label: mainForm.label.trim(),
      transaction_type: mainForm.transaction_type,
      icon: mainForm.icon || "📂",
      back_color: mainForm.back_color || "#EEF2FF",
      fore_color: mainForm.fore_color || "#111827",
    };

    await runAction(
      () =>
        mainForm.id
          ? updateMainCategory(mainForm.id, payload)
          : createMainCategory(payload),
      mainForm.id ? "主类别已更新" : "主类别已创建",
      () => mainModal.onClose(), // 成功后立即关闭弹窗
    );
  };

  const handleDeleteMain = (item: MainCategory) => {
    setDeleteTarget({ type: "main", data: item });
    deleteModal.onOpen();
  };

  // === 子类别 ===
  const openSubModal = (item?: SubCategory) => {
    resetFeedback();
    if (item) {
      setSubForm({
        id: item.id,
        label: item.label,
        main_category_id: item.main_category_id,
        budget_type_id: item.budget_type_id,
        icon: item.icon,
        back_color: item.back_color,
        fore_color: item.fore_color,
      });
    } else {
      setSubForm({
        label: "",
        main_category_id: "",
        budget_type_id: null,
        icon: "",
        back_color: "",
        fore_color: "",
      });
    }
    subModal.onOpen();
  };

  const handleSaveSub = async () => {
    if (!subForm.label.trim()) {
      setActionError("请输入子类别名称");
      return;
    }

    if (!subForm.main_category_id) {
      setActionError("请选择主类别");
      return;
    }

    const payload = {
      label: subForm.label.trim(),
      main_category_id: typeof subForm.main_category_id === "string"
        ? Number(subForm.main_category_id)
        : subForm.main_category_id,
      budget_type_id: subForm.budget_type_id,
      icon: subForm.icon || "📌",
      back_color: subForm.back_color || "bg-gray-100 dark:bg-gray-800",
      fore_color: subForm.fore_color || "text-gray-800 dark:text-gray-200",
    };

    await runAction(
      () =>
        subForm.id
          ? updateSubCategory(subForm.id, payload)
          : createSubCategory(payload),
      subForm.id ? "子类别已更新" : "子类别已创建",
      () => subModal.onClose(), // 成功后立即关闭弹窗
    );
  };

  const handleDeleteSub = (item: SubCategory) => {
    setDeleteTarget({ type: "sub", data: item });
    deleteModal.onOpen();
  };

  // 确认删除
  const confirmDelete = async () => {
    if (!deleteTarget) return;

    const { type, data } = deleteTarget;
    let actionFn: () => Promise<{ success: boolean; error?: string }>;
    let successMsg: string;

    switch (type) {
      case "account":
        actionFn = () => deleteAccount(data.id);
        successMsg = "账户已删除";
        break;
      case "budget":
        actionFn = () => deleteBudgetType(data.id);
        successMsg = "预算计划已删除";
        break;
      case "main":
        actionFn = () => deleteMainCategory(data.id);
        successMsg = "主类别已删除";
        break;
      case "sub":
        actionFn = () => deleteSubCategory(data.id);
        successMsg = "子类别已删除";
        break;
    }

    await runAction(actionFn, successMsg, () => {
      deleteModal.onClose();
      setDeleteTarget(null);
    });
  };

  const isBusy = isLoading || actionLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">配置中心</h1>
        </div>
        <div className="flex items-center gap-2">
          {loadError && <Chip color="danger" variant="flat">{loadError}</Chip>}
          <Button
            variant="flat"
            isLoading={isBusy}
            onPress={() => {
              resetFeedback();
              void loadData();
            }}
          >
            刷新
          </Button>
        </div>
      </div>

      {(actionError || actionSuccess) && (
        <div className="flex gap-3">
          {actionError && <Chip color="danger" variant="flat">{actionError}</Chip>}
          {actionSuccess && <Chip color="success" variant="flat">{actionSuccess}</Chip>}
        </div>
      )}

      <Tabs
        aria-label="配置项"
        variant="solid"
        color="primary"
        className="w-full"
      >
        <Tab key="account" title="账户">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">账户列表</h3>
              </div>
              <Button color="primary" onPress={() => openAccountModal()}>
                新增账户
              </Button>
            </CardHeader>
            <Divider />
            <CardBody>
              {isBusy ? (
                <div className="py-8 flex justify-center">
                  <Spinner label="加载中..." />
                </div>
              ) : accounts.length === 0 ? (
                <div className="py-8 text-center text-default-500">
                  暂无账户，点击“新增账户”开始添加。
                </div>
              ) : (
                <Table aria-label="账户列表" removeWrapper>
                  <TableHeader>
                    <TableColumn>ID</TableColumn>
                    <TableColumn>名称</TableColumn>
                    <TableColumn align="end">操作</TableColumn>
                  </TableHeader>
                  <TableBody items={accounts}>
                    {(account) => (
                      <TableRow key={account.id}>
                        <TableCell>#{account.id}</TableCell>
                        <TableCell>{account.name}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="light"
                              onPress={() => openAccountModal(account)}
                            >
                              编辑
                            </Button>
                            <Button
                              size="sm"
                              color="danger"
                              variant="flat"
                              onPress={() => handleDeleteAccount(account)}
                            >
                              删除
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardBody>
          </Card>
        </Tab>

        <Tab key="budget" title="预算计划">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">预算计划</h3>
              </div>
              <Button color="primary" onPress={() => openBudgetModal()}>
                新增预算计划
              </Button>
            </CardHeader>
            <Divider />
            <CardBody>
              {isBusy ? (
                <div className="py-8 flex justify-center">
                  <Spinner label="加载中..." />
                </div>
              ) : budgetTypes.length === 0 ? (
                <div className="py-8 text-center text-default-500">
                  暂无预算计划，点击“新增预算计划”开始添加。
                </div>
              ) : (
                <Table aria-label="预算计划列表" removeWrapper>
                  <TableHeader>
                    <TableColumn>ID</TableColumn>
                    <TableColumn>名称</TableColumn>
                    <TableColumn>图标</TableColumn>
                    <TableColumn align="end">操作</TableColumn>
                  </TableHeader>
                  <TableBody items={budgetTypes}>
                    {(item) => (
                      <TableRow key={item.id}>
                        <TableCell>#{item.id}</TableCell>
                        <TableCell>{item.name}</TableCell>
                        <TableCell>{item.icon || "—"}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="light"
                              onPress={() => openBudgetModal(item)}
                            >
                              编辑
                            </Button>
                            <Button
                              size="sm"
                              color="danger"
                              variant="flat"
                              onPress={() => handleDeleteBudget(item)}
                            >
                              删除
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardBody>
          </Card>
        </Tab>

        <Tab key="main-category" title="主类别">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">主类别</h3>
              </div>
              <Button color="primary" onPress={() => openMainModal()}>
                新增主类别
              </Button>
            </CardHeader>
            <Divider />
            <CardBody>
              {isBusy ? (
                <div className="py-8 flex justify-center">
                  <Spinner label="加载中..." />
                </div>
              ) : mainCategories.length === 0 ? (
                <div className="py-8 text-center text-default-500">
                  暂无主类别，点击“新增主类别”开始添加。
                </div>
              ) : (
                <Table aria-label="主类别列表" removeWrapper>
                  <TableHeader>
                    <TableColumn>ID</TableColumn>
                    <TableColumn>名称</TableColumn>
                    <TableColumn>交易类型</TableColumn>
                    <TableColumn>图标</TableColumn>
                    <TableColumn>背景色</TableColumn>
                    <TableColumn>前景色</TableColumn>
                    <TableColumn align="end">操作</TableColumn>
                  </TableHeader>
                  <TableBody items={mainCategories}>
                    {(item) => (
                      <TableRow key={item.id}>
                        <TableCell>#{item.id}</TableCell>
                        <TableCell>{item.label}</TableCell>
                        <TableCell>{item.transaction_type}</TableCell>
                        <TableCell>{item.icon}</TableCell>
                        <TableCell>
                          <span className="text-xs font-mono">{item.back_color}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-mono">{item.fore_color}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="light"
                              onPress={() => openMainModal(item)}
                            >
                              编辑
                            </Button>
                            <Button
                              size="sm"
                              color="danger"
                              variant="flat"
                              onPress={() => handleDeleteMain(item)}
                            >
                              删除
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardBody>
          </Card>
        </Tab>

        <Tab key="sub-category" title="子类别">
          <Card>
            <CardHeader className="flex flex-col gap-4">
              <div className="flex w-full items-center justify-between">
                <h3 className="text-lg font-semibold">子类别</h3>
                <Button color="primary" onPress={() => openSubModal()}>
                  新增子类别
                </Button>
              </div>
              <div className="flex w-full gap-4">
                <Select
                  label="交易类型"
                  placeholder="全部"
                  className="max-w-xs"
                  selectedKeys={subFilterType ? [subFilterType] : []}
                  onSelectionChange={(keys) => {
                    const key = Array.from(keys)[0] as TransactionType | undefined;
                    setSubFilterType(key || "");
                    setSubFilterMainId(""); // 切换交易类型时重置主类别筛选
                  }}
                >
                  {TRANSACTION_TYPES.map((type) => (
                    <SelectItem key={type}>{type}</SelectItem>
                  ))}
                </Select>
                <Select
                  label="主类别"
                  placeholder="请先选择交易类型"
                  className="max-w-xs"
                  isDisabled={!subFilterType}
                  selectedKeys={subFilterMainId ? [String(subFilterMainId)] : []}
                  onSelectionChange={(keys) => {
                    const key = Array.from(keys)[0];
                    setSubFilterMainId(key ? Number(key) : "");
                  }}
                >
                  {filteredMainCategories.map((item) => (
                    <SelectItem key={item.id}>{item.label}</SelectItem>
                  ))}
                </Select>
              </div>
            </CardHeader>
            <Divider />
            <CardBody>
              {isBusy ? (
                <div className="py-8 flex justify-center">
                  <Spinner label="加载中..." />
                </div>
              ) : !subFilterMainId ? (
                <div className="py-8 text-center text-default-500">
                  请选择交易类型和主类别以查看子类别。
                </div>
              ) : filteredSubCategories.length === 0 ? (
                <div className="py-8 text-center text-default-500">
                  该主类别下暂无子类别，点击"新增子类别"开始添加。
                </div>
              ) : (
                <Table aria-label="子类别列表" removeWrapper>
                  <TableHeader>
                    <TableColumn>ID</TableColumn>
                    <TableColumn>名称</TableColumn>
                    <TableColumn>所属主类别</TableColumn>
                    <TableColumn>预算计划</TableColumn>
                    <TableColumn>图标</TableColumn>
                    <TableColumn>背景色</TableColumn>
                    <TableColumn>前景色</TableColumn>
                    <TableColumn align="end">操作</TableColumn>
                  </TableHeader>
                  <TableBody items={filteredSubCategories}>
                    {(item) => (
                      <TableRow key={item.id}>
                        <TableCell>#{item.id}</TableCell>
                        <TableCell>{item.label}</TableCell>
                        <TableCell>
                          {mainCategoryMap.get(item.main_category_id)?.label ??
                            item.main_category_id}
                        </TableCell>
                        <TableCell>
                          {item.budget_type_id
                            ? budgetTypeMap.get(item.budget_type_id)?.name || item.budget_type_id
                            : "未绑定"}
                        </TableCell>
                        <TableCell>{item.icon}</TableCell>
                        <TableCell>
                          <span className="text-xs font-mono">{item.back_color}</span>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-mono">{item.fore_color}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="light"
                              onPress={() => openSubModal(item)}
                            >
                              编辑
                            </Button>
                            <Button
                              size="sm"
                              color="danger"
                              variant="flat"
                              onPress={() => handleDeleteSub(item)}
                            >
                              删除
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardBody>
          </Card>
        </Tab>
      </Tabs>

      {/* 账户弹窗 */}
      <Modal isOpen={accountModal.isOpen} onClose={accountModal.onClose}>
        <ModalContent>
          <ModalHeader>{editingAccount ? "编辑账户" : "新增账户"}</ModalHeader>
          <ModalBody>
            <Input
              label="账户名称"
              placeholder="如 工商银行信用卡"
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={accountModal.onClose}>
              取消
            </Button>
            <Button color="primary" isLoading={actionLoading} onPress={handleSaveAccount}>
              保存
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 预算弹窗 */}
      <Modal isOpen={budgetModal.isOpen} onClose={budgetModal.onClose}>
        <ModalContent>
          <ModalHeader>{editingBudget ? "编辑预算计划" : "新增预算计划"}</ModalHeader>
          <ModalBody>
            <Input
              label="预算计划名称"
              placeholder="如 基本开支"
              value={budgetName}
              onChange={(e) => setBudgetName(e.target.value)}
            />
            <Input
              label="预算计划图标"
              placeholder="输入 Emoji"
              value={budgetIcon}
              onChange={(e) => setBudgetIcon(e.target.value)}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={budgetModal.onClose}>
              取消
            </Button>
            <Button color="primary" isLoading={actionLoading} onPress={handleSaveBudget}>
              保存
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 主类别弹窗 */}
      <Modal isOpen={mainModal.isOpen} onClose={mainModal.onClose} size="lg">
        <ModalContent>
          <ModalHeader>{mainForm.id ? "编辑主类别" : "新增主类别"}</ModalHeader>
          <ModalBody>
            <Input
              label="名称"
              placeholder="如 饮食"
              value={mainForm.label}
              onChange={(e) => setMainForm((prev) => ({ ...prev, label: e.target.value }))}
            />
            <Select
              label="交易类型"
              selectedKeys={[mainForm.transaction_type]}
              onSelectionChange={(keys) => {
                const key = Array.from(keys)[0] as TransactionType | undefined;
                if (key) {
                  setMainForm((prev) => ({ ...prev, transaction_type: key }));
                }
              }}
            >
              {TRANSACTION_TYPES.map((type) => (
                <SelectItem key={type}>{type}</SelectItem>
              ))}
            </Select>
            <Input
              label="图标"
              placeholder="输入 Emoji"
              value={mainForm.icon}
              onChange={(e) => setMainForm((prev) => ({ ...prev, icon: e.target.value }))}
            />
            <Input
              label="背景色"
              placeholder="如 bg-yellow-100"
              value={mainForm.back_color}
              onChange={(e) => setMainForm((prev) => ({ ...prev, back_color: e.target.value }))}
            />
            <Input
              label="前景色"
              placeholder="如 text-yellow-800"
              value={mainForm.fore_color}
              onChange={(e) => setMainForm((prev) => ({ ...prev, fore_color: e.target.value }))}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={mainModal.onClose}>
              取消
            </Button>
            <Button color="primary" isLoading={actionLoading} onPress={handleSaveMain}>
              保存
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 子类别弹窗 */}
      <Modal isOpen={subModal.isOpen} onClose={subModal.onClose} size="lg">
        <ModalContent>
          <ModalHeader>{subForm.id ? "编辑子类别" : "新增子类别"}</ModalHeader>
          <ModalBody>
            <Input
              label="名称"
              placeholder="如 午餐"
              value={subForm.label}
              onChange={(e) => setSubForm((prev) => ({ ...prev, label: e.target.value }))}
            />
            <Select
              label="所属主类别"
              placeholder="请选择"
              selectedKeys={
                subForm.main_category_id ? [String(subForm.main_category_id)] : []
              }
              onSelectionChange={(keys) => {
                const key = Array.from(keys)[0];
                setSubForm((prev) => ({
                  ...prev,
                  main_category_id: key ? Number(key) : "",
                }));
              }}
            >
              {mainCategories.map((item) => (
                <SelectItem key={item.id} textValue={`${item.label}（${item.transaction_type}）`}>
                  {item.label}（{item.transaction_type}）
                </SelectItem>
              ))}
            </Select>
            <Select
              label="预算计划（可选）"
              placeholder="可留空"
              selectedKeys={
                subForm.budget_type_id ? [String(subForm.budget_type_id)] : []
              }
              onSelectionChange={(keys) => {
                const key = Array.from(keys)[0];
                setSubForm((prev) => ({
                  ...prev,
                  budget_type_id: key ? Number(key) : null,
                }));
              }}
            >
              {budgetTypes.map((item) => (
                <SelectItem key={item.id}>{item.name}</SelectItem>
              ))}
            </Select>
            <Input
              label="图标"
              placeholder="输入 Emoji"
              value={subForm.icon}
              onChange={(e) => setSubForm((prev) => ({ ...prev, icon: e.target.value }))}
            />
            <Input
              label="背景色"
              placeholder="如 bg-blue-100"
              value={subForm.back_color}
              onChange={(e) => setSubForm((prev) => ({ ...prev, back_color: e.target.value }))}
            />
            <Input
              label="前景色"
              placeholder="如 text-blue-800"
              value={subForm.fore_color}
              onChange={(e) => setSubForm((prev) => ({ ...prev, fore_color: e.target.value }))}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={subModal.onClose}>
              取消
            </Button>
            <Button color="primary" isLoading={actionLoading} onPress={handleSaveSub}>
              保存
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal isOpen={deleteModal.isOpen} onClose={deleteModal.onClose} size="sm">
        <ModalContent>
          <ModalHeader>确认删除</ModalHeader>
          <ModalBody>
            {deleteTarget && (
              <div className="space-y-2">
                <p className="text-sm">
                  确定要删除{" "}
                  {deleteTarget.type === "account" && "账户"}
                  {deleteTarget.type === "budget" && "预算计划"}
                  {deleteTarget.type === "main" && "主类别"}
                  {deleteTarget.type === "sub" && "子类别"}
                  {" "}
                  <span className="font-bold">
                    {deleteTarget.type === "account" && deleteTarget.data.name}
                    {deleteTarget.type === "budget" && deleteTarget.data.name}
                    {deleteTarget.type === "main" && deleteTarget.data.label}
                    {deleteTarget.type === "sub" && deleteTarget.data.label}
                  </span>
                  {" "}吗？
                </p>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={deleteModal.onClose}>
              取消
            </Button>
            <Button color="danger" isLoading={actionLoading} onPress={confirmDelete}>
              确认删除
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* FourChainSelector 测试组件 */}
      <Card>
        <CardHeader>
          <h3 className="text-lg font-semibold">FourChainSelector 组件测试</h3>
        </CardHeader>
        <CardBody className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ListBox模式测试 */}
            <div>
              <h4 className="text-md font-medium mb-4">ListBox 模式（桌面端）</h4>
              <FourChainSelector
                mode="listbox"
                onSelectionChange={setChainSelection}
              />
            </div>

            {/* Select模式测试 */}
            <div>
              <h4 className="text-md font-medium mb-4">Select 模式（移动端）</h4>
              <FourChainSelector
                mode="select"
                onSelectionChange={setChainSelection}
              />
            </div>
          </div>

          {/* 显示选择结果 */}
          {chainSelection && (
            <Card className="mt-6">
              <CardHeader>
                <h4 className="text-md font-medium">选择结果</h4>
              </CardHeader>
              <CardBody>
                <div className="space-y-2">
                  <p><strong>交易类型：</strong>{chainSelection.txType}</p>
                  <p><strong>主类别：</strong>{chainSelection.mainCategory.label}</p>
                  <p><strong>子类别：</strong>{chainSelection.subCategory.label}</p>
                  {chainSelection.budgetType && (
                    <p><strong>预算计划：</strong>{chainSelection.budgetType.name}</p>
                  )}
                </div>
              </CardBody>
            </Card>
          )}
        </CardBody>
      </Card>
    </div>
  );
}