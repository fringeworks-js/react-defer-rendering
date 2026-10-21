'use client';

import setLongTimeout from '@fringeworks/utils/timer/setLongTimeout';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import type { DeferRenderingResult } from '../types';
import useDeferUntilTrue from '../useDeferUntilTrue';
import type { UseDeferUntilDateOptions } from './types';

/**
 * 指定の日時まで描画を遅延させるhook
 * @param target 描画対象のノード
 * @param date 描画する日時（null/undefinedの場合は待たずに描画する）
 * @param options オプション
 * @returns state（'pending', 'ready'）と状態に応じたノード
 */
export default function useDeferUntilDate<
  T extends ReactNode,
  P extends ReactNode = ReactNode,
>(
  target: T,
  date: Date | null | undefined,
  options: UseDeferUntilDateOptions<P> = {},
): DeferRenderingResult<T | P> {
  const time = date ? date.getTime() : null;
  // 到達した日時（ミリ秒）
  // 初回だけはマウント時点で判定し、既に過ぎている場合は待たずに描画する
  const [reachedTime, setReachedTime] = useState(() =>
    time != null && time <= Date.now() ? time : null,
  );

  useEffect(() => {
    if (time == null) {
      return;
    }
    // 残り時間はレンダー中ではなくeffect内で計算する
    return setLongTimeout(
      () => setReachedTime(time),
      Math.max(0, time - Date.now()),
    );
  }, [time]);

  return useDeferUntilTrue(
    target,
    time == null || reachedTime === time,
    options,
  );
}
