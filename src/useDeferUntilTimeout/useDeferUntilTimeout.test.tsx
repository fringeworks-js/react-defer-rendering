import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useDeferUntilTimeout from './useDeferUntilTimeout';

describe('useDeferUntilTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('deferが未指定（null）の場合、最初からreadyになる', () => {
    const { result } = renderHook(() => useDeferUntilTimeout('target', null));
    expect(result.current.state).toBe('ready');
  });

  it('deferが0以下の場合、即座にreadyになる', () => {
    const { result } = renderHook(() => useDeferUntilTimeout('target', 0));
    expect(result.current.state).toBe('ready');

    const { result: negativeResult } = renderHook(() =>
      useDeferUntilTimeout('target', -100),
    );
    expect(negativeResult.current.state).toBe('ready');
  });

  it('deferが正の値の場合、経過時間まではpendingになる', () => {
    const { result } = renderHook(() => useDeferUntilTimeout('target', 100));
    expect(result.current.state).toBe('pending');

    act(() => {
      vi.advanceTimersByTime(99);
    });
    expect(result.current.state).toBe('pending');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.state).toBe('ready');
    expect(result.current.node).toBe('target');
  });

  it('アンマウント時にタイマーがキャンセルされる', () => {
    const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
    const { unmount } = renderHook(() => useDeferUntilTimeout('target', 100));

    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();

    clearTimeoutSpy.mockRestore();
  });
  it('deferが変わった場合は改めて待つ', () => {
    const { result, rerender } = renderHook(
      ({ defer }: { defer: number }) => useDeferUntilTimeout('target', defer),
      { initialProps: { defer: 100 } },
    );
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current.state).toBe('ready');

    rerender({ defer: 200 });
    expect(result.current.state).toBe('pending');

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(result.current.state).toBe('ready');
  });

  it('null -> 数値 -> null と変化した場合、pendingを経てreadyに戻る', () => {
    const { result, rerender } = renderHook(
      ({ defer }: { defer: number | null }) =>
        useDeferUntilTimeout('target', defer),
      { initialProps: { defer: null as number | null } },
    );
    expect(result.current.state).toBe('ready');

    rerender({ defer: 100 });
    expect(result.current.state).toBe('pending');

    rerender({ defer: null });
    expect(result.current.state).toBe('ready');

    // 保留中だったタイマーは破棄されている
    expect(vi.getTimerCount()).toBe(0);
  });
});
