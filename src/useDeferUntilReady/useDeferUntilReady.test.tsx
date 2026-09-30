import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RenderingState } from '../constants';
import useDeferUntilReady from './useDeferUntilReady';

describe('useDeferUntilReady', () => {
  it('readyかつdeferが未指定の場合、即座にtargetが返る', () => {
    const { result } = renderHook(() => useDeferUntilReady('target', 'ready'));
    expect(result.current.state).toBe('ready');
    expect(result.current.node).toBe('target');
  });

  it('pending状態でpendingノードを指定しない場合、nodeはundefinedになる', () => {
    const { result } = renderHook(() =>
      useDeferUntilReady('target', 'pending'),
    );
    expect(result.current.state).toBe('pending');
    expect(result.current.node).toBeUndefined();
  });

  it('pending状態でpendingノードを指定した場合、そのノードが返る', () => {
    const { result } = renderHook(() =>
      useDeferUntilReady('target', 'pending', { pending: 'loading' }),
    );
    expect(result.current.node).toBe('loading');
  });

  it('fallback状態でfallbackノードを指定した場合、そのノードが返る', () => {
    const { result } = renderHook(() =>
      useDeferUntilReady('target', 'fallback', { fallback: 'error' }),
    );
    expect(result.current.node).toBe('error');
  });

  describe('遅延表示', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('readyDeferを指定した場合、指定時間経過後にtargetが反映される', () => {
      const { result } = renderHook(() =>
        useDeferUntilReady('target', 'ready', { readyDefer: 100 }),
      );
      expect(result.current.node).toBeNull();

      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current.node).toBe('target');
    });

    it('pendingDeferを指定した場合、指定時間経過後にpendingノードが反映される', () => {
      const { result } = renderHook(() =>
        useDeferUntilReady('target', 'pending', {
          pending: 'loading',
          pendingDefer: 100,
        }),
      );
      expect(result.current.node).toBeNull();

      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current.node).toBe('loading');
    });

    it('遅延中にstateが変わった場合、以前のタイマーはキャンセルされる', () => {
      const { result, rerender } = renderHook(
        ({ state }: { state: RenderingState }) =>
          useDeferUntilReady('target', state, {
            pending: 'loading',
            readyDefer: 100,
          }),
        { initialProps: { state: 'ready' as RenderingState } },
      );
      expect(result.current.node).toBeNull();

      rerender({ state: 'pending' });
      expect(result.current.node).toBe('loading');

      act(() => {
        vi.advanceTimersByTime(100);
      });
      // ready用のタイマーはキャンセルされているのでtargetにはならない
      expect(result.current.node).toBe('loading');
    });
  });

  describe('ノードの更新', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('ready後にtargetが変更された場合、nodeに反映される', () => {
      const { result, rerender } = renderHook(
        ({ target }: { target: string }) => useDeferUntilReady(target, 'ready'),
        { initialProps: { target: 'target1' } },
      );
      expect(result.current.node).toBe('target1');

      rerender({ target: 'target2' });
      expect(result.current.node).toBe('target2');
    });

    it('pending中にpendingノードが変更された場合、nodeに反映される', () => {
      const { result, rerender } = renderHook(
        ({ pending }: { pending: string }) =>
          useDeferUntilReady('target', 'pending', { pending }),
        { initialProps: { pending: 'loading1' } },
      );
      expect(result.current.node).toBe('loading1');

      rerender({ pending: 'loading2' });
      expect(result.current.node).toBe('loading2');
    });

    it('fallback中にfallbackノードが変更された場合、nodeに反映される', () => {
      const { result, rerender } = renderHook(
        ({ fallback }: { fallback: string }) =>
          useDeferUntilReady('target', 'fallback', { fallback }),
        { initialProps: { fallback: 'error1' } },
      );
      expect(result.current.node).toBe('error1');

      rerender({ fallback: 'error2' });
      expect(result.current.node).toBe('error2');
    });

    it('readyDeferによる遅延中は、表示中のpendingノードの更新が反映される', () => {
      type Props = { state: RenderingState; pending: string; target: string };
      const { result, rerender } = renderHook(
        ({ state, pending, target }: Props) =>
          useDeferUntilReady(target, state, { pending, readyDefer: 100 }),
        {
          initialProps: {
            state: 'pending',
            pending: 'loading1',
            target: 'target1',
          } as Props,
        },
      );
      expect(result.current.node).toBe('loading1');

      rerender({ state: 'ready', pending: 'loading2', target: 'target1' });
      expect(result.current.node).toBe('loading2');

      rerender({ state: 'ready', pending: 'loading2', target: 'target2' });
      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current.node).toBe('target2');
    });

    it('preserveOnceReadyでready維持中にtargetが変更された場合、nodeに反映される', () => {
      const { result, rerender } = renderHook(
        ({ state, target }: { state: RenderingState; target: string }) =>
          useDeferUntilReady(target, state, { preserveOnceReady: true }),
        {
          initialProps: {
            state: 'ready' as RenderingState,
            target: 'target1',
          },
        },
      );

      rerender({ state: 'pending', target: 'target2' });
      expect(result.current.state).toBe('ready');
      expect(result.current.node).toBe('target2');
    });
  });

  describe('preserveOnceReady', () => {
    it('一度readyになったら、以降pendingに戻ってもready状態を維持する', () => {
      const { result, rerender } = renderHook(
        ({ state }: { state: RenderingState }) =>
          useDeferUntilReady('target', state, { preserveOnceReady: true }),
        { initialProps: { state: 'ready' as RenderingState } },
      );
      expect(result.current.state).toBe('ready');

      rerender({ state: 'pending' });
      expect(result.current.state).toBe('ready');
      expect(result.current.node).toBe('target');
    });
  });

  describe('preserveOnceFallback', () => {
    it('一度fallbackになったら、以降pendingに戻ってもfallback状態を維持する', () => {
      const { result, rerender } = renderHook(
        ({ state }: { state: RenderingState }) =>
          useDeferUntilReady('target', state, {
            fallback: 'error',
            preserveOnceFallback: true,
          }),
        { initialProps: { state: 'fallback' as RenderingState } },
      );
      expect(result.current.state).toBe('fallback');

      rerender({ state: 'pending' });
      expect(result.current.state).toBe('fallback');
      expect(result.current.node).toBe('error');
    });
  });
});
