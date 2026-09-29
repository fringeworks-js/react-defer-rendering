'use client';

import useIsMounted from '@niche-works/react-utils/hooks/useIsMounted';
import FontFaceObserver from 'fontfaceobserver';
import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import type { DeferRenderingResult, RenderingState } from '../types';
import useDeferUntilStateChange from '../useDeferUntilReady';
import type { UseDeferUntilFontReadyOptions } from './types';

/**
 * 指定のフォントが利用可能になるまで描画を遅延させるhook
 * @param target 描画対象のノード
 * @param fontFamily フォントファミリー（null/undefinedの場合は待たずに描画する）
 * @param options オプション
 * @returns state（'pending', 'ready', 'fallback'）と状態に応じたノード
 */
export default function useDeferUntilFontReady<
  T extends ReactNode,
  P extends ReactNode = ReactNode,
  E extends ReactNode = ReactNode,
>(
  target: T,
  fontFamily: string | null | undefined,
  options: UseDeferUntilFontReadyOptions<P, E> = {},
): DeferRenderingResult<T | P | E> {
  const {
    fontWeight,
    fontStyle,
    fontStretch,
    timeout = 4000,
    loader,
    initialState = 'pending',
    ...opts
  } = options;
  // フォントが未指定の場合は待つ対象がないため即座に描画
  const [state, setState] = useState<RenderingState>(
    fontFamily ? initialState : 'ready',
  );
  const isMounted = useIsMounted();
  const isFirstRun = useRef(true);

  useEffect(() => {
    if (!fontFamily) {
      isFirstRun.current = false;
      setState('ready');
      return;
    }

    // 条件が変わった後に古い確認結果で状態を上書きしないようにする
    let isCurrent = true;
    const update = (nextState: RenderingState) => {
      if (isCurrent && isMounted()) {
        setState(nextState);
      }
    };
    const observe = () => {
      new FontFaceObserver(fontFamily, {
        weight: fontWeight,
        style: fontStyle,
        stretch: fontStretch,
      })
        .load(null, timeout)
        .then(() => update('ready'))
        .catch(() => update('fallback'));
    };

    if (!isFirstRun.current) {
      // マウント直後はinitialStateを維持したままフォントの確認だけ行う
      setState('pending');
    }
    isFirstRun.current = false;

    if (loader) {
      loader()
        .then(() => {
          if (isCurrent) {
            observe();
          }
        })
        .catch(() => update('fallback'));
    } else {
      observe();
    }
    return () => {
      isCurrent = false;
    };
  }, [fontFamily, fontWeight, fontStyle, fontStretch, timeout, loader]);

  return useDeferUntilStateChange(target, state, opts);
}
