'use client';

import type { ReactNode } from 'react';
import { RenderingState } from '../constants';
import type { DeferRenderingResult } from '../types';
import useDeferUntilReady from '../useDeferUntilReady';
import type { UseDeferUntilTrueOptions } from './types';

/**
 * 条件がtrueになるまで描画を遅延させるhook
 * @param target 描画対象のノード
 * @param condition 条件
 * @param options オプション
 * @returns state（'pending', 'ready'）と状態に応じたノード
 */
export default function useDeferUntilTrue<
  T extends ReactNode,
  P extends ReactNode = ReactNode,
>(
  target: T,
  condition: boolean | null | undefined,
  options: UseDeferUntilTrueOptions<P> = {},
): DeferRenderingResult<T | P> {
  return useDeferUntilReady(
    target,
    condition ? RenderingState.ready : RenderingState.pending,
    options,
  );
}
