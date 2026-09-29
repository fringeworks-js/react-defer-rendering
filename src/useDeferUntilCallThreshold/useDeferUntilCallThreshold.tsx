'use client';

import type { ReactNode } from 'react';
import { useCallback, useRef } from 'react';
import type { DeferRenderingWithHandlersResult } from '../types';
import useDeferUntilOnReady from '../useDeferUntilOnReady';
import type { UseDeferUntilCallThresholdOptions } from './types';

/**
 * 戻り値として返す`onReady`等のハンドラーが指定回数呼ばれるまで描画を遅延させるhook
 * @param target 描画対象のノード
 * @param options オプション
 * @returns state（'pending', 'ready', 'fallback'）と状態に応じたノードと状態変更用のハンドラー
 */
export default function useDeferUntilCallThreshold<
  T extends ReactNode,
  P extends ReactNode = ReactNode,
  E extends ReactNode = ReactNode,
>(
  target: T,
  options: UseDeferUntilCallThresholdOptions<P, E> = {},
): DeferRenderingWithHandlersResult<T | P | E> {
  const {
    onPendingCount = 1,
    onFallbackCount = 1,
    onReadyCount = 1,
    ...opts
  } = options;
  const {
    onPending: handlePending,
    onFallback: handleFallback,
    onReady: handleReady,
    ...rest
  } = useDeferUntilOnReady(target, opts);
  const pendingContRef = useRef(0);
  const fallbackContRef = useRef(0);
  const readyContRef = useRef(0);
  const reset = useCallback(() => {
    pendingContRef.current = 0;
    fallbackContRef.current = 0;
    readyContRef.current = 0;
  }, []);
  const onPending = useCallback(() => {
    pendingContRef.current += 1;
    if (onPendingCount <= pendingContRef.current) {
      reset();
      handlePending();
    }
  }, [handlePending, onPendingCount]);
  const onFallback = useCallback(() => {
    fallbackContRef.current += 1;
    if (onFallbackCount <= fallbackContRef.current) {
      reset();
      handleFallback();
    }
  }, [handleFallback, onFallbackCount]);
  const onReady = useCallback(() => {
    readyContRef.current += 1;
    if (onReadyCount <= readyContRef.current) {
      reset();
      handleReady();
    }
  }, [handleReady, onReadyCount]);

  return {
    ...rest,
    onPending,
    onFallback,
    onReady,
  };
}
