'use client';

import debounce from '@fringeworks/utils/timer/debounce';
import type { ReactNode } from 'react';
import { useCallback, useRef, useSyncExternalStore } from 'react';
import type { DeferRenderingResult } from '../types';
import useDeferUntilTrue from '../useDeferUntilTrue';
import type { UseDeferUntilBreakpointOptions } from './types';

/**
 * 通知した一致状態
 */
type Snapshot = {
  /**
   * 判定したメディアクエリー
   */
  mediaQuery: string;

  /**
   * 一致しているか
   */
  matches: boolean;
};

/**
 * メディアクエリーが一致するまで描画を遅延させるhook
 * @param target 描画対象のノード
 * @param mediaQuery メディアクエリ（例: '(max-width: 768px)'）（null/undefinedの場合は待たずに描画する）
 * @param options オプション
 * @returns state（'pending', 'ready'）と状態に応じたノード
 */
export default function useDeferUntilBreakpoint<
  T extends ReactNode,
  P extends ReactNode = ReactNode,
>(
  target: T,
  mediaQuery: string | null | undefined,
  options: UseDeferUntilBreakpointOptions<P> = {},
): DeferRenderingResult<T | P> {
  const {
    detectionDelay = 100,
    preserveOnceReady,
    initialCondition = false,
    ...opts
  } = options;
  // 変化はdetectionDelayだけ遅れて反映するため、購読中は通知した値を返す
  const snapshotRef = useRef<Snapshot | null>(null);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!mediaQuery) {
        return () => {};
      }
      const mediaQueryList = window.matchMedia(mediaQuery);
      snapshotRef.current = { mediaQuery, matches: mediaQueryList.matches };
      if (preserveOnceReady && mediaQueryList.matches) {
        // 一度readyになったらready状態を保持する場合で既にreadyな場合は監視不要
        return () => {};
      }

      const handleChange = () => {
        const { matches } = mediaQueryList;
        snapshotRef.current = { mediaQuery, matches };
        onStoreChange();
        if (preserveOnceReady && matches) {
          // 一度readyになったらready状態を保持する場合でreadyになった場合はこれで終わり
          mediaQueryList.removeEventListener('change', debouncedHandleChange);
        }
      };
      const debouncedHandleChange = debounce(handleChange, {
        wait: detectionDelay,
      });

      mediaQueryList.addEventListener('change', debouncedHandleChange);

      return () => {
        // 購読をやめた後に、待機中の通知が実行されないようにする
        debouncedHandleChange.cancel();
        mediaQueryList.removeEventListener('change', debouncedHandleChange);
      };
    },
    [mediaQuery, preserveOnceReady, detectionDelay],
  );
  const getSnapshot = useCallback(() => {
    // メディアクエリーが未指定の場合は待つ対象がないため即座に描画
    // （空のメディアクエリーはすべての環境にマッチするmatchMediaの挙動とも一致する）
    if (!mediaQuery) {
      return true;
    }
    const snapshot = snapshotRef.current;
    // 購読前やメディアクエリーが変わった直後は、現在の値を判定する
    return snapshot?.mediaQuery === mediaQuery
      ? snapshot.matches
      : window.matchMedia(mediaQuery).matches;
  }, [mediaQuery]);
  // SSR時は実際のメディアクエリーを判定できないためinitialConditionを使う
  const getServerSnapshot = useCallback(
    () => !mediaQuery || initialCondition,
    [mediaQuery, initialCondition],
  );

  const condition = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  return useDeferUntilTrue(target, condition, { preserveOnceReady, ...opts });
}
