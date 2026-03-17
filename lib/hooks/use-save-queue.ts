'use client';

import { useCallback, useRef, useState } from 'react';

export type TransactionSaveState = 'idle' | 'single-save' | 'children-selection';

export type SaveQueueResult = { success: boolean; error?: string };

type SaveQueueTask = {
  run: () => Promise<SaveQueueResult>;
  resolve: (result: SaveQueueResult) => void;
};

const SAVE_BUSY_ERROR = '当前有保存操作进行中';
const QUEUED_SAVE_CANCELLED_ERROR = '前序保存失败，后续排队保存已取消，请检查后重试';

export function useSaveQueue() {
  const [saveState, setSaveState] = useState<TransactionSaveState>('idle');
  const saveStateRef = useRef<TransactionSaveState>('idle');
  const saveQueueRef = useRef<SaveQueueTask[]>([]);
  const isProcessingSaveQueueRef = useRef(false);

  const setCurrentSaveState = useCallback((next: TransactionSaveState) => {
    saveStateRef.current = next;
    setSaveState(next);
  }, []);

  const process = useCallback(() => {
    if (isProcessingSaveQueueRef.current || saveStateRef.current === 'children-selection') return;
    if (saveQueueRef.current.length === 0) {
      if (saveStateRef.current === 'single-save') setCurrentSaveState('idle');
      return;
    }

    isProcessingSaveQueueRef.current = true;
    if (saveStateRef.current !== 'single-save') setCurrentSaveState('single-save');

    void (async () => {
      try {
        while (saveQueueRef.current.length > 0) {
          const task = saveQueueRef.current[0];
          let result: SaveQueueResult;
          try {
            result = await task.run();
          } catch (error) {
            console.error('保存任务执行失败:', error);
            result = { success: false, error: error instanceof Error ? error.message : '保存任务失败' };
          }
          saveQueueRef.current.shift();
          task.resolve(result);

          if (!result.success) {
            const cancelledTasks = saveQueueRef.current.splice(0);
            for (const cancelledTask of cancelledTasks) {
              cancelledTask.resolve({ success: false, error: QUEUED_SAVE_CANCELLED_ERROR });
            }
            break;
          }
        }
      } finally {
        isProcessingSaveQueueRef.current = false;
        if (saveStateRef.current === 'single-save') setCurrentSaveState('idle');
      }
    })();
  }, [setCurrentSaveState]);

  const offerSingleSave = useCallback((run: () => Promise<SaveQueueResult>): Promise<SaveQueueResult> => {
    if (saveStateRef.current === 'children-selection') {
      return Promise.resolve({ success: false, error: SAVE_BUSY_ERROR });
    }

    return new Promise(resolve => {
      saveQueueRef.current.push({ run, resolve });
      if (saveStateRef.current === 'idle') setCurrentSaveState('single-save');
      process();
    });
  }, [process, setCurrentSaveState]);

  const offerExclusiveAction = useCallback(async (run: () => Promise<SaveQueueResult>): Promise<SaveQueueResult> => {
    if (saveStateRef.current !== 'idle') {
      return { success: false, error: SAVE_BUSY_ERROR };
    }

    setCurrentSaveState('children-selection');
    try {
      try {
        return await run();
      } catch (error) {
        console.error('保存任务执行失败:', error);
        return { success: false, error: error instanceof Error ? error.message : '保存任务失败' };
      }
    } finally {
      setCurrentSaveState('idle');
    }
  }, [setCurrentSaveState]);

  return {
    saveState,
    offerSingleSave,
    offerExclusiveAction,
  };
}
