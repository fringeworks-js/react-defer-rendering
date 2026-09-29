'use client';

import type { ReactNode } from 'react';
import { useMemo } from 'react';
import usePromiseState from '../_usePromiseState';
import type { DeferRenderingResult } from '../types';
import useDeferUntilReady from '../useDeferUntilReady';
import type { UseDeferUntilResolvedOptions } from './types';

/**
 * Promiseの完了まで描画を遅延させるhook
 * @param target 描画対象のノード
 * @param promise プロミス（null/undefinedの場合は待たずに描画する）
 * @param options オプション
 * @returns state（'pending', 'ready', 'fallback'）と状態に応じたノード
 */
export default function useDeferUntilResolved<
  T extends ReactNode,
  P extends ReactNode = ReactNode,
  E extends ReactNode = ReactNode,
>(
  target: T,
  promise: Promise<unknown> | null | undefined,
  options: UseDeferUntilResolvedOptions<P, E> = {},
): DeferRenderingResult<T | P | E> {
  const createPromise = useMemo(
    () => (promise ? () => promise : null),
    [promise],
  );
  const state = usePromiseState(createPromise);

  return useDeferUntilReady(target, state, options);
}
