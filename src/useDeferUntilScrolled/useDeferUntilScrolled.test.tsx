import { act, renderHook } from '@testing-library/react';
import type { RefObject } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useDeferUntilScrolled from './useDeferUntilScrolled';

function makeRect(rect: Partial<DOMRect>): DOMRect {
  return {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    width: 0,
    height: 0,
    x: 0,
    y: 0,
    toJSON() {},
    ...rect,
  } as DOMRect;
}

function mockClientSize(
  element: Element,
  size: { width?: number; height?: number },
) {
  Object.defineProperty(element, 'clientHeight', {
    value: size.height ?? 0,
    configurable: true,
  });
  Object.defineProperty(element, 'clientWidth', {
    value: size.width ?? 0,
    configurable: true,
  });
}

describe('useDeferUntilScrolled', () => {
  let root: HTMLDivElement;
  let element: HTMLDivElement;
  let rootRef: RefObject<HTMLElement | null>;
  let elementRef: RefObject<HTMLElement | null>;

  beforeEach(() => {
    vi.useFakeTimers();
    root = document.createElement('div');
    document.body.appendChild(root);
    mockClientSize(root, { width: 800, height: 800 });
    element = document.createElement('div');
    rootRef = { current: root };
    elementRef = { current: element };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    root.remove();
  });

  it('マウント時に既に可視範囲内であれば即座にreadyになる', () => {
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(
      makeRect({ top: 100, bottom: 200 }),
    );

    const { result } = renderHook(() =>
      useDeferUntilScrolled('target', elementRef, { rootRef }),
    );
    expect(result.current.state).toBe('ready');
  });

  it('可視範囲外の場合pendingになり、scrollイベントで反映される', () => {
    const rectSpy = vi.spyOn(element, 'getBoundingClientRect');
    rectSpy.mockReturnValue(makeRect({ top: 1000, bottom: 1100 }));

    const { result } = renderHook(() =>
      useDeferUntilScrolled('target', elementRef, {
        rootRef,
        detectionDelay: 100,
      }),
    );
    expect(result.current.state).toBe('pending');

    rectSpy.mockReturnValue(makeRect({ top: 100, bottom: 200 }));
    act(() => {
      root.dispatchEvent(new Event('scroll'));
      vi.advanceTimersByTime(100);
    });
    expect(result.current.state).toBe('ready');
    expect(result.current.node).toBe('target');
  });

  it('horizontal方向でも判定できる', () => {
    const rectSpy = vi.spyOn(element, 'getBoundingClientRect');
    rectSpy.mockReturnValue(makeRect({ left: 1000, right: 1100 }));

    const { result } = renderHook(() =>
      useDeferUntilScrolled('target', elementRef, {
        rootRef,
        direction: 'horizontal',
        detectionDelay: 100,
      }),
    );
    expect(result.current.state).toBe('pending');

    rectSpy.mockReturnValue(makeRect({ left: 100, right: 200 }));
    act(() => {
      root.dispatchEvent(new Event('scroll'));
      vi.advanceTimersByTime(100);
    });
    expect(result.current.state).toBe('ready');
  });

  it('initialConditionを指定した場合、マウント時に可視範囲外でも値が維持される', () => {
    // 可視判定がfalseの場合、effectはsetCondition(false)を呼ばず
    // 既存の値（initialCondition）をそのまま維持する
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(
      makeRect({ top: 1000, bottom: 1100 }),
    );

    const { result } = renderHook(() =>
      useDeferUntilScrolled('target', elementRef, {
        rootRef,
        initialCondition: true,
      }),
    );
    expect(result.current.state).toBe('ready');
  });

  it('preserveOnceReadyを指定した場合、readyになった後はscrollリスナーが解除される', () => {
    const rectSpy = vi.spyOn(element, 'getBoundingClientRect');
    rectSpy.mockReturnValue(makeRect({ top: 1000, bottom: 1100 }));
    const removeEventListenerSpy = vi.spyOn(root, 'removeEventListener');

    const { result } = renderHook(() =>
      useDeferUntilScrolled('target', elementRef, {
        rootRef,
        preserveOnceReady: true,
        detectionDelay: 100,
      }),
    );
    expect(result.current.state).toBe('pending');

    rectSpy.mockReturnValue(makeRect({ top: 100, bottom: 200 }));
    act(() => {
      root.dispatchEvent(new Event('scroll'));
      vi.advanceTimersByTime(100);
    });
    expect(result.current.state).toBe('ready');
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'scroll',
      expect.any(Function),
    );
  });

  it('アンマウント時にscrollリスナーが解除される', () => {
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(
      makeRect({ top: 1000, bottom: 1100 }),
    );
    const removeEventListenerSpy = vi.spyOn(root, 'removeEventListener');

    const { unmount } = renderHook(() =>
      useDeferUntilScrolled('target', elementRef, { rootRef }),
    );

    unmount();
    expect(removeEventListenerSpy).toHaveBeenCalledWith(
      'scroll',
      expect.any(Function),
    );
  });

  it('rootRefを指定しない場合、document.documentElementにフォールバックしてもエラーにならない', () => {
    // 前回修正したSSRクラッシュ（トップレベルでのdocument参照）の回帰確認
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(
      makeRect({ top: -10, bottom: 10 }),
    );

    expect(() => {
      renderHook(() => useDeferUntilScrolled('target', elementRef));
    }).not.toThrow();
  });
  it.each([null, undefined])(
    '参照自体が%sの場合は待たずにreadyになる',
    (nullRef) => {
      const addSpy = vi.spyOn(root, 'addEventListener');
      const { result } = renderHook(() =>
        useDeferUntilScrolled('target', nullRef, {
          rootRef,
          pending: 'loading',
        }),
      );
      expect(result.current.state).toBe('ready');
      expect(result.current.node).toBe('target');
      expect(addSpy).not.toHaveBeenCalled();
    },
  );
  it('参照が未指定から指定に変わった場合、可視範囲外ならpendingになる', () => {
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(
      makeRect({ top: 1000, bottom: 1100 }),
    );
    const { result, rerender } = renderHook(
      ({ ref }: { ref: RefObject<HTMLElement | null> | null }) =>
        useDeferUntilScrolled('target', ref, { rootRef }),
      { initialProps: { ref: null as RefObject<HTMLElement | null> | null } },
    );
    expect(result.current.state).toBe('ready');

    rerender({ ref: elementRef });
    expect(result.current.state).toBe('pending');

    rerender({ ref: null });
    expect(result.current.state).toBe('ready');
  });

  it('参照が未指定から指定に変わった場合、可視範囲内ならreadyのままになる', () => {
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(
      makeRect({ top: 100, bottom: 200 }),
    );
    const { result, rerender } = renderHook(
      ({ ref }: { ref: RefObject<HTMLElement | null> | null }) =>
        useDeferUntilScrolled('target', ref, { rootRef }),
      { initialProps: { ref: null as RefObject<HTMLElement | null> | null } },
    );

    rerender({ ref: elementRef });
    expect(result.current.state).toBe('ready');
  });
  it('rootRefを指定しない場合、windowのscrollイベントで反映される', () => {
    mockClientSize(document.documentElement, { width: 800, height: 800 });
    const rectSpy = vi.spyOn(element, 'getBoundingClientRect');
    rectSpy.mockReturnValue(makeRect({ top: 1000, bottom: 1100 }));

    try {
      const { result } = renderHook(() =>
        useDeferUntilScrolled('target', elementRef, { detectionDelay: 100 }),
      );
      expect(result.current.state).toBe('pending');

      rectSpy.mockReturnValue(makeRect({ top: 100, bottom: 200 }));
      act(() => {
        // ページ全体のスクロールはdocumentで発火しwindowへ伝播する
        document.dispatchEvent(new Event('scroll', { bubbles: true }));
        vi.advanceTimersByTime(100);
      });
      expect(result.current.state).toBe('ready');
    } finally {
      mockClientSize(document.documentElement, {});
    }
  });

  it('preserveOnceReadyを指定した場合でも、可視範囲に入るまでは監視を継続する', () => {
    const rectSpy = vi.spyOn(element, 'getBoundingClientRect');
    rectSpy.mockReturnValue(makeRect({ top: 1000, bottom: 1100 }));
    const { result } = renderHook(() =>
      useDeferUntilScrolled('target', elementRef, {
        rootRef,
        preserveOnceReady: true,
        detectionDelay: 100,
      }),
    );

    // 可視範囲に入らないスクロール
    rectSpy.mockReturnValue(makeRect({ top: 900, bottom: 1000 }));
    act(() => {
      root.dispatchEvent(new Event('scroll'));
      vi.advanceTimersByTime(100);
    });
    expect(result.current.state).toBe('pending');

    // 可視範囲に入るスクロール
    rectSpy.mockReturnValue(makeRect({ top: 100, bottom: 200 }));
    act(() => {
      root.dispatchEvent(new Event('scroll'));
      vi.advanceTimersByTime(100);
    });
    expect(result.current.state).toBe('ready');
  });

  it('マウント時に可視範囲内でも、preserveOnceReadyを指定しない場合は範囲外に出るとpendingに戻る', () => {
    const rectSpy = vi.spyOn(element, 'getBoundingClientRect');
    rectSpy.mockReturnValue(makeRect({ top: 100, bottom: 200 }));
    const { result } = renderHook(() =>
      useDeferUntilScrolled('target', elementRef, {
        rootRef,
        detectionDelay: 100,
      }),
    );
    expect(result.current.state).toBe('ready');

    rectSpy.mockReturnValue(makeRect({ top: 1000, bottom: 1100 }));
    act(() => {
      root.dispatchEvent(new Event('scroll'));
      vi.advanceTimersByTime(100);
    });
    expect(result.current.state).toBe('pending');
  });

  it('マウント時に可視範囲内でpreserveOnceReadyを指定した場合はscrollリスナーを登録しない', () => {
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(
      makeRect({ top: 100, bottom: 200 }),
    );
    const addSpy = vi.spyOn(root, 'addEventListener');
    const { result } = renderHook(() =>
      useDeferUntilScrolled('target', elementRef, {
        rootRef,
        preserveOnceReady: true,
      }),
    );
    expect(result.current.state).toBe('ready');
    expect(addSpy).not.toHaveBeenCalled();
  });

  it('rootRefのコンテナーの位置を基準に可視判定する', () => {
    // コンテナーはビューポート上の 500px〜800px に位置する（clientHeightは300px）
    mockClientSize(root, { width: 800, height: 300 });
    vi.spyOn(root, 'getBoundingClientRect').mockReturnValue(
      makeRect({ top: 500, bottom: 800, left: 0, right: 800 }),
    );

    // コンテナー内に表示されている要素
    vi.spyOn(element, 'getBoundingClientRect').mockReturnValue(
      makeRect({ top: 600, bottom: 700 }),
    );
    const { result: inside } = renderHook(() =>
      useDeferUntilScrolled('target', elementRef, { rootRef }),
    );
    expect(inside.current.state).toBe('ready');

    // コンテナーより上にある要素
    const other = document.createElement('div');
    vi.spyOn(other, 'getBoundingClientRect').mockReturnValue(
      makeRect({ top: 100, bottom: 200 }),
    );
    const { result: above } = renderHook(() =>
      useDeferUntilScrolled('target', { current: other }, { rootRef }),
    );
    expect(above.current.state).toBe('pending');
  });

  it('アンマウント時に待機中の判定がキャンセルされる', () => {
    const rectSpy = vi.spyOn(element, 'getBoundingClientRect');
    rectSpy.mockReturnValue(makeRect({ top: 1000, bottom: 1100 }));
    const { unmount } = renderHook(() =>
      useDeferUntilScrolled('target', elementRef, {
        rootRef,
        detectionDelay: 100,
      }),
    );

    act(() => {
      root.dispatchEvent(new Event('scroll'));
    });
    const callCount = rectSpy.mock.calls.length;
    unmount();
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(rectSpy.mock.calls.length).toBe(callCount);
  });
});
