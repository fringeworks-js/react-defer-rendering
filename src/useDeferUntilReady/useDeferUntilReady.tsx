'use client';

import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
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
  // 保持している状態（preserveOnceReady・preserveOnceFallbackで、一度なった状態を保持する）
  const [preservedState, setPreservedState] = useState<RenderingState | null>(
    null,
  );
  const isPreserved =
    (preserveOnceReady && preservedState === RenderingState.ready) ||
    (preserveOnceFallback && preservedState === RenderingState.fallback);
  const currentState = isPreserved && preservedState ? preservedState : state;
  if (
    !isPreserved &&
    ((preserveOnceReady && state === RenderingState.ready) ||
      (preserveOnceFallback && state === RenderingState.fallback))
  ) {
    // 描画中に状態を調整する（Reactがコミット前に描画をやり直すため、破棄された描画の状態は残らない）
    setPreservedState(state);
  }

  // currentに応じた遅延時間を取得
  const defer = {
    pending: pendingDefer,
    fallback: fallbackDefer,
    ready: readyDefer,
  }[currentState];
  // 表示中の状態（nullは遅延中でまだ何も表示していない状態）
  // ノード自体ではなく状態を保持することで、表示後のノードの更新を反映する
  const [shownState, setShownState] = useState<RenderingState | null>(() =>
    defer == null ? currentState : null,
  );
  if (defer == null && shownState !== currentState) {
    // 遅延なしの場合は、effectを待たずに描画中に反映する
    setShownState(currentState);
  }

  useEffect(() => {
    if (defer == null) {
      return;
    }
    // 遅延あり
    const timeoutId = setTimeout(() => {
      setShownState(currentState);
    }, defer);
    return () => {
      clearTimeout(timeoutId);
    };
  }, [currentState, defer]);

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
