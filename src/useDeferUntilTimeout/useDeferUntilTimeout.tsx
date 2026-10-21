'use client';

import setLongTimeout from '@fringeworks/utils/timer/setLongTimeout';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import type { DeferRenderingResult } from '../types';
import useDeferUntilTrue from '../useDeferUntilTrue';
import type { UseDeferUntilTimeoutOptions } from './types';

/**
 * 指定の時間が経過するまで描画を遅延させるhook
 * @param target 描画対象のノード
 * @param defer 遅延させる時間(ms)（null/undefinedの場合は待たずに描画する）
 * @param options オプション
 * @returns state（'pending', 'ready'）と状態に応じたノード
 */
export default function useDeferUntilTimeout<
  T extends ReactNode,
  P extends ReactNode = ReactNode,
>(
  target: T,
  defer: number | null | undefined,
  options: UseDeferUntilTimeoutOptions<P> = {},
): DeferRenderingResult<T | P> {
  // どの遅延時間に対する待機かを持つ
  const [wait, setWait] = useState({ defer, isElapsed: false });
  if (wait.defer !== defer) {
    // deferが変わった場合は改めて待つ（描画中に状態を調整する）
    setWait({ defer, isElapsed: false });
  }

  useEffect(() => {
    if (defer == null || defer <= 0) {
      return;
    }
    return setLongTimeout(() => {
      setWait((current) =>
        current.defer === defer ? { defer, isElapsed: true } : current,
      );
    }, defer);
  }, [defer]);

  // 未指定の場合は待つ対象がなく、0以下の場合は既に指定時間を過ぎているため即座に描画
  const condition =
    defer == null || defer <= 0 || (wait.defer === defer && wait.isElapsed);

  return useDeferUntilTrue(target, condition, options);
}
