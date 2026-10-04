'use client';

import useIsMounted from '@fringeworks/react-utils/hooks/useIsMounted';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import type { DeferRenderingResult } from '../types';
import useDeferUntilTrue from '../useDeferUntilTrue';
import type { UseDeferUntilChangeOptions } from './types';

const NO_VALUE = Symbol('NO_VALUE');

/**
 * 値が変更されるまで描画を遅延させるhook
 * @param target 描画対象のノード
 * @param value 値
 * @param options オプション
 * @returns state（'pending', 'ready'）と状態に応じたノード
 */
export default function useDeferUntilChange<
  T extends ReactNode,
  P extends ReactNode = ReactNode,
>(
  target: T,
  value: unknown,
  options: UseDeferUntilChangeOptions<P> = {},
): DeferRenderingResult<T | P> {
  const [prevValue, setPrevValue] = useState<unknown>(NO_VALUE);
  const isMounted = useIsMounted();
  const result = useDeferUntilTrue(target, prevValue === value, options);

  useEffect(() => {
    if (isMounted()) {
      setPrevValue(value);
    }
  }, [value]);

  return result;
}
