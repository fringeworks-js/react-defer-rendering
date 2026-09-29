import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import useDeferUntilCallThreshold from './useDeferUntilCallThreshold';

describe('useDeferUntilCallThreshold', () => {
  it('デフォルト（1回）では、onReadyを1回呼ぶとreadyになる', () => {
    const { result } = renderHook(() =>
      useDeferUntilCallThreshold('target', {}),
    );

    act(() => {
      result.current.onReady();
    });
    expect(result.current.state).toBe('ready');
  });

  it('onReadyCountを指定した場合、指定回数未満ではreadyにならない', () => {
    const { result } = renderHook(() =>
      useDeferUntilCallThreshold('target', { onReadyCount: 3 }),
    );

    act(() => {
      result.current.onReady();
    });
    expect(result.current.state).toBe('pending');

    act(() => {
      result.current.onReady();
    });
    expect(result.current.state).toBe('pending');

    act(() => {
      result.current.onReady();
    });
    expect(result.current.state).toBe('ready');
  });

  it('onFallbackCountを指定した場合、指定回数目でfallbackになる', () => {
    const { result } = renderHook(() =>
      useDeferUntilCallThreshold('target', {
        fallback: 'error',
        onFallbackCount: 2,
      }),
    );

    act(() => {
      result.current.onFallback();
    });
    expect(result.current.state).toBe('pending');

    act(() => {
      result.current.onFallback();
    });
    expect(result.current.state).toBe('fallback');
    expect(result.current.node).toBe('error');
  });

  it('onPendingCountを指定した場合、指定回数目でpendingに戻る', () => {
    const { result } = renderHook(() =>
      useDeferUntilCallThreshold('target', {
        pending: 'loading',
        onPendingCount: 2,
      }),
    );

    act(() => {
      result.current.onReady();
    });
    expect(result.current.state).toBe('ready');

    act(() => {
      result.current.onPending();
    });
    expect(result.current.state).toBe('ready');

    act(() => {
      result.current.onPending();
    });
    expect(result.current.state).toBe('pending');
    expect(result.current.node).toBe('loading');
  });
  it('optionsを省略できる', () => {
    const { result } = renderHook(() => useDeferUntilCallThreshold('target'));
    expect(result.current.state).toBe('pending');

    act(() => {
      result.current.onReady();
    });
    expect(result.current.state).toBe('ready');
  });
});
