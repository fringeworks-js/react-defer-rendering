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
