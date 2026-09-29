import { act, renderHook } from '@testing-library/react';
import type { RefObject } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useDeferUntilRender from './useDeferUntilRender';

describe('useDeferUntilRender', () => {
  let root: HTMLDivElement;
  let rootRef: RefObject<HTMLElement | null>;

  beforeEach(() => {
    vi.useFakeTimers();
    root = document.createElement('div');
    document.body.appendChild(root);
    rootRef = { current: root };
  });

  afterEach(() => {
    vi.useRealTimers();
    root.remove();
  });

  it('クエリに一致する要素が既に存在する場合、即座にreadyになる', () => {
    const marker = document.createElement('div');
    marker.className = 'marker';
    root.appendChild(marker);

    const { result } = renderHook(() =>
      useDeferUntilRender('target', '.marker', { rootRef }),
    );
    expect(result.current.state).toBe('ready');
  });

  it('一致する要素がない場合pendingになり、追加後に反映される', async () => {
    const { result } = renderHook(() =>
      useDeferUntilRender('target', '.marker', {
        rootRef,
        detectionDelay: 100,
      }),
    );
    expect(result.current.state).toBe('pending');

    const marker = document.createElement('div');
    marker.className = 'marker';

    await act(async () => {
      root.appendChild(marker);
      await Promise.resolve();
      vi.advanceTimersByTime(100);
    });
    expect(result.current.state).toBe('ready');
    expect(result.current.node).toBe('target');
  });

  it('rootRefで指定した範囲外の変更には反応しない', async () => {
    const outside = document.createElement('div');
    document.body.appendChild(outside);

    const { result } = renderHook(() =>
      useDeferUntilRender('target', '.marker', {
        rootRef,
        detectionDelay: 100,
      }),
    );
    expect(result.current.state).toBe('pending');

    const marker = document.createElement('div');
    marker.className = 'marker';
    await act(async () => {
      outside.appendChild(marker);
      await Promise.resolve();
      vi.advanceTimersByTime(100);
    });
    expect(result.current.state).toBe('pending');

    outside.remove();
  });

  it('initialConditionはSSR用の値であり、クライアントでは実際のDOM状態が優先される', () => {
    // getSnapshotは常に実際のquerySelector結果を同期的に返すため、
    // initialConditionが効くのはgetServerSnapshotが使われるSSR時のみ
    const { result } = renderHook(() =>
      useDeferUntilRender('target', '.marker', {
        rootRef,
        initialCondition: true,
      }),
    );
    expect(result.current.state).toBe('pending');
  });

  it('preserveOnceReadyを指定した場合、readyになった後は監視を継続しない', async () => {
    const { result } = renderHook(() =>
      useDeferUntilRender('target', '.marker', {
        rootRef,
        preserveOnceReady: true,
        detectionDelay: 100,
      }),
    );

    const marker = document.createElement('div');
    marker.className = 'marker';
    await act(async () => {
      root.appendChild(marker);
      await Promise.resolve();
      vi.advanceTimersByTime(100);
    });
    expect(result.current.state).toBe('ready');

    // 監視終了後に要素を消してもready状態を維持する
    await act(async () => {
      marker.remove();
      await Promise.resolve();
      vi.advanceTimersByTime(100);
    });
    expect(result.current.state).toBe('ready');
  });

  it.each([null, undefined, ''])(
    'クエリが%sの場合は待たずにreadyになる',
    (query) => {
      const { result } = renderHook(() =>
        useDeferUntilRender('target', query, { rootRef }),
      );
      expect(result.current.state).toBe('ready');
    },
  );
  it('クエリが未指定になった場合はreadyに戻る', () => {
    const { result, rerender } = renderHook(
      ({ query }: { query: string | null }) =>
        useDeferUntilRender('target', query, { rootRef }),
      { initialProps: { query: '.marker' as string | null } },
    );
    expect(result.current.state).toBe('pending');

    rerender({ query: null });
    expect(result.current.state).toBe('ready');
  });
});
