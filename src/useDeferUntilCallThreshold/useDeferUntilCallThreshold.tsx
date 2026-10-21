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
  const pendingCountRef = useRef(0);
  const fallbackCountRef = useRef(0);
  const readyCountRef = useRef(0);
  const reset = useCallback(() => {
    pendingCountRef.current = 0;
    fallbackCountRef.current = 0;
    readyCountRef.current = 0;
  }, []);
  const onPending = useCallback(() => {
    pendingCountRef.current += 1;
    if (onPendingCount <= pendingCountRef.current) {
      reset();
      handlePending();
    }
  }, [handlePending, onPendingCount, reset]);
  const onFallback = useCallback(() => {
    fallbackCountRef.current += 1;
    if (onFallbackCount <= fallbackCountRef.current) {
      reset();
      handleFallback();
    }
  }, [handleFallback, onFallbackCount, reset]);
  const onReady = useCallback(() => {
    readyCountRef.current += 1;
    if (onReadyCount <= readyCountRef.current) {
      reset();
      handleReady();
    }
  }, [handleReady, onReadyCount, reset]);

  return {
    ...rest,
    onPending,
    onFallback,
    onReady,
  };
}
