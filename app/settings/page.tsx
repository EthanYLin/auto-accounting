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
    icon: "📂",
    back_color: "#EEF2FF",
    fore_color: "#111827",
  });
  const mainModal = useDisclosure();

  // 子类别
  const [subForm, setSubForm] = useState<SubCategoryForm>({
    label: "",
    main_category_id: "",
    budget_type_id: null,
    icon: "📌",
    back_color: "#F8FAFC",
    fore_color: "#0F172A",
  });
  const subModal = useDisclosure();

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

  const resetFeedback = () => {
    setActionError(null);
    setActionSuccess(null);
  };

  const runAction = async (
    fn: () => Promise<{ success: boolean; error?: string }>,
    successMsg: string,
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
    await loadData();
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
    );
    accountModal.onClose();
  };

  const handleDeleteAccount = async (account: Account) => {
    await runAction(() => deleteAccount(account.id), "账户已删除");
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
    );
    budgetModal.onClose();
  };

  const handleDeleteBudget = async (budget: BudgetType) => {
    await runAction(() => deleteBudgetType(budget.id), "预算计划已删除");
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
        icon: "📂",
        back_color: "#EEF2FF",
        fore_color: "#111827",
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
    );
    mainModal.onClose();
  };

  const handleDeleteMain = async (item: MainCategory) => {
    await runAction(() => deleteMainCategory(item.id), "主类别已删除");
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
        icon: "📌",
        back_color: "#F8FAFC",
        fore_color: "#0F172A",
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
      back_color: subForm.back_color || "#F8FAFC",
      fore_color: subForm.fore_color || "#0F172A",
    };

    await runAction(
      () =>
        subForm.id
          ? updateSubCategory(subForm.id, payload)
          : createSubCategory(payload),
      subForm.id ? "子类别已更新" : "子类别已创建",
    );
    subModal.onClose();
  };

  const handleDeleteSub = async (item: SubCategory) => {
    await runAction(() => deleteSubCategory(item.id), "子类别已删除");
  };

  const isBusy = isLoading || actionLoading;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">配置中心</h1>
          <p className="text-sm text-default-500 mt-1">
            维护账户、主/子类别与预算计划，支撑记账录入。
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Chip variant="flat">账户 {accounts.length}</Chip>
            <Chip variant="flat">主类别 {mainCategories.length}</Chip>
            <Chip variant="flat">子类别 {subCategories.length}</Chip>
            <Chip variant="flat">预算计划 {budgetTypes.length}</Chip>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {loadError && <Chip color="danger" variant="flat">{loadError}</Chip>}
          <Button
            variant="flat"
            isLoading={isBusy}
            onClick={() => {
              resetFeedback();
              void loadData();
            }}
          >
            重新加载
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
                <p className="text-sm text-default-500">用于交易记录的资金来源/去向</p>
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
                <p className="text-sm text-default-500">为分类关联预算约束</p>
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
                <p className="text-sm text-default-500">一级分类，绑定交易类型</p>
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
                    <TableColumn>颜色</TableColumn>
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
                          <div className="flex items-center gap-2">
                            <span
                              className="h-4 w-4 rounded"
                              style={{ backgroundColor: item.back_color }}
                            />
                            <span
                              className="h-4 w-4 rounded border"
                              style={{ backgroundColor: item.fore_color }}
                            />
                          </div>
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
            <CardHeader className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">子类别</h3>
                <p className="text-sm text-default-500">
                  二级分类，可选绑定预算计划
                </p>
              </div>
              <Button color="primary" onPress={() => openSubModal()}>
                新增子类别
              </Button>
            </CardHeader>
            <Divider />
            <CardBody>
              {isBusy ? (
                <div className="py-8 flex justify-center">
                  <Spinner label="加载中..." />
                </div>
              ) : subCategories.length === 0 ? (
                <div className="py-8 text-center text-default-500">
                  暂无子类别，点击“新增子类别”开始添加。
                </div>
              ) : (
                <Table aria-label="子类别列表" removeWrapper>
                  <TableHeader>
                    <TableColumn>ID</TableColumn>
                    <TableColumn>名称</TableColumn>
                    <TableColumn>所属主类别</TableColumn>
                    <TableColumn>预算计划</TableColumn>
                    <TableColumn>图标</TableColumn>
                    <TableColumn>颜色</TableColumn>
                    <TableColumn align="end">操作</TableColumn>
                  </TableHeader>
                  <TableBody items={subCategories}>
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
                          <div className="flex items-center gap-2">
                            <span
                              className="h-4 w-4 rounded"
                              style={{ backgroundColor: item.back_color }}
                            />
                            <span
                              className="h-4 w-4 rounded border"
                              style={{ backgroundColor: item.fore_color }}
                            />
                          </div>
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
              placeholder="如 月度生活费"
              value={budgetName}
              onChange={(e) => setBudgetName(e.target.value)}
            />
            <Input
              label="预算计划图标"
              placeholder="可输入 Emoji 或短文本"
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
              placeholder="如 餐饮"
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
              placeholder="可输入 Emoji 或短文本"
              value={mainForm.icon}
              onChange={(e) => setMainForm((prev) => ({ ...prev, icon: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="color"
                label="背景色"
                value={mainForm.back_color}
                onChange={(e) => setMainForm((prev) => ({ ...prev, back_color: e.target.value }))}
              />
              <Input
                type="color"
                label="前景色"
                value={mainForm.fore_color}
                onChange={(e) => setMainForm((prev) => ({ ...prev, fore_color: e.target.value }))}
              />
            </div>
            <Textarea
              isReadOnly
              label="说明"
              value="主类别与交易类型绑定，便于后续录入时过滤；色彩用于 UI 展示。"
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
                <SelectItem key={item.id}>
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
              placeholder="可输入 Emoji 或短文本"
              value={subForm.icon}
              onChange={(e) => setSubForm((prev) => ({ ...prev, icon: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="color"
                label="背景色"
                value={subForm.back_color}
                onChange={(e) => setSubForm((prev) => ({ ...prev, back_color: e.target.value }))}
              />
              <Input
                type="color"
                label="前景色"
                value={subForm.fore_color}
                onChange={(e) => setSubForm((prev) => ({ ...prev, fore_color: e.target.value }))}
              />
            </div>
            <Textarea
              isReadOnly
              label="说明"
              value="子类别继承主类别的交易类型，可选择关联预算计划以便后续控制支出。"
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
    </div>
  );
}

