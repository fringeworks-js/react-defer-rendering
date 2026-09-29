import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import useDeferUntilAsyncComplete from './useDeferUntilAsyncComplete';

describe('useDeferUntilAsyncComplete', () => {
  it('asyncFnが未指定（null）の場合、最初からreadyになる', () => {
    const { result } = renderHook(() =>
      useDeferUntilAsyncComplete('target', null),
    );
    expect(result.current.state).toBe('ready');
  });

  it('asyncFnが解決するとreadyになる', async () => {
    const asyncFn = vi.fn(() => Promise.resolve());
    const { result } = renderHook(() =>
      useDeferUntilAsyncComplete('target', asyncFn),
    );
    expect(result.current.state).toBe('pending');

    await act(async () => {
      await asyncFn.mock.results[0].value;
    });
    expect(result.current.state).toBe('ready');
  });

  it('asyncFnがrejectするとfallbackになる', async () => {
    const asyncFn = vi.fn(() => Promise.reject(new Error('failed')));
    const { result } = renderHook(() =>
      useDeferUntilAsyncComplete('target', asyncFn, { fallback: 'error' }),
    );

    await act(async () => {
      await asyncFn.mock.results[0].value.catch(() => {});
    });
    expect(result.current.state).toBe('fallback');
  });

  it('同じasyncFn参照の間は再実行されない', async () => {
    const asyncFn = vi.fn(() => Promise.resolve());
    const { rerender } = renderHook(
      ({ fn }: { fn: () => Promise<void> }) =>
        useDeferUntilAsyncComplete('target', fn),
      { initialProps: { fn: asyncFn } },
    );
    expect(asyncFn).toHaveBeenCalledTimes(1);

    rerender({ fn: asyncFn });
    expect(asyncFn).toHaveBeenCalledTimes(1);

    // asyncFnの解決を待ってから終了する（act警告防止）
    await act(async () => {
      await asyncFn.mock.results[0].value;
    });
  });
  it('asyncFnが同期的に例外を投げた場合はfallbackになる', () => {
    const asyncFn = vi.fn((): Promise<void> => {
      throw new Error('sync error');
    });
    const { result } = renderHook(() =>
      useDeferUntilAsyncComplete('target', asyncFn, { fallback: 'error' }),
    );
    expect(result.current.state).toBe('fallback');
    expect(result.current.node).toBe('error');
  });

  it('null -> asyncFn -> null と変化した場合、pendingを経てreadyに戻り、古い結果は反映されない', async () => {
    let rejectFn!: (error: Error) => void;
    const asyncFn = vi.fn(
      () =>
        new Promise<void>((_, reject) => {
          rejectFn = reject;
        }),
    );
    const { result, rerender } = renderHook(
      ({ fn }: { fn: (() => Promise<void>) | null }) =>
        useDeferUntilAsyncComplete('target', fn),
      { initialProps: { fn: null as (() => Promise<void>) | null } },
    );
    expect(result.current.state).toBe('ready');

    rerender({ fn: asyncFn });
    expect(result.current.state).toBe('pending');
    expect(asyncFn).toHaveBeenCalledTimes(1);

    rerender({ fn: null });
    expect(result.current.state).toBe('ready');

    await act(async () => {
      rejectFn(new Error('failed'));
      await asyncFn.mock.results[0].value.catch(() => {});
    });
    expect(result.current.state).toBe('ready');
  });
});
