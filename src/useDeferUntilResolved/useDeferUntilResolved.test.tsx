import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import useDeferUntilResolved from './useDeferUntilResolved';

describe('useDeferUntilResolved', () => {
  it('promiseが未指定（null）の場合、最初からreadyになる', () => {
    const { result } = renderHook(() => useDeferUntilResolved('target', null));
    expect(result.current.state).toBe('ready');
  });

  it('promiseが指定されている間はpendingになる', () => {
    const promise = new Promise<void>(() => {});
    const { result } = renderHook(() =>
      useDeferUntilResolved('target', promise, { pending: 'loading' }),
    );
    expect(result.current.state).toBe('pending');
    expect(result.current.node).toBe('loading');
  });

  it('promiseがresolveするとreadyになる', async () => {
    const promise = Promise.resolve();
    const { result } = renderHook(() =>
      useDeferUntilResolved('target', promise),
    );
    expect(result.current.state).toBe('pending');

    await act(async () => {
      await promise;
    });
    expect(result.current.state).toBe('ready');
    expect(result.current.node).toBe('target');
  });

  it('promiseがrejectするとfallbackになる', async () => {
    const promise = Promise.reject(new Error('failed'));
    const { result } = renderHook(() =>
      useDeferUntilResolved('target', promise, { fallback: 'error' }),
    );
    expect(result.current.state).toBe('pending');

    await act(async () => {
      await promise.catch(() => {});
    });
    expect(result.current.state).toBe('fallback');
    expect(result.current.node).toBe('error');
  });

  it('アンマウント後にpromiseが解決してもエラーにならない', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    let resolvePromise: () => void;
    const promise = new Promise<void>((resolve) => {
      resolvePromise = resolve;
    });
    const { unmount } = renderHook(() =>
      useDeferUntilResolved('target', promise),
    );

    unmount();
    await act(async () => {
      resolvePromise();
      await promise;
    });

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('null -> promise -> null と変化した場合、pendingを経てreadyに戻る', () => {
    const { result, rerender } = renderHook(
      ({ promise }: { promise: Promise<void> | null }) =>
        useDeferUntilResolved('target', promise),
      { initialProps: { promise: null as Promise<void> | null } },
    );
    expect(result.current.state).toBe('ready');

    rerender({ promise: new Promise<void>(() => {}) });
    expect(result.current.state).toBe('pending');

    rerender({ promise: null });
    expect(result.current.state).toBe('ready');
  });

  it('差し替え前のpromiseが後から解決しても状態に反映されない', async () => {
    let rejectOld!: () => void;
    const oldPromise = new Promise<void>((_, reject) => {
      rejectOld = reject;
    });
    const newPromise = new Promise<void>(() => {});
    const { result, rerender } = renderHook(
      ({ promise }: { promise: Promise<void> }) =>
        useDeferUntilResolved('target', promise),
      { initialProps: { promise: oldPromise } },
    );

    rerender({ promise: newPromise });
    await act(async () => {
      rejectOld();
      await oldPromise.catch(() => {});
    });
    expect(result.current.state).toBe('pending');
  });
});
