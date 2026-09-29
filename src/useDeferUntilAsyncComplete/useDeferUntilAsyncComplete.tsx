'use client';

import type { ReactNode } from 'react';
import usePromiseState from '../_usePromiseState';
import type { DeferRenderingResult } from '../types';
import useDeferUntilReady from '../useDeferUntilReady';
import type { UseDeferUntilAsyncCompleteOptions } from './types';

/**
 * 非同期関数の処理の完了まで描画を遅延させるhook
 * @param target 描画対象のノード
 * @param asyncFn 非同期関数（null/undefinedの場合は待たずに描画する）
 * @param options オプション
 * @returns state（'pending', 'ready', 'fallback'）と状態に応じたノード
 */
export default function useDeferUntilAsyncComplete<
  T extends ReactNode,
  P extends ReactNode = ReactNode,
  E extends ReactNode = ReactNode,
>(
  target: T,
  asyncFn: (() => Promise<void>) | null | undefined,
  options: UseDeferUntilAsyncCompleteOptions<P, E> = {},
): DeferRenderingResult<T | P | E> {
  // asyncFnはレンダー中ではなくeffect内で実行する
  const state = usePromiseState(asyncFn);

  return useDeferUntilReady(target, state, options);
}
