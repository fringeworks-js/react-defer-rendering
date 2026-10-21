'use client';

import { useEffect, useState } from 'react';
import { RenderingState } from './constants';

/**
 * Promiseを生成する関数
 */
type CreatePromise = () => PromiseLike<unknown>;

/**
 * Promiseの結果
 */
type SettledResult = {
  /**
   * 結果を得たPromiseの生成関数
   */
  source: CreatePromise;

  /**
   * 描画状態（'ready', 'fallback'）
   */
  state: RenderingState;
};

/**
 * Promiseを生成する関数を実行し、その完了状態を返すhook
 * 生成関数はレンダー中ではなくeffect内で実行する（SSR時は実行されない）
 * @param createPromise Promiseを生成する関数（null/undefinedの場合は待たずに'ready'）
 * @returns 描画状態（'pending', 'ready', 'fallback'）
 */
export default function usePromiseState(
  createPromise: CreatePromise | null | undefined,
): RenderingState {
  // どの生成関数に対する結果かを持ち、生成関数が変わった時点で即座にpendingとして扱う
  const [settled, setSettled] = useState<SettledResult | null>(null);

  useEffect(() => {
    if (!createPromise) {
      return;
    }

    // 差し替えられた後に古いPromiseの結果で状態を上書きしないようにする
    let isCurrent = true;
    const settle = (state: RenderingState) => {
      if (isCurrent) {
        setSettled({ source: createPromise, state });
      }
    };
    // 生成関数が同期的に例外を投げた場合も、失敗（reject）として扱う
    new Promise((resolve) => resolve(createPromise())).then(
      () => settle(RenderingState.ready),
      () => settle(RenderingState.fallback),
    );
    return () => {
      isCurrent = false;
    };
  }, [createPromise]);

  if (!createPromise) {
    // 未指定の場合は待つ対象がないため即座に描画
    return RenderingState.ready;
  }
  return settled?.source === createPromise
    ? settled.state
    : RenderingState.pending;
}
