"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
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

export function TextPaintSelector({
  isOpen,
  raw,
  result,
  onComplete,
  onCancel,
}: TextPaintSelectorProps) {
  const resultInputId = useId();
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
        .map((i) => tokens[i])
        .join("");
      setResultText(selected);
      setUserEdited(false); // 涂抹会覆盖之前的编辑
    }
  }, [selectedIndices, tokens]);

  const dragRef = useRef({
    isDragging: false,
    startIndex: null as number | null,
    endIndex: null as number | null,
    isRemoveMode: false,
  });
  const paintAreaRef = useRef<HTMLDivElement>(null);

  const commitDrag = useCallback(() => {
    const { isDragging: d, startIndex, endIndex, isRemoveMode: rm } = dragRef.current;
    if (d && startIndex !== null && endIndex !== null) {
      const lo = Math.min(startIndex, endIndex);
      const hi = Math.max(startIndex, endIndex);
      setSelectedIndices((prev) => {
        const next = new Set(prev);
        for (let i = lo; i <= hi; i++) {
          if (rm) next.delete(i);
          else next.add(i);
        }
        return next;
      });
    }
    dragRef.current = { isDragging: false, startIndex: null, endIndex: null, isRemoveMode: false };
    setIsDragging(false);
    setDragStartIndex(null);
    setDragEndIndex(null);
    setIsRemoveMode(false);
  }, []);

  const startDrag = useCallback(
    (index: number) => {
      const rm = selectedIndices.has(index);
      dragRef.current = { isDragging: true, startIndex: index, endIndex: index, isRemoveMode: rm };
      setIsDragging(true);
      setDragStartIndex(index);
      setDragEndIndex(index);
      setIsRemoveMode(rm);
    },
    [selectedIndices],
  );

  const moveDrag = useCallback((index: number) => {
    if (dragRef.current.isDragging && dragRef.current.startIndex !== null) {
      dragRef.current.endIndex = index;
      setDragEndIndex(index);
    }
  }, []);

  const handleMouseDown = (index: number) => startDrag(index);
  const handleMouseEnter = (index: number) => moveDrag(index);
  const handleMouseUp = () => commitDrag();

  const getIndexFromPoint = useCallback((x: number, y: number): number | null => {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const btn = (el as HTMLElement).closest("[data-token-index]") as HTMLElement | null;
    if (!btn) return null;
    const idx = parseInt(btn.dataset.tokenIndex!, 10);
    return isNaN(idx) ? null : idx;
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      const idx = getIndexFromPoint(touch.clientX, touch.clientY);
      if (idx !== null) {
        e.preventDefault();
        startDrag(idx);
      }
    },
    [getIndexFromPoint, startDrag],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!dragRef.current.isDragging) return;
      e.preventDefault();
      const touch = e.touches[0];
      const idx = getIndexFromPoint(touch.clientX, touch.clientY);
      if (idx !== null) {
        moveDrag(idx);
      }
    },
    [getIndexFromPoint, moveDrag],
  );

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      commitDrag();
    },
    [commitDrag],
  );

  // 全局 mouseup / touchend 兜底
  useEffect(() => {
    if (!isDragging) return;
    const onEnd = () => commitDrag();
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchend", onEnd);
    };
  }, [isDragging, commitDrag]);

  // 涂抹区域内禁止 touchmove 的被动滚动，使 preventDefault 生效
  useEffect(() => {
    const el = paintAreaRef.current;
    if (!el) return;
    const preventScroll = (e: TouchEvent) => {
      if (dragRef.current.isDragging) e.preventDefault();
    };
    el.addEventListener("touchmove", preventScroll, { passive: false });
    return () => el.removeEventListener("touchmove", preventScroll);
  }, []);

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
    <Modal isOpen={isOpen} onClose={handleCancel} size="3xl" scrollBehavior="inside" closeButton>
      <ModalContent
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            handleComplete();
          }
        }}
      >
        <ModalHeader className="flex flex-col gap-1">涂抹选择文字</ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            {/* 提示文字 */}
            <p className="text-sm text-gray-600 dark:text-gray-400">按住并拖动来涂抹选择文字。</p>

            {/* 文字方格区域 */}
            <div
              ref={paintAreaRef}
              className="flex flex-wrap gap-1 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 select-none touch-none"
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {tokens.map((token, index) => {
                const isSelected = previewIndices.has(index);
                const isSpace = token === " ";
                const isNewline = token === "\n";

                if (isNewline) {
                  return <div key={index} className="w-full h-0" />;
                }

                if (isSpace) {
                  return <div key={index} className="inline-block w-2" />;
                }

                return (
                  <button
                    aria-pressed={isSelected}
                    key={index}
                    data-token-index={index}
                    className={`
                      inline-flex items-center justify-center px-2 py-1 rounded cursor-pointer
                      transition-colors duration-100
                      ${
                        isSelected
                          ? "bg-blue-500 text-white"
                          : "bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600"
                      }
                    `}
                    type="button"
                    onMouseDown={() => handleMouseDown(index)}
                    onMouseEnter={() => handleMouseEnter(index)}
                    onMouseUp={handleMouseUp}
                  >
                    <span className="text-sm">{token}</span>
                  </button>
                );
              })}
            </div>

            {/* 结果文本框 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label
                  className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  htmlFor={resultInputId}
                >
                  选中的文字
                </label>
                <Button size="sm" variant="flat" color="warning" onPress={handleReset}>
                  清空
                </Button>
              </div>
              <Input
                id={resultInputId}
                value={resultText}
                onValueChange={handleResultChange}
                placeholder="涂抹选择或直接输入文字..."
                variant="bordered"
                size="lg"
                classNames={{
                  input: "text-base",
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
          <Button color="default" variant="flat" onPress={handleCancel}>
            取消
          </Button>
          <Button color="primary" onPress={handleComplete}>
            完成
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
