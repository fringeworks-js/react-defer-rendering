'use client';

import useIsMounted from '@fringeworks/react-utils/hooks/useIsMounted';
import debounce from '@fringeworks/utils/timer/debounce';
import type { ReactNode, RefObject } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { DeferRenderingResult } from '../types';
import useDeferUntilTrue from '../useDeferUntilTrue';
import type { UseDeferUntilScrolledOptions } from './types';

/**
 * 縦または横スクロール位置に基づいて描画を遅延させるhook
 * @param target 描画対象のノード
 * @param elementRef 基準となる要素の参照（参照自体がnull/undefinedの場合は待たずに描画する）
 * @param options オプション
 * @returns state（'pending', 'ready'）と状態に応じたノード
 */
export default function useDeferUntilScrolled<
  T extends ReactNode,
  P extends ReactNode = ReactNode,
>(
  target: T,
  elementRef: RefObject<HTMLElement | null | undefined> | null | undefined,
  options: UseDeferUntilScrolledOptions<P> = {},
): DeferRenderingResult<T | P> {
  // document参照はレンダー時ではなくeffect内で解決する（SSRでは`document`が存在しないため）
  const defaultRootRef = useRef<Element | null | undefined>(null);
  const {
    rootRef = defaultRootRef,
    rootMargin = 0,
    detectionDelay = 100,
    preserveOnceReady,
    direction = 'vertical',
    initialCondition = false,
    ...opts
  } = options;
  // 参照自体が未指定の場合は待つ対象がないため即座に描画
  // （参照はあるが要素がまだない場合は、マウント待ちとして扱う）
  const [condition, setCondition] = useState(!elementRef || initialCondition);
  const isMounted = useIsMounted();
  const isFirstRun = useRef(true);

  useEffect(() => {
    const isFirst = isFirstRun.current;
    isFirstRun.current = false;
    if (!elementRef) {
      setCondition(true);
      return;
    }
    if (!isFirst) {
      // マウント直後はinitialConditionを維持し、対象が変わった場合は改めて判定する
      setCondition(false);
    }
    const element = elementRef.current;
    if (!element) {
      return;
    }
    const container = rootRef.current;
    // rootRef未指定時はビューポートを基準にする
    // ページ全体のスクロールイベントはdocumentで発火しwindowへ伝播するため、windowで検知する
    const scrollTarget: Element | Window = container ?? window;
    const getRootBounds = () => {
      if (container) {
        // getBoundingClientRectはビューポート基準のため、コンテナーの位置を基準に合わせる
        const rect = container.getBoundingClientRect();
        const top = rect.top + container.clientTop;
        const left = rect.left + container.clientLeft;
        return {
          top,
          left,
          bottom: top + container.clientHeight,
          right: left + container.clientWidth,
        };
      }
      const viewport = document.documentElement;
      return {
        top: 0,
        left: 0,
        bottom: viewport.clientHeight,
        right: viewport.clientWidth,
      };
    };
    const checkVisible = () => {
      const rect = element.getBoundingClientRect();
      const bounds = getRootBounds();
      return direction === 'vertical'
        ? rect.top - rootMargin < bounds.bottom &&
            rect.bottom + rootMargin >= bounds.top
        : rect.left - rootMargin < bounds.right &&
            rect.right + rootMargin >= bounds.left;
    };

    // 初期チェック
    // 可視範囲外の場合は既存の値（マウント直後はinitialCondition）を維持する
    const isVisible = checkVisible();
    if (isVisible) {
      setCondition(true);
      if (preserveOnceReady) {
        // 一度readyになったらready状態を保持する場合は監視不要
        return;
      }
    }

    const debouncedHandleScroll = debounce(() => {
      if (!isMounted()) {
        return;
      }
      const isVisible = checkVisible();
      setCondition(isVisible);
      if (preserveOnceReady && isVisible) {
        // 一度readyになったらready状態を保持する場合でreadyになった場合はこれで終わり
        scrollTarget.removeEventListener('scroll', debouncedHandleScroll);
      }
    }, detectionDelay);
    scrollTarget.addEventListener('scroll', debouncedHandleScroll, {
      passive: true,
    });

    return () => {
      debouncedHandleScroll.cancel();
      scrollTarget.removeEventListener('scroll', debouncedHandleScroll);
    };
  }, [
    elementRef,
    elementRef?.current,
    rootRef.current,
    rootMargin,
    detectionDelay,
    direction,
    preserveOnceReady,
  ]);

  return useDeferUntilTrue(target, condition, { preserveOnceReady, ...opts });
}
