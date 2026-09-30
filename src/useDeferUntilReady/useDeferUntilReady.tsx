'use client';

import useIsMounted from '@niche-works/react-utils/hooks/useIsMounted';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { RenderingState } from '../constants';
import type { DeferRenderingResult } from '../types';
import type { UseDeferUntilReadyOptions } from './types';

/**
 * ステートが'ready'になるまで描画を遅延させるhook
 * @param target 描画対象のノード
 * @param state ステート（'pending', 'ready', 'fallback'）
 * @param options オプション
 * @returns state（'pending', 'ready', 'fallback'）と状態に応じたノード
 */
export default function useDeferUntilReady<
  T extends ReactNode,
  P extends ReactNode = ReactNode,
  E extends ReactNode = ReactNode,
>(
  target: T,
  state: RenderingState,
  options: UseDeferUntilReadyOptions<P, E> = {},
): DeferRenderingResult<T | P | E> {
  const {
    pending,
    fallback,
    pendingDefer,
    fallbackDefer,
    readyDefer,
    preserveOnceFallback,
    preserveOnceReady,
  } = options;
  const latestStateRef = useRef<RenderingState>(null);
  const latestState = latestStateRef.current;
  let currentState = state;
  if (preserveOnceReady && latestState === RenderingState.ready) {
    // 一度readyになったらready状態を保持する
    currentState = latestState;
  } else if (preserveOnceFallback && latestState === RenderingState.fallback) {
    // 一度fallbackになったらfallback状態を保持する
    currentState = latestState;
  }
  latestStateRef.current = currentState;
  // currentに応じた遅延時間を取得
  const defer = {
    pending: pendingDefer,
    fallback: fallbackDefer,
    ready: readyDefer,
  }[currentState];
  const deferRef = useRef(defer);
  deferRef.current = defer;
  // 表示中の状態（nullは遅延中でまだ何も表示していない状態）
  // ノード自体ではなく状態を保持することで、表示後のノードの更新を反映する
  const [shownState, setShownState] = useState<RenderingState | null>(() =>
    defer == null ? currentState : null,
  );
  const isMounted = useIsMounted();

  useEffect(() => {
    const defer = deferRef.current;
    if (defer == null) {
      // 遅延なし
      setShownState(currentState);
      return;
    } else {
      // 遅延あり
      const timeoutId = setTimeout(() => {
        if (isMounted()) {
          setShownState(currentState);
        }
      }, defer);
      return () => {
        clearTimeout(timeoutId);
      };
    }
  }, [currentState]);

  // 表示中の状態に応じた最新のノードを取得
  const node =
    shownState == null
      ? null
      : { pending, fallback, ready: target }[shownState];

  return {
    state: currentState,
    node,
  };
}
