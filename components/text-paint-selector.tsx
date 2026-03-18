"use client";

import { useState, useRef, useEffect } from "react";
import { Modal, ModalContent, ModalHeader, ModalBody, ModalFooter } from "@heroui/react";
import { Button } from "@heroui/react";
import { Input } from "@heroui/react";

interface TextPaintSelectorProps {
  isOpen: boolean;
  raw: string;
  result: string;
  onComplete: (result: string) => void;
  onCancel: () => void;
}

// 将字符串分割成tokens，连续数字作为一个token
function tokenize(text: string): string[] {
  const tokens: string[] = [];
  let i = 0;
  
  while (i < text.length) {
    const char = text[i];
    
    // 检查是否是数字
    if (/\d/.test(char)) {
      let numberStr = char;
      let j = i + 1;
      
      // 收集连续的数字
      while (j < text.length && /\d/.test(text[j])) {
        numberStr += text[j];
        j++;
      }
      
      tokens.push(numberStr);
      i = j;
    } else {
      tokens.push(char);
      i++;
    }
  }
  
  return tokens;
}

export function TextPaintSelector({ isOpen, raw, result, onComplete, onCancel }: TextPaintSelectorProps) {
  const [tokens, setTokens] = useState<string[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartIndex, setDragStartIndex] = useState<number | null>(null);
  const [dragEndIndex, setDragEndIndex] = useState<number | null>(null);
  const [isRemoveMode, setIsRemoveMode] = useState(false);
  const [resultText, setResultText] = useState(result);
  const [userEdited, setUserEdited] = useState(false);
  
  // 初始化tokens
  useEffect(() => {
    if (raw) {
      setTokens(tokenize(raw));
    }
  }, [raw]);
  
  // 当Modal打开或raw变化时，重置所有状态
  useEffect(() => {
    if (isOpen) {
      // 重置所有涂抹相关状态
      setSelectedIndices(new Set());
      setIsDragging(false);
      setDragStartIndex(null);
      setDragEndIndex(null);
      setIsRemoveMode(false);
      setResultText(result);
      setUserEdited(false);
    }
  }, [isOpen, raw, result]);
  
  // 当选择的tokens变化时，更新result（只有在实际选择了内容时才更新）
  useEffect(() => {
    if (selectedIndices.size > 0) {
      const selected = Array.from(selectedIndices)
        .sort((a, b) => a - b)
        .map(i => tokens[i])
        .join('');
      setResultText(selected);
      setUserEdited(false); // 涂抹会覆盖之前的编辑
    }
  }, [selectedIndices, tokens]);
  
  const handleMouseDown = (index: number) => {
    setIsDragging(true);
    setDragStartIndex(index);
    setDragEndIndex(index);
    
    // 判断是添加模式还是移除模式
    // 如果点击的是已选中的，则进入移除模式
    setIsRemoveMode(selectedIndices.has(index));
  };
  
  const handleMouseEnter = (index: number) => {
    if (isDragging && dragStartIndex !== null) {
      setDragEndIndex(index);
    }
  };
  
  const handleMouseUp = () => {
    if (isDragging && dragStartIndex !== null && dragEndIndex !== null) {
      // 确定选择范围：从开始到结束的所有索引
      const start = Math.min(dragStartIndex, dragEndIndex);
      const end = Math.max(dragStartIndex, dragEndIndex);
      
      const newSelectedIndices = new Set(selectedIndices);
      
      // 根据模式添加或移除
      for (let i = start; i <= end; i++) {
        if (isRemoveMode) {
          newSelectedIndices.delete(i);
        } else {
          newSelectedIndices.add(i);
        }
      }
      
      setSelectedIndices(newSelectedIndices);
    }
    
    setIsDragging(false);
    setDragStartIndex(null);
    setDragEndIndex(null);
    setIsRemoveMode(false);
  };
  
  // 添加全局鼠标抬起监听
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging && dragStartIndex !== null && dragEndIndex !== null) {
        // 确定选择范围：从开始到结束的所有索引
        const start = Math.min(dragStartIndex, dragEndIndex);
        const end = Math.max(dragStartIndex, dragEndIndex);
        
        setSelectedIndices(prev => {
          const newSelectedIndices = new Set(prev);
          
          // 根据模式添加或移除
          for (let i = start; i <= end; i++) {
            if (isRemoveMode) {
              newSelectedIndices.delete(i);
            } else {
              newSelectedIndices.add(i);
            }
          }
          
          return newSelectedIndices;
        });
      }
      
      setIsDragging(false);
      setDragStartIndex(null);
      setDragEndIndex(null);
      setIsRemoveMode(false);
    };
    
    if (isDragging) {
      window.addEventListener('mouseup', handleGlobalMouseUp);
      return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }
  }, [isDragging, dragStartIndex, dragEndIndex, isRemoveMode]);
  
  // 获取当前拖动预览的索引集合
  const getPreviewIndices = () => {
    if (!isDragging || dragStartIndex === null || dragEndIndex === null) {
      return selectedIndices;
    }
    
    const start = Math.min(dragStartIndex, dragEndIndex);
    const end = Math.max(dragStartIndex, dragEndIndex);
    
    const preview = new Set(selectedIndices);
    
    for (let i = start; i <= end; i++) {
      if (isRemoveMode) {
        preview.delete(i);
      } else {
        preview.add(i);
      }
    }
    
    return preview;
  };
  
  const previewIndices = getPreviewIndices();
  
  const handleResultChange = (value: string) => {
    setResultText(value);
    setUserEdited(true);
  };
  
  const handleComplete = () => {
    onComplete(resultText);
  };
  
  const handleCancel = () => {
    onCancel();
  };
  
  // 重置选择
  const handleReset = () => {
    setSelectedIndices(new Set());
    setResultText("");
    setUserEdited(false);
  };
  
  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleCancel}
      size="3xl"
      scrollBehavior="inside"
      closeButton
    >
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          涂抹选择文字
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            {/* 提示文字 */}
            <p className="text-sm text-gray-600 dark:text-gray-400">
              按住鼠标左键并拖动来选择文字。
            </p>
            
            {/* 文字方格区域 */}
            <div 
              className="flex flex-wrap gap-1 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 select-none"
              onMouseLeave={handleMouseUp}
            >
              {tokens.map((token, index) => {
                const isSelected = previewIndices.has(index);
                const isSpace = token === ' ';
                const isNewline = token === '\n';
                
                if (isNewline) {
                  return <div key={index} className="w-full h-0" />;
                }
                
                if (isSpace) {
                  return (
                    <div
                      key={index}
                      className="inline-block w-2"
                    />
                  );
                }
                
                return (
                  <div
                    key={index}
                    className={`
                      inline-flex items-center justify-center px-2 py-1 rounded cursor-pointer
                      transition-colors duration-100
                      ${isSelected 
                        ? 'bg-blue-500 text-white' 
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
                      }
                    `}
                    onMouseDown={() => handleMouseDown(index)}
                    onMouseEnter={() => handleMouseEnter(index)}
                    onMouseUp={handleMouseUp}
                  >
                    <span className="text-sm">{token}</span>
                  </div>
                );
              })}
            </div>
            
            {/* 结果文本框 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  选中的文字
                </label>
                <Button
                  size="sm"
                  variant="flat"
                  color="warning"
                  onPress={handleReset}
                >
                  清空
                </Button>
              </div>
              <Input
                value={resultText}
                onValueChange={handleResultChange}
                placeholder="涂抹选择或直接输入文字..."
                variant="bordered"
                size="lg"
                classNames={{
                  input: "text-base"
                }}
              />
              {userEdited && (
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  注意：重新涂抹文字会覆盖当前编辑的内容
                </p>
              )}
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button 
            color="default" 
            variant="flat" 
            onPress={handleCancel}
          >
            取消
          </Button>
          <Button 
            color="primary" 
            onPress={handleComplete}
          >
            完成
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
