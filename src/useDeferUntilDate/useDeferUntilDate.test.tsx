import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useDeferUntilDate from './useDeferUntilDate';

describe('useDeferUntilDate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('dateが未指定（null）の場合、最初からreadyになる', () => {
    const { result } = renderHook(() => useDeferUntilDate('target', null));
    expect(result.current.state).toBe('ready');
  });

  it('dateが過去の場合、即座にreadyになる', () => {
    const { result } = renderHook(() =>
      useDeferUntilDate('target', new Date('2023-12-31T23:59:00Z')),
    );
    expect(result.current.state).toBe('ready');
  });

  it('dateが未来の場合、到達するまでpendingになりその後readyになる', () => {
    const { result } = renderHook(() =>
      useDeferUntilDate('target', new Date('2024-01-01T00:00:00.100Z')),
    );
    expect(result.current.state).toBe('pending');

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current.state).toBe('ready');
    expect(result.current.node).toBe('target');
  });
  it('dateが変わった場合は新しい日時まで待つ', () => {
    const { result, rerender } = renderHook(
      ({ date }: { date: Date | null }) => useDeferUntilDate('target', date),
      { initialProps: { date: null as Date | null } },
    );
    expect(result.current.state).toBe('ready');

    rerender({ date: new Date('2024-01-01T00:00:00.100Z') });
    expect(result.current.state).toBe('pending');

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current.state).toBe('ready');
  });
});
