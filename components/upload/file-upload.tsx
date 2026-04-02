"use client";

import React, { useCallback, useRef, useState } from "react";
import { DocumentArrowUpIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";
import { Button, Card, CardBody, CircularProgress } from "@heroui/react";

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  /** 应用数据拉取，展示正在加载 */
  isLoading?: boolean;
  /** 文件解析/导入处理，展示正在处理 */
  isProcessing?: boolean;
  /** 处理中时在「正在处理…」位置展示的详细说明 */
  processingMessage?: string;
  /** 展示错误状态（如应用数据加载失败） */
  isError?: boolean;
  errorMessage?: string;
  title?: string;
  description?: string;
  supportedFormats?: string;
  logo?: React.ReactNode;
}

export function FileUpload({
  onFileSelect,
  accept = ".xlsx,.xls",
  isLoading = false,
  isProcessing = false,
  processingMessage,
  isError = false,
  errorMessage = "",
  description = "拖拽文件到这里或点击选择文件",
  supportedFormats = "支持.xlsx和.xls格式",
  logo,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isBusy = isLoading || isProcessing;
  const isBlocked = isBusy || isError;

  const handleFileSelect = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];
      onFileSelect(file);
    },
    [onFileSelect],
  );

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      handleFileSelect(files);
    },
    [handleFileSelect],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      handleFileSelect(e.target.files);
    },
    [handleFileSelect],
  );

  const openFilePicker = useCallback(() => {
    if (!isBlocked) {
      inputRef.current?.click();
    }
  }, [isBlocked]);

  return (
    <Card>
      <CardBody>
        <div
          aria-disabled={isBlocked}
          aria-label={isError ? errorMessage || "加载失败" : description}
          className={`
            border border-dashed rounded-lg p-8 text-center transition-colors
            min-h-[280px] flex flex-col items-center justify-center
            ${
              isDragging
                ? "border-primary/50 bg-primary/10 cursor-pointer"
                : "border-gray-200 hover:border-primary/40 cursor-pointer"
            }
            ${isBlocked ? "pointer-events-none" : ""}
          `}
          role="button"
          tabIndex={isBlocked ? -1 : 0}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={openFilePicker}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              openFilePicker();
            }
          }}
        >
          <input
            accept={accept}
            className="hidden"
            disabled={isBlocked}
            ref={inputRef}
            type="file"
            onChange={handleInputChange}
          />

          {isBusy ? (
            <>
              <CircularProgress
                aria-label={isProcessing ? "正在处理" : "正在加载"}
                className="mb-4"
                color="primary"
                isIndeterminate
                showValueLabel={false}
                size="lg"
              />
              <p className="text-lg">{isProcessing ? "正在处理…" : "正在加载…"}</p>
              {isProcessing && processingMessage ? (
                <p className="text-sm text-default-500 mt-2 max-w-md mx-auto">
                  {processingMessage}
                </p>
              ) : null}
            </>
          ) : isError ? (
            <>
              <div className="mb-4">
                <ExclamationTriangleIcon aria-hidden className="w-16 h-16 text-danger" />
              </div>
              <p className="text-lg text-danger font-medium">加载失败</p>
              {errorMessage ? (
                <p className="text-sm text-danger/90 mt-2 max-w-md mx-auto">{errorMessage}</p>
              ) : null}
            </>
          ) : (
            <>
              <div className="mb-4">
                {logo || <DocumentArrowUpIcon aria-hidden className="w-16 h-16 text-gray-400" />}
              </div>
              <p className="text-lg mb-2">{description}</p>
              <p className="text-sm text-gray-500">{supportedFormats}</p>
              <Button color="primary" variant="ghost" className="mt-4" onPress={openFilePicker}>
                选择文件
              </Button>
            </>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
