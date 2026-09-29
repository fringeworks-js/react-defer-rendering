'use client';

import useIsMounted from '@niche-works/react-utils/hooks/useIsMounted';
import { useEffect, useState } from 'react';
import { RenderingState } from './constants';

/**
 * Promiseを生成する関数を実行し、その完了状態を返すhook
 * 生成関数はレンダー中ではなくeffect内で実行する（SSR時は実行されない）
 * @param createPromise Promiseを生成する関数（null/undefinedの場合は待たずに'ready'）
 * @returns 描画状態（'pending', 'ready', 'fallback'）
 */
export default function usePromiseState(
  createPromise: (() => PromiseLike<unknown>) | null | undefined,
): RenderingState {
  const [state, setState] = useState<RenderingState>(
    createPromise ? RenderingState.pending : RenderingState.ready,
  );
  const isMounted = useIsMounted();

  useEffect(() => {
    if (!createPromise) {
      // 未指定になった場合は待つ対象がないため即座に描画
      setState(RenderingState.ready);
      return;
    }

    // 差し替えられた後に古いPromiseの結果で状態を上書きしないようにする
    let isCurrent = true;
    const update = (nextState: RenderingState) => {
      if (isCurrent && isMounted()) {
        setState(nextState);
      }
    };
    setState(RenderingState.pending);
    try {
      Promise.resolve(createPromise()).then(
        () => update(RenderingState.ready),
        () => update(RenderingState.fallback),
      );
    } catch {
      // 生成関数が同期的に例外を投げた場合も失敗として扱う
      update(RenderingState.fallback);
    }
    return () => {
      isCurrent = false;
    };
  }, [createPromise]);

  return state;
}
