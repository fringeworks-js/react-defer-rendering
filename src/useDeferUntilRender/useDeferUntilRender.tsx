'use client';

import debounce from '@fringeworks/utils/timer/debounce';
import type { ReactNode } from 'react';
import { useCallback, useRef, useSyncExternalStore } from 'react';
import type { DeferRenderingResult } from '../types';
import useDeferUntilTrue from '../useDeferUntilTrue';
import type { UseDeferUntilRenderOptions } from './types';

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

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (!query) {
        return () => {};
      }
      const root = rootRef.current ?? document;
      if (preserveOnceReady && root.querySelector(query)) {
        // 一度readyになったらready状態を保持する場合で既にreadyな場合は監視不要
        return () => {};
      }

      const handleMutation = () => {
        onStoreChange();
        if (preserveOnceReady && root.querySelector(query)) {
          // 一度readyになったらready状態を保持する場合でreadyになった場合はこれで終わり
          observer.disconnect();
        }
      };
      const debouncedHandleMutation = debounce(handleMutation, detectionDelay);
      const observer = new MutationObserver(debouncedHandleMutation);
      observer.observe(root, { childList: true, subtree: true });

      return () => {
        observer.disconnect();
      };
    },
    [query, rootRef.current, detectionDelay, preserveOnceReady],
  );
  const getSnapshot = useCallback(() => {
    if (!query) {
      // クエリが未指定の場合は待つ対象がないため即座に描画
      return true;
    }
    const root = rootRef.current ?? document;
    return root.querySelector(query) != null;
  }, [query, rootRef.current]);
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
