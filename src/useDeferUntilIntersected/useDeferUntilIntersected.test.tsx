import { act, renderHook } from '@testing-library/react';
import type { RefObject } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useDeferUntilIntersected from './useDeferUntilIntersected';

class MockIntersectionObserver {
  static instances: MockIntersectionObserver[] = [];
  callback: IntersectionObserverCallback;
  options: IntersectionObserverInit | undefined;
  observedElements: Element[] = [];
  disconnected = false;

  constructor(
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit,
  ) {
    this.callback = callback;
    this.options = options;
    MockIntersectionObserver.instances.push(this);
  }

  observe(element: Element) {
    this.observedElements.push(element);
  }

  unobserve(element: Element) {
    this.observedElements = this.observedElements.filter((e) => e !== element);
  }

  disconnect() {
    this.disconnected = true;
  }

  trigger(isIntersecting: boolean) {
    this.callback(
      [{ isIntersecting } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
}

describe('useDeferUntilIntersected', () => {
  beforeEach(() => {
    MockIntersectionObserver.instances = [];
    vi.stubGlobal('IntersectionObserver', MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('要素がない場合、observerは作成されずpendingのままになる', () => {
    const elementRef: RefObject<HTMLElement | null> = { current: null };
    const { result } = renderHook(() =>
      useDeferUntilIntersected('target', elementRef),
    );
    expect(result.current.state).toBe('pending');
    expect(MockIntersectionObserver.instances.length).toBe(0);
  });

  it('要素がある場合、observeが呼ばれ初期状態はpendingになる', () => {
    const elementRef: RefObject<HTMLElement | null> = {
      current: document.createElement('div'),
    };
    const { result } = renderHook(() =>
      useDeferUntilIntersected('target', elementRef),
    );
    expect(result.current.state).toBe('pending');
    expect(MockIntersectionObserver.instances.length).toBe(1);
    expect(MockIntersectionObserver.instances[0].observedElements).toContain(
      elementRef.current,
    );
  });

  it('initialConditionを指定した場合、observer発火前はその値が反映される', () => {
    const elementRef: RefObject<HTMLElement | null> = {
      current: document.createElement('div'),
    };
    const { result } = renderHook(() =>
      useDeferUntilIntersected('target', elementRef, {
        initialCondition: true,
      }),
    );
    expect(result.current.state).toBe('ready');
  });

  it('isIntersecting: trueが通知されるとreadyになる', () => {
    const elementRef: RefObject<HTMLElement | null> = {
      current: document.createElement('div'),
    };
    const { result } = renderHook(() =>
      useDeferUntilIntersected('target', elementRef),
    );

    act(() => {
      MockIntersectionObserver.instances[0].trigger(true);
    });
    expect(result.current.state).toBe('ready');
    expect(result.current.node).toBe('target');
  });

  it('isIntersecting: falseに戻るとpendingに戻る', () => {
    const elementRef: RefObject<HTMLElement | null> = {
      current: document.createElement('div'),
    };
    const { result } = renderHook(() =>
      useDeferUntilIntersected('target', elementRef),
    );

    act(() => {
      MockIntersectionObserver.instances[0].trigger(true);
    });
    expect(result.current.state).toBe('ready');

    act(() => {
      MockIntersectionObserver.instances[0].trigger(false);
    });
    expect(result.current.state).toBe('pending');
  });

  it('threshold・rootMarginがIntersectionObserverに渡される', () => {
    const elementRef: RefObject<HTMLElement | null> = {
      current: document.createElement('div'),
    };
    renderHook(() =>
      useDeferUntilIntersected('target', elementRef, {
        threshold: 0.5,
        rootMargin: '10px',
      }),
    );
    expect(MockIntersectionObserver.instances[0].options?.threshold).toBe(0.5);
    expect(MockIntersectionObserver.instances[0].options?.rootMargin).toBe(
      '10px',
    );
  });

  it('アンマウント時にdisconnectが呼ばれる', () => {
    const elementRef: RefObject<HTMLElement | null> = {
      current: document.createElement('div'),
    };
    const { unmount } = renderHook(() =>
      useDeferUntilIntersected('target', elementRef),
    );

    unmount();
    expect(MockIntersectionObserver.instances[0].disconnected).toBe(true);
  });
  it.each([null, undefined])(
    '参照自体が%sの場合は待たずにreadyになる',
    (elementRef) => {
      const { result } = renderHook(() =>
        useDeferUntilIntersected('target', elementRef, { pending: 'loading' }),
      );
      expect(result.current.state).toBe('ready');
      expect(result.current.node).toBe('target');
      expect(MockIntersectionObserver.instances.length).toBe(0);
    },
  );
  it('参照を差し替えた場合、前の要素の交差状態を引き継がない', () => {
    const refA: RefObject<HTMLElement | null> = {
      current: document.createElement('div'),
    };
    const refB: RefObject<HTMLElement | null> = {
      current: document.createElement('div'),
    };
    const { result, rerender } = renderHook(
      ({ ref }: { ref: RefObject<HTMLElement | null> | null }) =>
        useDeferUntilIntersected('target', ref),
      { initialProps: { ref: refA as RefObject<HTMLElement | null> | null } },
    );
    act(() => {
      MockIntersectionObserver.instances[0].trigger(true);
    });
    expect(result.current.state).toBe('ready');

    rerender({ ref: null });
    expect(result.current.state).toBe('ready');

    rerender({ ref: refB });
    expect(result.current.state).toBe('pending');

    act(() => {
      MockIntersectionObserver.instances.at(-1)!.trigger(true);
    });
    expect(result.current.state).toBe('ready');
  });
});
