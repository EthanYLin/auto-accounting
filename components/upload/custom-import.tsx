"use client";

import type { CustomImportTx } from "@/lib/custom-import/types";

import React, { useState } from "react";
import {
  Accordion,
  AccordionItem,
  Button,
  Divider,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Snippet,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Textarea,
  addToast,
} from "@heroui/react";
import {
  ArrowDownTrayIcon,
  CheckIcon,
  InformationCircleIcon,
  SparklesIcon,
  TrashIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

import { useAppData } from "@/components/context/app-data-context";
import { useTransactionImport } from "@/lib/hooks/use-transaction-import";
import { parseFromString, toNewTransactionData } from "@/lib/custom-import/types";
import { displayTxTime } from "@/lib/transaction/transaction-datetime";

const PROMPT_TEMPLATE = `请将我提供的截图、文本或交易记录转换为 JSON 数组。

输出要求：
- 请将最终答案放在 markdown 的 \`\`\`json 代码块中
- 不要输出解释、注释或多余文字
- 每个元素都必须符合下面的 JSON 结构
- JSON 中必须使用半角符号，如冒号: 逗号, 双引号" 等

JSON Schema:
{
  "type": "array",
  "items": {
    "type": "object",
    "required": ["datetime", "amount"],
    "properties": {
      "datetime": {
        "type": "string",
        "description": "交易日期时间，格式必须为 2024-01-01T12:00:00"
      },
      "amount": {
        "type": "number",
        "description": "金额，正数表示收入，负数表示支出，单位为元"
      },
      "name": {
        "type": ["string", "null"],
        "description": "交易名称，如果记录中没有明确的名称信息，请填 null"
      },
      "merchant": {
        "type": ["string", "null"],
        "description": "商户，如果记录中没有明确的商户信息，请填 null"
      },
      "title": {
        "type": ["string", "null"],
        "description": "导入描述，记录中如果有任何可以作为描述的信息（例如小票上的备注、交易的附加信息等），请尽量提取并填入 title 字段；如果没有相关信息，请填 null"
      },
      "raw_info": {
        "type": ["object", "array", "string", "number", "boolean", "null"],
        "description": "记录中包含的其余补充信息，以键值对形式呈现。除非确有补充，否则一般情况下填写 null。"
      }
    },
    "additionalProperties": false
  }
}

转换规则：
1. datetime 必须统一转换为不带时区的 ISO 格式，例如 "2024-01-01T12:00:00"
2. amount 必须为数字，不带货币符号
3. 收入记为正数，支出记为负数
4. 无法确定的可选字段请填 null
5. 不要编造不存在的信息
6. 如果某条记录关键信息严重缺失，无法判断 datetime 或 amount，则不要输出该条记录

输出示例：
[
  {
    "datetime": "2024-01-01T12:00:00",
    "amount": -23.5,
    "name": "午餐",
    "merchant": "麦当劳",
    "title": "午餐消费-麦当劳-SH MCDONALDS",
    "raw_info": {
      "merchant_transaction_id": "28923874927420982471039"
    }
  }
]
`;

interface ParsedRow {
  id: string;
  batchId: number;
  data: CustomImportTx;
}

export function CustomImport() {
  const { accounts } = useAppData();
  const { createTransactions } = useTransactionImport();
  const [isErrorModalOpen, setIsErrorModalOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [customSource, setCustomSource] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [isImportSuccess, setIsImportSuccess] = useState(false);
  const [lastParseCount, setLastParseCount] = useState(0);
  const [lastParseSuccess, setLastParseSuccess] = useState(0);
  const [lastParseMessage, setLastParseMessage] = useState<string | null>(null);
  const [lastBatchId, setLastBatchId] = useState<number | null>(null);
  const [didUndoLastBatch, setDidUndoLastBatch] = useState(false);
  const hasParsed = lastParseCount > 0 || lastParseMessage != null;
  const hasErrors = !!lastParseMessage;
  const isParseFailed = hasParsed && lastParseSuccess === 0;

  const handleClearInput = () => {
    setInputText("");
  };

  const handleRemoveRow = (id: string) => {
    setRows((prev) => prev.filter((row) => row.id !== id));
  };

  const handleClearRows = () => {
    setRows([]);
    setLastBatchId(null);
    setDidUndoLastBatch(false);
    setIsImportSuccess(false);
  };

  const handleImport = async () => {
    if (!selectedAccountId) {
      addToast({ title: "请选择账户", color: "warning" });
      return;
    }

    if (rows.length === 0) {
      addToast({ title: "没有可导入的记录", color: "warning" });
      return;
    }

    const account = accounts.find((item) => item.id.toString() === selectedAccountId);
    if (!account) {
      addToast({ title: "账户不存在，请重新选择", color: "danger" });
      return;
    }

    setIsImporting(true);
    try {
      const newTransactions = rows.map((row) =>
        toNewTransactionData(row.data, account, customSource),
      );
      const result = await createTransactions(newTransactions);
      if (!result.success) {
        addToast({ title: "导入失败", description: result.error, color: "danger" });
        return;
      }

      addToast({ title: `成功导入 ${rows.length} 条记录`, color: "success" });
      setRows([]);
      setInputText("");
      setIsImportSuccess(true);
      setLastParseCount(0);
      setLastParseSuccess(0);
      setLastParseMessage(null);
      setLastBatchId(null);
      setDidUndoLastBatch(false);
    } finally {
      setIsImporting(false);
    }
  };

  const handleUndoLastBatch = () => {
    if (lastBatchId == null) return;
    setRows((prev) => prev.filter((row) => row.batchId !== lastBatchId));
    setLastBatchId(null);
    setDidUndoLastBatch(true);
    setIsImportSuccess(false);
    setIsErrorModalOpen(false);
  };

  const handleParseAndAppend = () => {
    if (!inputText.trim()) {
      addToast({ title: "请先粘贴 JSON", color: "warning" });
      return;
    }

    const parsed = parseFromString(inputText);
    const batchId = Date.now();

    setDidUndoLastBatch(false);
    setIsImportSuccess(false);
    setLastParseCount(parsed.count);
    setLastParseSuccess(parsed.success);
    setLastParseMessage(parsed.message ?? null);
    setLastBatchId(parsed.success > 0 ? batchId : null);

    if (parsed.result.length > 0) {
      const nextRows: ParsedRow[] = parsed.result.map((item, index) => ({
        id: `${batchId}-${index}`,
        batchId,
        data: item,
      }));
      setRows((prev) => [...prev, ...nextRows]);
    }

    if (parsed.message) {
      setIsErrorModalOpen(true);
    }
  };

  return (
    <div className="space-y-0">
      <div className="grid gap-4 sm:grid-cols-[48px_minmax(0,1fr)] sm:gap-5">
        <div className="hidden sm:flex flex-col items-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-default-100 text-xl font-semibold text-default-600">
            1
          </div>
          <div className="mt-2 w-px flex-1 bg-default-200" />
        </div>

        <section className="overflow-hidden rounded-large border border-default-200 bg-content1">
          <div className="flex flex-col gap-4 border-b border-default-100 bg-default-50/60 px-5 py-5 sm:px-6">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 text-xs font-medium text-default-600">
                  <SparklesIcon className="h-4 w-4" />
                  自定义导入
                </div>
                <div className="space-y-1">
                  <h2 className="text-base font-semibold text-foreground">
                    导入 JSON 格式的交易记录
                  </h2>
                  <p className="max-w-2xl text-sm leading-6 text-default-600">
                    将原始账单、小票或截图发送给大模型，要求其转为结构化
                    JSON，再粘贴在此处进行导入。
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="px-5 py-5 sm:px-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-1">
                将提示词及交易记录发送给大模型
              </h3>
              <p className="mb-3 text-xs text-default-500">
                复制以下提示词，连同原始交易记录/截图发送给大模型。
              </p>
              <Snippet
                className="mt-4 w-full rounded-large border border-default-200 bg-default-50 p-0"
                classNames={{
                  base: "w-full",
                  content: "w-full",
                  pre: "max-h-36 w-full overflow-auto whitespace-pre-wrap break-words px-4 py-4 font-mono text-[11px] leading-3 text-default-700",
                }}
                codeString={PROMPT_TEMPLATE}
                symbol=""
              >
                {PROMPT_TEMPLATE}
              </Snippet>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-4 pt-4 sm:grid-cols-[48px_minmax(0,1fr)] sm:gap-5 sm:pt-5">
        <div className="hidden sm:flex flex-col items-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-default-100 text-xl font-semibold text-default-600">
            2
          </div>
          <div className="mt-2 w-px flex-1 bg-default-200" />
        </div>

        <section className="overflow-hidden rounded-large border border-default-200 bg-content1">
          <div className="p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-foreground">粘贴结果</h3>
            </div>
            <p className="mb-3 text-xs text-default-500">将大模型返回的JSON 粘贴到这里</p>

            <Textarea
              minRows={5}
              placeholder="在此处粘贴大模型返回的结果"
              radius="lg"
              variant="bordered"
              value={inputText}
              onValueChange={setInputText}
              classNames={{
                input: "font-mono text-xs leading-3",
                inputWrapper:
                  "border-default-200 bg-content1 shadow-none data-[hover=true]:border-default-300",
              }}
            />

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                {hasParsed ? (
                  <>
                    {isParseFailed ? (
                      <XMarkIcon className="h-4 w-4 text-danger" />
                    ) : (
                      <CheckIcon className="h-4 w-4 text-primary" />
                    )}
                    <p
                      className={`text-xs font-semibold ${isParseFailed ? "text-danger" : "text-primary"}`}
                    >
                      {didUndoLastBatch
                        ? "已撤销本次导入"
                        : `成功导入 ${lastParseSuccess}/${lastParseCount} 条记录`}
                    </p>
                    {!didUndoLastBatch && hasErrors ? (
                      <Button
                        isIconOnly
                        aria-label="查看错误信息"
                        color="danger"
                        size="sm"
                        variant="light"
                        className="h-6 min-h-6 w-6 min-w-6"
                        onPress={() => setIsErrorModalOpen(true)}
                      >
                        <InformationCircleIcon className="h-4 w-4" />
                      </Button>
                    ) : !didUndoLastBatch ? (
                      lastBatchId !== null && (
                        <Button
                          size="sm"
                          variant="light"
                          className="h-6 min-h-6 px-2 text-xs"
                          onPress={handleUndoLastBatch}
                        >
                          撤销
                        </Button>
                      )
                    ) : null}
                  </>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="light" onPress={handleClearInput}>
                  清空文本框
                </Button>
                <Button color="primary" size="sm" onPress={handleParseAndAppend}>
                  {rows.length > 0 ? "解析并追加" : "解析"}
                </Button>
              </div>
            </div>

            <Divider className="mt-4" />

            <div className="mt-2">
              <Accordion
                itemClasses={{
                  title: "text-sm font-medium text-foreground",
                  subtitle: "text-xs text-default-500",
                }}
              >
                <AccordionItem
                  key="parsed-records"
                  aria-label="解析结果记录"
                  title={`共 ${rows.length} 条记录`}
                  subtitle="展开查看明细"
                >
                  <div className="overflow-x-auto rounded-large border border-default-200">
                    <Table
                      aria-label="自定义导入解析结果"
                      removeWrapper
                      classNames={{
                        th: "bg-default-50 text-[11px] font-medium text-default-600",
                        td: "py-1 align-middle text-xs",
                      }}
                    >
                      <TableHeader>
                        <TableColumn>交易时间</TableColumn>
                        <TableColumn>金额</TableColumn>
                        <TableColumn>名称</TableColumn>
                        <TableColumn>商户</TableColumn>
                        <TableColumn>描述</TableColumn>
                        <TableColumn className="w-[92px] text-right">操作</TableColumn>
                      </TableHeader>
                      <TableBody emptyContent="暂无解析结果">
                        {rows.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="whitespace-nowrap text-default-700">
                              {displayTxTime(row.data.datetime, "full")}
                            </TableCell>
                            <TableCell className="whitespace-nowrap font-medium text-foreground">
                              {row.data.amount > 0 ? "+" : ""}
                              {row.data.amount.toFixed(2)}
                            </TableCell>
                            <TableCell>{row.data.name || "—"}</TableCell>
                            <TableCell>{row.data.merchant || "—"}</TableCell>
                            <TableCell className="max-w-[360px] text-default-500">
                              {row.data.title || "—"}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end">
                                <Button
                                  isIconOnly
                                  aria-label="删除该行"
                                  size="sm"
                                  variant="light"
                                  color="danger"
                                  onPress={() => handleRemoveRow(row.id)}
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button color="danger" size="sm" variant="light" onPress={handleClearRows}>
                      清空
                    </Button>
                  </div>
                </AccordionItem>
              </Accordion>
            </div>
          </div>
        </section>
      </div>

      <div className="grid gap-4 pt-4 sm:grid-cols-[48px_minmax(0,1fr)] sm:gap-5 sm:pt-5">
        <div className="hidden sm:flex flex-col items-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-default-100 text-xl font-semibold text-default-600">
            3
          </div>
        </div>

        <section className="overflow-hidden rounded-large border border-default-200 bg-content1">
          <div className="space-y-4 px-5 py-5 sm:px-6">
            <div>
              <h3 className="text-sm font-semibold text-foreground">导入设置</h3>
              <p className="mt-1 text-xs text-default-500">选择目标账户并补充来源信息。</p>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Select
                  label="账户"
                  labelPlacement="outside"
                  placeholder="请选择账户"
                  size="sm"
                  variant="underlined"
                  selectedKeys={selectedAccountId ? [selectedAccountId] : []}
                  onSelectionChange={(keys) => {
                    const next = Array.from(keys)[0];
                    setSelectedAccountId(typeof next === "string" ? next : null);
                  }}
                >
                  {accounts.map((account) => (
                    <SelectItem key={account.id.toString()}>{account.name}</SelectItem>
                  ))}
                </Select>

                <Input
                  label="导入来源(选填)"
                  labelPlacement="outside"
                  placeholder="如：中国银行截图"
                  size="sm"
                  variant="underlined"
                  value={customSource}
                  onValueChange={setCustomSource}
                />
              </div>

              <div className="flex justify-end">
                {isImportSuccess ? (
                  <div className="inline-flex min-w-32 items-center justify-center gap-2 rounded-large bg-success-50 px-4 py-2.5 text-sm font-semibold text-success">
                    <CheckIcon className="h-5 w-5" />
                    导入成功
                  </div>
                ) : (
                  <Button
                    color="primary"
                    size="sm"
                    className="min-w-32 h-10 px-4"
                    startContent={!isImporting && <ArrowDownTrayIcon className="h-4 w-4" />}
                    isLoading={isImporting}
                    onPress={() => void handleImport()}
                  >
                    确认导入
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      <Modal
        isOpen={isErrorModalOpen}
        scrollBehavior="inside"
        size="2xl"
        onOpenChange={setIsErrorModalOpen}
      >
        <ModalContent>
          <ModalHeader>
            已导入{lastParseSuccess}/{lastParseCount}条记录
          </ModalHeader>
          <ModalBody className="max-h-[70vh] pb-6">
            <div className="overflow-auto rounded-large border border-default-200 bg-default-50">
              <pre className="whitespace-pre-wrap break-words px-4 py-4 font-mono text-xs leading-6 text-default-700">
                {lastParseMessage ?? "暂无错误信息"}
              </pre>
            </div>
          </ModalBody>
          <ModalFooter>
            {lastBatchId !== null && (
              <Button color="danger" size="sm" variant="light" onPress={handleUndoLastBatch}>
                撤销本次导入
              </Button>
            )}
            <Button size="sm" variant="light" onPress={() => setIsErrorModalOpen(false)}>
              关闭
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
