'use client';

import debounce from '@fringeworks/utils/timer/debounce';
import type { ReactNode } from 'react';
import { useCallback, useRef, useSyncExternalStore } from 'react';
import type { DeferRenderingResult } from '../types';
import useDeferUntilTrue from '../useDeferUntilTrue';
import type { UseDeferUntilRenderOptions } from './types';

/**
 * 通知した描画状態
 */
type Snapshot = {
  /**
   * 判定したクエリセレクター
   */
  query: string;

  /**
   * 判定した範囲
   */
  root: Element | Document;

  /**
   * 一致するエレメントがあるか
   */
  isRendered: boolean;
};

/**
 * セレクターに一致するエレメントが描画されるまで描画を遅延させるhook
 * @param target 描画対象のノード
 * @param query クエリセレクター（例: '.my-class'）（null/undefinedの場合は待たずに描画する）
 * @param options オプション
 * @returns state（'pending', 'ready'）と状態に応じたノード
 */
export default function useDeferUntilRender<
  T extends ReactNode,
  P extends ReactNode = ReactNode,
>(
  target: T,
  query: string | null | undefined,
  options: UseDeferUntilRenderOptions<P> = {},
): DeferRenderingResult<T | P> {
  const defaultRootRef = useRef<Element | Document | null | undefined>(null);
  const {
    rootRef = defaultRootRef,
    detectionDelay = 100,
    preserveOnceReady,
    initialCondition = false,
    ...opts
  } = options;
  // 変化はdetectionDelayだけ遅れて反映し、DOMの検索も変更時だけにするため、購読中は通知した値を返す
  const snapshotRef = useRef<Snapshot | null>(null);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!query) {
        return () => {};
      }
      const root = rootRef.current ?? document;
      const update = () => {
        const isRendered = root.querySelector(query) != null;
        snapshotRef.current = { query, root, isRendered };
        return isRendered;
      };
      if (update() && preserveOnceReady) {
        // 一度readyになったらready状態を保持する場合で既にreadyな場合は監視不要
        return () => {};
      }

      const handleMutation = () => {
        const isRendered = update();
        onStoreChange();
        if (preserveOnceReady && isRendered) {
          // 一度readyになったらready状態を保持する場合でreadyになった場合はこれで終わり
          observer.disconnect();
        }
      };
      const debouncedHandleMutation = debounce(handleMutation, {
        wait: detectionDelay,
      });
      const observer = new MutationObserver(debouncedHandleMutation);
      observer.observe(root, { childList: true, subtree: true });

      return () => {
        // 購読をやめた後に、待機中の通知が実行されないようにする
        debouncedHandleMutation.cancel();
        observer.disconnect();
      };
    },
    // 要素は購読時に参照から取得するため、参照自体を依存にする
    [query, rootRef, detectionDelay, preserveOnceReady],
  );
  const getSnapshot = useCallback(() => {
    if (!query) {
      // クエリが未指定の場合は待つ対象がないため即座に描画
      return true;
    }
    const root = rootRef.current ?? document;
    const snapshot = snapshotRef.current;
    // 購読前や、クエリ・範囲が変わった直後は、現在のDOMを判定する
    return snapshot?.query === query && snapshot.root === root
      ? snapshot.isRendered
      : root.querySelector(query) != null;
  }, [query, rootRef]);
  // SSR時は実際のDOMを判定できないためinitialConditionを使う
  const getServerSnapshot = useCallback(
    () => !query || initialCondition,
    [query, initialCondition],
  );

  const condition = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  return useDeferUntilTrue(target, condition, { preserveOnceReady, ...opts });
}
