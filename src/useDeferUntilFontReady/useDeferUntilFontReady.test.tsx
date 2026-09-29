import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import useDeferUntilFontReady from './useDeferUntilFontReady';

const { setLoadImpl, FontFaceObserverMock } = vi.hoisted(() => {
  let impl: () => Promise<void> = () => new Promise(() => {});
  // newで呼び出せるようclass構文でモックする
  class FontFaceObserverMockClass {
    load = vi.fn(() => impl());
  }
  const FontFaceObserverMock = vi.fn(FontFaceObserverMockClass);
  return {
    setLoadImpl: (fn: () => Promise<void>) => {
      impl = fn;
    },
    FontFaceObserverMock,
  };
});

vi.mock('fontfaceobserver', () => ({ default: FontFaceObserverMock }));

describe('useDeferUntilFontReady', () => {
  beforeEach(() => {
    setLoadImpl(() => new Promise(() => {}));
    FontFaceObserverMock.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('フォントの読み込みが成功するとreadyになる', async () => {
    setLoadImpl(() => Promise.resolve());
    const { result } = renderHook(() =>
      useDeferUntilFontReady('target', 'Roboto', {}),
    );
    expect(result.current.state).toBe('pending');

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.state).toBe('ready');
    expect(result.current.node).toBe('target');
  });

  it('フォントの読み込みが失敗するとfallbackになる', async () => {
    setLoadImpl(() => Promise.reject(new Error('timeout')));
    const { result } = renderHook(() =>
      useDeferUntilFontReady('target', 'Roboto', { fallback: 'error' }),
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.state).toBe('fallback');
    expect(result.current.node).toBe('error');
  });

  it('loaderを指定した場合、loader成功後にフォント確認が行われる', async () => {
    setLoadImpl(() => Promise.resolve());
    const loader = vi.fn(() => Promise.resolve());
    const { result } = renderHook(() =>
      useDeferUntilFontReady('target', 'Roboto', { loader }),
    );

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(loader).toHaveBeenCalled();
    expect(result.current.state).toBe('ready');
  });

  it('loaderが失敗した場合はfallbackになる', async () => {
    const loader = vi.fn(() => Promise.reject(new Error('load failed')));
    const { result } = renderHook(() =>
      useDeferUntilFontReady('target', 'Roboto', {
        loader,
        fallback: 'error',
      }),
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.state).toBe('fallback');
    // FontFaceObserverでの確認自体は行われない
    expect(FontFaceObserverMock).not.toHaveBeenCalled();
  });

  it('initialStateを指定した場合、確認完了までその値が維持される', () => {
    // load()を保留状態にしたまま、マウント直後の状態を確認する
    const { result } = renderHook(() =>
      useDeferUntilFontReady('target', 'Roboto', { initialState: 'ready' }),
    );
    // isFirstRunのガードにより、マウント直後にpendingへリセットされない
    expect(result.current.state).toBe('ready');
  });

  it('マウント後にfontFamilyが変わった場合は改めてpendingになる', async () => {
    setLoadImpl(() => new Promise(() => {}));
    const { result, rerender } = renderHook(
      ({ fontFamily }: { fontFamily: string }) =>
        useDeferUntilFontReady('target', fontFamily, {
          initialState: 'ready',
        }),
      { initialProps: { fontFamily: 'Roboto' } },
    );
    expect(result.current.state).toBe('ready');

    rerender({ fontFamily: 'Noto Sans' });
    expect(result.current.state).toBe('pending');
  });

  it.each([null, undefined])(
    'fontFamilyが%sの場合は待たずにreadyになる',
    (fontFamily) => {
      const loader = vi.fn(() => Promise.resolve());
      const { result } = renderHook(() =>
        useDeferUntilFontReady('target', fontFamily, {
          pending: 'loading',
          loader,
        }),
      );
      expect(result.current.state).toBe('ready');
      expect(result.current.node).toBe('target');
      expect(loader).not.toHaveBeenCalled();
      expect(FontFaceObserverMock).not.toHaveBeenCalled();
    },
  );

  it('fontFamilyが未指定になった場合はreadyに戻る', () => {
    const { result, rerender } = renderHook(
      ({ fontFamily }: { fontFamily: string | undefined }) =>
        useDeferUntilFontReady('target', fontFamily, {}),
      { initialProps: { fontFamily: 'Roboto' as string | undefined } },
    );
    expect(result.current.state).toBe('pending');

    rerender({ fontFamily: undefined });
    expect(result.current.state).toBe('ready');
  });

  it('未指定から指定に変わった場合はpendingになる', () => {
    const { result, rerender } = renderHook(
      ({ fontFamily }: { fontFamily: string | undefined }) =>
        useDeferUntilFontReady('target', fontFamily, {}),
      { initialProps: { fontFamily: undefined as string | undefined } },
    );
    expect(result.current.state).toBe('ready');

    rerender({ fontFamily: 'Roboto' });
    expect(result.current.state).toBe('pending');
  });
  it('未指定に変わった後に古いフォント確認が失敗しても状態に反映されない', async () => {
    let rejectLoad!: () => void;
    setLoadImpl(
      () =>
        new Promise<void>((_, reject) => {
          rejectLoad = reject;
        }),
    );
    const { result, rerender } = renderHook(
      ({ fontFamily }: { fontFamily: string | null }) =>
        useDeferUntilFontReady('target', fontFamily),
      { initialProps: { fontFamily: 'Roboto' as string | null } },
    );

    rerender({ fontFamily: null });
    expect(result.current.state).toBe('ready');

    await act(async () => {
      rejectLoad();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.state).toBe('ready');
  });

  it('フォントを切り替えた後に古いフォント確認が成功しても状態に反映されない', async () => {
    const resolvers: (() => void)[] = [];
    setLoadImpl(
      () =>
        new Promise<void>((resolve) => {
          resolvers.push(resolve);
        }),
    );
    const { result, rerender } = renderHook(
      ({ fontFamily }: { fontFamily: string }) =>
        useDeferUntilFontReady('target', fontFamily),
      { initialProps: { fontFamily: 'Roboto' } },
    );

    rerender({ fontFamily: 'Noto Sans' });
    await act(async () => {
      resolvers[0]();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.state).toBe('pending');

    await act(async () => {
      resolvers[1]();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.state).toBe('ready');
  });

  it('loaderの完了前に未指定に変わった場合、フォント確認は行われない', async () => {
    let resolveLoader!: () => void;
    const loader = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveLoader = resolve;
        }),
    );
    const { result, rerender } = renderHook(
      ({ fontFamily }: { fontFamily: string | null }) =>
        useDeferUntilFontReady('target', fontFamily, { loader }),
      { initialProps: { fontFamily: 'Roboto' as string | null } },
    );

    rerender({ fontFamily: null });
    await act(async () => {
      resolveLoader();
      await Promise.resolve();
    });
    expect(FontFaceObserverMock).not.toHaveBeenCalled();
    expect(result.current.state).toBe('ready');
  });
  it('optionsを省略できる', () => {
    const { result } = renderHook(() => useDeferUntilFontReady('target', null));
    expect(result.current.state).toBe('ready');
  });
});
