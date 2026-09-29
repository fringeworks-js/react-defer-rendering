import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useDeferUntilOnReady from './useDeferUntilOnReady';

describe('useDeferUntilOnReady', () => {
  it('初期状態はpending', () => {
    const { result } = renderHook(() =>
      useDeferUntilOnReady('target', { pending: 'loading' }),
    );
    expect(result.current.state).toBe('pending');
    expect(result.current.node).toBe('loading');
  });

  it('onReadyを呼ぶとreadyになる', () => {
    const { result } = renderHook(() => useDeferUntilOnReady('target', {}));

    act(() => {
      result.current.onReady();
    });
    expect(result.current.state).toBe('ready');
    expect(result.current.node).toBe('target');
  });

  it('onFallbackを呼ぶとfallbackになる', () => {
    const { result } = renderHook(() =>
      useDeferUntilOnReady('target', { fallback: 'error' }),
    );

    act(() => {
      result.current.onFallback();
    });
    expect(result.current.state).toBe('fallback');
    expect(result.current.node).toBe('error');
  });

  it('readyになった後でもonPendingを呼ぶとpendingに戻せる', () => {
    const { result } = renderHook(() =>
      useDeferUntilOnReady('target', { pending: 'loading' }),
    );

    act(() => {
      result.current.onReady();
    });
    expect(result.current.state).toBe('ready');

    act(() => {
      result.current.onPending();
    });
    expect(result.current.state).toBe('pending');
    expect(result.current.node).toBe('loading');
  });

  describe('デバウンスオプション', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('onReadyDelayを指定した場合、指定時間経過後にreadyになる', () => {
      const { result } = renderHook(() =>
        useDeferUntilOnReady('target', { onReadyDelay: 100 }),
      );

      act(() => {
        result.current.onReady();
      });
      expect(result.current.state).toBe('pending');

      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current.state).toBe('ready');
    });

    it('onFallbackDelayを指定した場合、指定時間経過後にfallbackになる', () => {
      const { result } = renderHook(() =>
        useDeferUntilOnReady('target', {
          fallback: 'error',
          onFallbackDelay: 100,
        }),
      );

      act(() => {
        result.current.onFallback();
      });
      expect(result.current.state).toBe('pending');

      act(() => {
        vi.advanceTimersByTime(100);
      });
      expect(result.current.state).toBe('fallback');
    });
  });
  it('optionsを省略できる', () => {
    const { result } = renderHook(() => useDeferUntilOnReady('target'));
    expect(result.current.state).toBe('pending');

    act(() => {
      result.current.onReady();
    });
    expect(result.current.state).toBe('ready');
  });
});
