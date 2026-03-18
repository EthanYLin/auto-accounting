"use client";

import React, { useState, useCallback } from 'react';
import { Card, CardBody } from '@heroui/react';
import { Button } from '@heroui/react';
import { Spinner } from '@heroui/react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
  isLoading?: boolean;
  title?: string;
  description?: string;
  supportedFormats?: string;
  logo?: React.ReactNode;
}

export function FileUpload({
  onFileSelect,
  accept = ".xlsx,.xls",
  isLoading = false,
  description = "拖拽文件到这里或点击选择文件",
  supportedFormats = "支持.xlsx和.xls格式",
  logo
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    onFileSelect(file);
  }, [onFileSelect]);

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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    handleFileSelect(files);
  }, [handleFileSelect]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  }, [handleFileSelect]);

  return (
    <Card>
      <CardBody>
        <div
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
            min-h-[280px] flex flex-col items-center justify-center
            ${isDragging 
              ? 'border-primary bg-primary/10' 
              : 'border-gray-300 hover:border-primary/50'
            }
            ${isLoading ? 'pointer-events-none opacity-50' : ''}
          `}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => !isLoading && document.getElementById('file-input')?.click()}
        >
          <input
            id="file-input"
            type="file"
            accept={accept}
            onChange={handleInputChange}
            className="hidden"
            disabled={isLoading}
          />
          
          {isLoading ? (
            <>
              <Spinner size="lg" className="mb-4" />
              <p className="text-lg">正在处理文件...</p>
            </>
          ) : (
            <>
              <div className="mb-4">
                {logo || <FileIcon />}
              </div>
              <p className="text-lg mb-2">{description}</p>
              <p className="text-sm text-gray-500">{supportedFormats}</p>
              <Button 
                color="primary" 
                variant="ghost" 
                className="mt-4"
                onPress={() => {
                  document.getElementById('file-input')?.click();
                }}
              >
                选择文件
              </Button>
            </>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

const FileIcon = () => {
  return (
    <svg
      className="w-16 h-16 text-gray-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
};
