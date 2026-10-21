'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { RenderingState } from '../constants';
import type { DeferRenderingWithHandlersResult } from '../types';
import useDeferUntilReady from '../useDeferUntilReady';
import type { UseDeferUntilOnReadyOptions } from './types';

/**
 * 戻り値として返す`onReady`が実行されるまで描画を遅延させるhook\
 * どのハンドラーを呼んだ場合も、待機中の状態の変更は取り消され、最後に呼んだハンドラーの状態になる
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
  // 待機中の状態の変更（ハンドラー間で共有し、最後に呼んだものだけを有効にする）
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const cancel = useCallback(() => {
    clearTimeout(timerRef.current);
    timerRef.current = undefined;
  }, []);
  const changeState = useCallback(
    (nextState: RenderingState, delay: number | undefined) => {
      cancel();
      if (delay == null) {
        setState(nextState);
        return;
      }
      // 遅延中に同じハンドラーが呼ばれた場合は、そこから数え直す
      timerRef.current = setTimeout(() => {
        timerRef.current = undefined;
        setState(nextState);
      }, delay);
    },
    [cancel],
  );
  // アンマウント時は待機中の状態の変更を取り消す
  useEffect(() => cancel, [cancel]);

  const onReady = useCallback(
    () => changeState(RenderingState.ready, onReadyDelay),
    [changeState, onReadyDelay],
  );
  const onFallback = useCallback(
    () => changeState(RenderingState.fallback, onFallbackDelay),
    [changeState, onFallbackDelay],
  );
  const onPending = useCallback(
    () => changeState(RenderingState.pending, onPendingDelay),
    [changeState, onPendingDelay],
  );

  return {
    ...useDeferUntilReady(target, state, opts),
    onPending,
    onFallback,
    onReady,
  };
}
