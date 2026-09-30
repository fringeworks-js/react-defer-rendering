'use client';

import isWebFontLoaded from '@niche-works/web-font-observer/isWebFontLoaded';
import waitForWebFont from '@niche-works/web-font-observer/waitForWebFont';
import type { ReactNode } from 'react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { RenderingState } from '../constants';
import type { DeferRenderingResult } from '../types';
import useDeferUntilReady from '../useDeferUntilReady';
import type {
  UseDeferUntilWebFontReadyOptions,
  WebFont,
  WebFontTargets,
} from './types';

/**
 * 指定のWebフォントがすべて利用可能になるまで描画を遅延させるhook\
 * 対象は`@font-face`で定義されたWebフォントで、システムフォントを指定した場合はタイムアウト後に'fallback'になる\
 * `@font-face`の定義は遅延対象のノードの外に置くこと（遅延対象の中にあると定義が登録されず、タイムアウトまで待つことになる）
 * @param target 描画対象のノード
 * @param fonts 待つWebフォント。複数の場合は配列（null/undefined/空文字/空配列の場合は待たずに描画する）
 * @param options オプション
 * @returns state（'pending', 'ready', 'fallback'）と状態に応じたノード
 */
export default function useDeferUntilWebFontReady<
  T extends ReactNode,
  P extends ReactNode = ReactNode,
  E extends ReactNode = ReactNode,
>(
  target: T,
  fonts: WebFontTargets | null | undefined,
  options: UseDeferUntilWebFontReadyOptions<P, E> = {},
): DeferRenderingResult<T | P | E> {
  const {
    timeout,
    loader,
    initialState = RenderingState.pending,
    ...opts
  } = options;
  // 配列やオブジェクトをインラインで指定しても待機がやり直しにならないよう、内容から比較用のキーを作る
  const normalizedFonts = normalizeFonts(fonts);
  const fontsKey = JSON.stringify(normalizedFonts);
  const webFonts = useMemo(() => normalizedFonts, [fontsKey]);
  // loaderの参照が変わっただけでは待機をやり直さない
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  // 待機の結果。どのWebフォントに対する結果かをキーで持ち、Webフォントが変わった時点で即座にpendingとして扱う
  const [result, setResult] = useState(() => ({
    key: fontsKey,
    state: initialState,
  }));

  // ロード済みのWebフォントは待たずに描画する（キャッシュ済みの場合のちらつき防止）
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      const fontFaceSet =
        typeof document === 'undefined' ? undefined : document.fonts;
      if (webFonts.length === 0 || !fontFaceSet) {
        return () => {};
      }
      fontFaceSet.addEventListener('loadingdone', onStoreChange);
      return () => {
        fontFaceSet.removeEventListener('loadingdone', onStoreChange);
      };
    },
    [webFonts],
  );
  const getSnapshot = useCallback(
    () =>
      webFonts.every(({ family, ...rest }) => isWebFontLoaded(family, rest)),
    [webFonts],
  );
  // SSR時は実際の読み込み状態を判定できないため、待つ対象がない場合のみロード済みとみなす
  const getServerSnapshot = useCallback(
    () => webFonts.length === 0,
    [webFonts],
  );
  const isLoaded = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  useEffect(() => {
    if (webFonts.length === 0) {
      return;
    }
    const controller = new AbortController();
    const { signal } = controller;
    const update = (state: RenderingState) => {
      if (!signal.aborted) {
        setResult({ key: fontsKey, state });
      }
    };

    const waitForWebFonts = () =>
      Promise.all(
        webFonts.map(({ family, ...rest }) =>
          waitForWebFont(family, { ...rest, timeout, signal }),
        ),
      );
    const loader = loaderRef.current;
    // loaderが無い場合は即座に待機を開始する
    const promise = loader
      ? loader(signal).then(() => (signal.aborted ? [] : waitForWebFonts()))
      : waitForWebFonts();
    promise.then(
      () => update(RenderingState.ready),
      () => {
        update(RenderingState.fallback);
        // 1つでも失敗したら残りの待機は不要
        controller.abort();
      },
    );

    return () => {
      controller.abort();
    };
  }, [webFonts, timeout]);

  let state: RenderingState;
  if (isLoaded) {
    state = RenderingState.ready;
  } else if (result.key === fontsKey) {
    state = result.state;
  } else {
    // 待つWebフォントが変わった場合は改めて待つ
    state = RenderingState.pending;
  }

  return useDeferUntilReady(target, state, opts);
}

/**
 * 待つWebフォントの指定を、比較可能な形の配列に正規化する
 * @param fonts 待つWebフォントの指定
 * @returns 正規化されたWebフォントの配列
 */
function normalizeFonts(fonts: WebFontTargets | null | undefined): WebFont[] {
  const list = Array.isArray(fonts) ? fonts : [fonts];
  return list.flatMap((font) => {
    if (!font) {
      return [];
    }
    if (typeof font === 'string') {
      return [{ family: font }];
    }
    const { family, weight, style, width, text } = font;
    // キーが指定の順序に左右されないよう、プロパティの順序を揃える
    return family ? [{ family, weight, style, width, text }] : [];
  });
}
