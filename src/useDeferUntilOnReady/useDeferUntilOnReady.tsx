'use client';

import debounce from '@fringeworks/utils/timer/debounce';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { RenderingState } from '../constants';
import type { DeferRenderingWithHandlersResult } from '../types';
import useDeferUntilReady from '../useDeferUntilReady';
import type { UseDeferUntilOnReadyOptions } from './types';

/**
 * 戻り値として返す`onReady`が実行されるまで描画を遅延させるhook
 * @param target 描画対象のノード
 * @param options オプション
 * @returns state（'pending', 'ready', 'fallback'）と状態に応じたノードと状態変更用のハンドラー
 */
export default function useDeferUntilOnReady<
  T extends ReactNode,
  P extends ReactNode = ReactNode,
  E extends ReactNode = ReactNode,
>(
  target: T,
  options: UseDeferUntilOnReadyOptions<P, E> = {},
): DeferRenderingWithHandlersResult<T | P | E> {
  const { onReadyDelay, onFallbackDelay, onPendingDelay, ...opts } = options;
  const [state, setState] = useState<RenderingState>(RenderingState.pending);
  const onReady = useMemo(() => {
    const fn = () => setState(RenderingState.ready);
    return onReadyDelay != null ? debounce(fn, onReadyDelay) : fn;
  }, [onReadyDelay]);
  const onFallback = useMemo(() => {
    const fn = () => setState(RenderingState.fallback);
    return onFallbackDelay != null ? debounce(fn, onFallbackDelay) : fn;
  }, [onFallbackDelay]);
  const onPending = useMemo(() => {
    const fn = () => setState(RenderingState.pending);
    return onPendingDelay != null ? debounce(fn, onPendingDelay) : fn;
  }, [onPendingDelay]);

  return {
    ...useDeferUntilReady(target, state, opts),
    onPending,
    onFallback,
    onReady,
  };
}
