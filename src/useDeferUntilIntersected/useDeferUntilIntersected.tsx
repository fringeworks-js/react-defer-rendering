'use client';

import unit from '@niche-works/web-utils/unit';
import type { ReactNode, RefObject } from 'react';
import { useCallback, useRef, useSyncExternalStore } from 'react';
import type { DeferRenderingResult } from '../types';
import useDeferUntilTrue from '../useDeferUntilTrue';
import type { UseDeferUntilIntersectedOptions } from './types';

/**
 * 基準となる要素がビューポートに入るまで描画を遅延させるhook
 * @param target 描画対象のノード
 * @param elementRef 基準となる要素の参照（参照自体がnull/undefinedの場合は待たずに描画する）
 * @param options オプション
 * @returns state（'pending', 'ready'）と状態に応じたノード
 */
export default function useDeferUntilIntersected<
  T extends ReactNode,
  P extends ReactNode = ReactNode,
>(
  target: T,
  elementRef: RefObject<HTMLElement | null | undefined> | null | undefined,
  options: UseDeferUntilIntersectedOptions<P> = {},
): DeferRenderingResult<T | P> {
  const defaultRootRef = useRef<Element | null | undefined>(null);
  const {
    rootRef = defaultRootRef,
    rootMargin,
    threshold = 0.1,
    initialCondition = false,
    ...opts
  } = options;
  // IntersectionObserverは同期的に現在値を取得できないため、直近の通知結果を保持する
  const snapshotRef = useRef(initialCondition);
  // 監視対象が変わった場合に、前の要素の交差状態を引き継がないよう監視中の要素を保持する
  const observedElementRef = useRef<HTMLElement | null | undefined>(null);

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const element = elementRef?.current;
      const container = rootRef.current;
      if (observedElementRef.current !== element) {
        observedElementRef.current = element;
        if (snapshotRef.current !== initialCondition) {
          snapshotRef.current = initialCondition;
          onStoreChange();
        }
      }
      if (!element) {
        return () => {};
      }

      const observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (snapshotRef.current !== entry.isIntersecting) {
            snapshotRef.current = entry.isIntersecting;
            onStoreChange();
          }
        },
        {
          root: container,
          rootMargin: unit(rootMargin),
          threshold,
        },
      );

      observer.observe(element);

      return () => {
        observer.disconnect(); // クリーンアップ
      };
    },
    [
      elementRef,
      elementRef?.current,
      rootRef.current,
      threshold,
      rootMargin,
      initialCondition,
    ],
  );
  // 参照自体が未指定の場合は待つ対象がないため即座に描画
  // （参照はあるが要素がまだない場合は、マウント待ちとして扱う）
  const getSnapshot = useCallback(
    () => !elementRef || snapshotRef.current,
    [elementRef],
  );
  // SSR時は実際の交差状態を判定できないためinitialConditionを使う
  const getServerSnapshot = useCallback(
    () => !elementRef || initialCondition,
    [elementRef, initialCondition],
  );

  const condition = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  return useDeferUntilTrue(target, condition, opts);
}
