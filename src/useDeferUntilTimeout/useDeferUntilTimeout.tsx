'use client';

import useIsMounted from '@fringeworks/react-utils/hooks/useIsMounted';
import setTimeoutExtended from '@fringeworks/utils/timer/setTimeoutExtended';
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
  // 未指定の場合は待つ対象がなく、0以下の場合は既に指定時間を過ぎているため即座に描画
  const [condition, setCondition] = useState(defer == null || defer <= 0);
  const isMounted = useIsMounted();

  useEffect(() => {
    if (defer == null || defer <= 0) {
      setCondition(true);
      return;
    }

    // deferが変わった場合は改めて待つ
    setCondition(false);
    const cancel = setTimeoutExtended(() => {
      if (isMounted()) {
        setCondition(true);
      }
    }, defer);
    return () => {
      cancel();
    };
  }, [defer]);

  return useDeferUntilTrue(target, condition, options);
}
