import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useDeferUntilBreakpoint from './useDeferUntilBreakpoint';

type Listener = (event: MediaQueryListEvent) => void;

function createMatchMediaMock(initialMatches: Record<string, boolean> = {}) {
  const registry = new Map<
    string,
    { mql: MediaQueryList; listeners: Set<Listener> }
  >();

  function getEntry(query: string) {
    let entry = registry.get(query);
    if (!entry) {
      const listeners = new Set<Listener>();
      const mql = {
        matches: initialMatches[query] ?? false,
        media: query,
        addEventListener: (type: string, listener: Listener) => {
          if (type === 'change') {
            listeners.add(listener);
          }
        },
        removeEventListener: (type: string, listener: Listener) => {
          if (type === 'change') {
            listeners.delete(listener);
          }
        },
      } as unknown as MediaQueryList;
      entry = { mql, listeners };
      registry.set(query, entry);
    }
    return entry;
  }

  window.matchMedia = vi.fn((query: string) => getEntry(query).mql);

  return {
    listenerCount(query: string) {
      return getEntry(query).listeners.size;
    },
    trigger(query: string, matches: boolean) {
      const entry = getEntry(query);
      (entry.mql as { matches: boolean }).matches = matches;
      const event = { matches, media: query } as MediaQueryListEvent;
      entry.listeners.forEach((listener) => listener(event));
    },
  };
}

describe('useDeferUntilBreakpoint', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('初期状態でmatchesがtrueならreadyになる', () => {
    createMatchMediaMock({ '(max-width: 768px)': true });
    const { result } = renderHook(() =>
      useDeferUntilBreakpoint('target', '(max-width: 768px)'),
    );
    expect(result.current.state).toBe('ready');
  });

  it('初期状態でmatchesがfalseならpendingになる', () => {
    createMatchMediaMock({ '(max-width: 768px)': false });
    const { result } = renderHook(() =>
      useDeferUntilBreakpoint('target', '(max-width: 768px)'),
    );
    expect(result.current.state).toBe('pending');
  });

  it('changeイベントでconditionが切り替わる（detectionDelay経過後）', () => {
    const matchMediaMock = createMatchMediaMock({
      '(max-width: 768px)': false,
    });
    const { result } = renderHook(() =>
      useDeferUntilBreakpoint('target', '(max-width: 768px)', {
        detectionDelay: 100,
      }),
    );
    expect(result.current.state).toBe('pending');

    act(() => {
      matchMediaMock.trigger('(max-width: 768px)', true);
    });
    // デバウンス中はまだ反映されない
    expect(result.current.state).toBe('pending');

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(result.current.state).toBe('ready');
  });

  it('preserveOnceReadyを指定し、既にmatchesがtrueの場合は変更を監視しない', () => {
    const matchMediaMock = createMatchMediaMock({
      '(max-width: 768px)': true,
    });
    const { result } = renderHook(() =>
      useDeferUntilBreakpoint('target', '(max-width: 768px)', {
        preserveOnceReady: true,
        detectionDelay: 0,
      }),
    );
    expect(result.current.state).toBe('ready');
    expect(matchMediaMock.listenerCount('(max-width: 768px)')).toBe(0);

    // 監視していないためfalseに変わってもstateは変化しない
    act(() => {
      matchMediaMock.trigger('(max-width: 768px)', false);
      vi.advanceTimersByTime(100);
    });
    expect(result.current.state).toBe('ready');
  });

  it('preserveOnceReadyを指定しない場合、readyになった後もfalseに戻る', () => {
    const matchMediaMock = createMatchMediaMock({
      '(max-width: 768px)': false,
    });
    const { result } = renderHook(() =>
      useDeferUntilBreakpoint('target', '(max-width: 768px)', {
        detectionDelay: 0,
      }),
    );

    act(() => {
      matchMediaMock.trigger('(max-width: 768px)', true);
      vi.advanceTimersByTime(0);
    });
    expect(result.current.state).toBe('ready');

    act(() => {
      matchMediaMock.trigger('(max-width: 768px)', false);
      vi.advanceTimersByTime(0);
    });
    expect(result.current.state).toBe('pending');
  });

  it('アンマウント時にリスナーが解除される', () => {
    const matchMediaMock = createMatchMediaMock({
      '(max-width: 768px)': false,
    });
    const { unmount } = renderHook(() =>
      useDeferUntilBreakpoint('target', '(max-width: 768px)'),
    );
    expect(matchMediaMock.listenerCount('(max-width: 768px)')).toBe(1);

    unmount();
    expect(matchMediaMock.listenerCount('(max-width: 768px)')).toBe(0);
  });
  it.each([null, undefined, ''])(
    'mediaQueryが%sの場合は待たずにreadyになる',
    (mediaQuery) => {
      createMatchMediaMock();
      const { result } = renderHook(() =>
        useDeferUntilBreakpoint('target', mediaQuery),
      );
      expect(result.current.state).toBe('ready');
      expect(window.matchMedia).not.toHaveBeenCalled();
    },
  );

  it('mediaQueryが未指定になった場合はreadyに戻る', () => {
    createMatchMediaMock({ '(max-width: 768px)': false });
    const { result, rerender } = renderHook(
      ({ mediaQuery }: { mediaQuery: string | undefined }) =>
        useDeferUntilBreakpoint('target', mediaQuery),
      {
        initialProps: {
          mediaQuery: '(max-width: 768px)' as string | undefined,
        },
      },
    );
    expect(result.current.state).toBe('pending');

    rerender({ mediaQuery: undefined });
    expect(result.current.state).toBe('ready');
  });
});
