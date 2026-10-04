import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WebFontTargets } from './types';
import useDeferUntilWebFontReady from './useDeferUntilWebFontReady';

const { waitForWebFontMock, isWebFontLoadedMock } = vi.hoisted(() => ({
  waitForWebFontMock: vi.fn(),
  isWebFontLoadedMock: vi.fn(),
}));

vi.mock('@fringeworks/web-font-observer/waitForWebFont', () => ({
  default: waitForWebFontMock,
}));
vi.mock('@fringeworks/web-font-observer/isWebFontLoaded', () => ({
  default: isWebFontLoadedMock,
}));

/**
 * 保留中のPromiseを外から解決できるようにする
 */
function deferred() {
  let resolve!: () => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/**
 * 保留中の非同期処理を進める
 */
async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/**
 * waitForWebFontに渡されたsignalを取得する
 */
function getSignal(callIndex: number): AbortSignal {
  return waitForWebFontMock.mock.calls[callIndex][1].signal;
}

describe('useDeferUntilWebFontReady', () => {
  beforeEach(() => {
    waitForWebFontMock.mockImplementation(() => new Promise(() => {}));
    isWebFontLoadedMock.mockReturnValue(false);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('単一のWebフォント', () => {
    it('Webフォントが利用可能になるとreadyになる', async () => {
      waitForWebFontMock.mockResolvedValue([]);
      const { result } = renderHook(() =>
        useDeferUntilWebFontReady('target', 'Roboto'),
      );
      expect(result.current.state).toBe('pending');

      await flush();
      expect(result.current.state).toBe('ready');
      expect(result.current.node).toBe('target');
      expect(waitForWebFontMock).toHaveBeenCalledWith(
        'Roboto',
        expect.objectContaining({ signal: expect.any(AbortSignal) }),
      );
    });

    it('Webフォントが利用可能にならなかった場合はfallbackになる', async () => {
      waitForWebFontMock.mockRejectedValue(
        new DOMException('timeout', 'TimeoutError'),
      );
      const { result } = renderHook(() =>
        useDeferUntilWebFontReady('target', 'Roboto', { fallback: 'error' }),
      );

      await flush();
      expect(result.current.state).toBe('fallback');
      expect(result.current.node).toBe('error');
    });

    it('オブジェクトで指定した場合、太さ等とtimeoutがwaitForWebFontに渡される', () => {
      renderHook(() =>
        useDeferUntilWebFontReady(
          'target',
          { family: 'Roboto', weight: 700, style: 'italic', text: 'あ' },
          { timeout: 1000 },
        ),
      );
      expect(waitForWebFontMock).toHaveBeenCalledWith(
        'Roboto',
        expect.objectContaining({
          weight: 700,
          style: 'italic',
          text: 'あ',
          timeout: 1000,
        }),
      );
    });
  });

  describe('複数のWebフォント', () => {
    it('すべてのWebフォントが利用可能になるまでpendingのまま', async () => {
      const roboto = deferred();
      const noto = deferred();
      waitForWebFontMock.mockImplementation((family: string) =>
        family === 'Roboto' ? roboto.promise : noto.promise,
      );
      const { result } = renderHook(() =>
        useDeferUntilWebFontReady('target', ['Roboto', 'Noto Sans JP']),
      );
      expect(waitForWebFontMock).toHaveBeenCalledTimes(2);

      roboto.resolve();
      await flush();
      expect(result.current.state).toBe('pending');

      noto.resolve();
      await flush();
      expect(result.current.state).toBe('ready');
    });

    it('同じファミリーの複数の太さを待てる', () => {
      renderHook(() =>
        useDeferUntilWebFontReady('target', [
          { family: 'Roboto', weight: 400 },
          { family: 'Roboto', weight: 700 },
        ]),
      );
      expect(waitForWebFontMock).toHaveBeenCalledWith(
        'Roboto',
        expect.objectContaining({ weight: 400 }),
      );
      expect(waitForWebFontMock).toHaveBeenCalledWith(
        'Roboto',
        expect.objectContaining({ weight: 700 }),
      );
    });

    it('1つでも失敗するとfallbackになり、残りの待機は中断される', async () => {
      const noto = deferred();
      waitForWebFontMock.mockImplementation((family: string) =>
        family === 'Roboto' ? noto.promise : new Promise(() => {}),
      );
      const { result } = renderHook(() =>
        useDeferUntilWebFontReady('target', ['Roboto', 'Noto Sans JP']),
      );

      noto.reject(new DOMException('timeout', 'TimeoutError'));
      await flush();
      expect(result.current.state).toBe('fallback');
      expect(getSignal(1).aborted).toBe(true);
    });

    it('配列内のnull/undefined/空文字は無視される', () => {
      renderHook(() =>
        useDeferUntilWebFontReady('target', [null, 'Roboto', undefined, '']),
      );
      expect(waitForWebFontMock).toHaveBeenCalledTimes(1);
      expect(waitForWebFontMock).toHaveBeenCalledWith(
        'Roboto',
        expect.anything(),
      );
    });

    it('インラインで指定した配列の参照が変わっても、内容が同じなら待機をやり直さない', () => {
      const { rerender } = renderHook(() =>
        useDeferUntilWebFontReady('target', [
          'Roboto',
          { family: 'Noto Sans JP', weight: 700 },
        ]),
      );
      rerender();
      rerender();
      expect(waitForWebFontMock).toHaveBeenCalledTimes(2);
      expect(getSignal(0).aborted).toBe(false);
    });
  });

  describe('loader', () => {
    it('loaderの完了後にWebフォントの確認が行われる', async () => {
      const load = deferred();
      const loader = vi.fn(() => load.promise);
      waitForWebFontMock.mockResolvedValue([]);
      const { result } = renderHook(() =>
        useDeferUntilWebFontReady('target', 'Roboto', { loader }),
      );
      expect(loader).toHaveBeenCalledWith(expect.any(AbortSignal));
      expect(waitForWebFontMock).not.toHaveBeenCalled();

      load.resolve();
      await flush();
      expect(waitForWebFontMock).toHaveBeenCalled();
      expect(result.current.state).toBe('ready');
    });

    it('loaderが失敗した場合はfallbackになり、Webフォントの確認は行われない', async () => {
      const loader = vi.fn(() => Promise.reject(new Error('load failed')));
      const { result } = renderHook(() =>
        useDeferUntilWebFontReady('target', 'Roboto', {
          loader,
          fallback: 'error',
        }),
      );

      await flush();
      expect(result.current.state).toBe('fallback');
      expect(waitForWebFontMock).not.toHaveBeenCalled();
    });

    it('loaderの参照が変わっただけでは再実行しない', () => {
      const { rerender } = renderHook(() =>
        useDeferUntilWebFontReady('target', 'Roboto', {
          loader: () => new Promise(() => {}),
        }),
      );
      rerender();
      rerender();
      expect(waitForWebFontMock).not.toHaveBeenCalled();
    });

    it('loaderの完了前に未指定に変わった場合、Webフォントの確認は行われない', async () => {
      const load = deferred();
      let signal: AbortSignal;
      const loader = vi.fn((s: AbortSignal) => {
        signal = s;
        return load.promise;
      });
      const { result, rerender } = renderHook(
        ({ fonts }: { fonts: string | null }) =>
          useDeferUntilWebFontReady('target', fonts, { loader }),
        { initialProps: { fonts: 'Roboto' as string | null } },
      );

      rerender({ fonts: null });
      expect(signal!.aborted).toBe(true);
      load.resolve();
      await flush();
      expect(waitForWebFontMock).not.toHaveBeenCalled();
      expect(result.current.state).toBe('ready');
    });
  });

  describe('ロード済みのWebフォント', () => {
    it('既にロード済みの場合は最初からreadyになる', () => {
      isWebFontLoadedMock.mockReturnValue(true);
      const { result } = renderHook(() =>
        useDeferUntilWebFontReady('target', 'Roboto', { pending: 'loading' }),
      );
      expect(result.current.state).toBe('ready');
      expect(result.current.node).toBe('target');
    });

    it('複数の場合は、すべてロード済みの時のみ最初からreadyになる', () => {
      isWebFontLoadedMock.mockImplementation(
        (family: string) => family === 'Roboto',
      );
      const { result } = renderHook(() =>
        useDeferUntilWebFontReady('target', ['Roboto', 'Noto Sans JP']),
      );
      expect(result.current.state).toBe('pending');
    });

    it('FontFaceSetのloadingdoneイベントで再判定する', () => {
      const fonts = new EventTarget();
      Object.defineProperty(document, 'fonts', {
        value: fonts,
        configurable: true,
      });
      try {
        const { result } = renderHook(() =>
          useDeferUntilWebFontReady('target', 'Roboto'),
        );
        expect(result.current.state).toBe('pending');

        isWebFontLoadedMock.mockReturnValue(true);
        act(() => {
          fonts.dispatchEvent(new Event('loadingdone'));
        });
        expect(result.current.state).toBe('ready');
      } finally {
        delete (document as { fonts?: unknown }).fonts;
      }
    });
  });

  describe('待つWebフォントの変更', () => {
    it('initialStateを指定した場合、確認完了までその値が維持される', () => {
      const { result } = renderHook(() =>
        useDeferUntilWebFontReady('target', 'Roboto', {
          initialState: 'ready',
        }),
      );
      expect(result.current.state).toBe('ready');
    });

    it('マウント後に待つWebフォントが変わった場合は即座にpendingになり、前の待機は中断される', () => {
      const { result, rerender } = renderHook(
        ({ fonts }: { fonts: string }) =>
          useDeferUntilWebFontReady('target', fonts, { initialState: 'ready' }),
        { initialProps: { fonts: 'Roboto' } },
      );
      expect(result.current.state).toBe('ready');

      rerender({ fonts: 'Noto Sans JP' });
      expect(result.current.state).toBe('pending');
      expect(getSignal(0).aborted).toBe(true);
    });

    it('待つWebフォントを切り替えた後に、前の確認が成功しても状態に反映されない', async () => {
      const roboto = deferred();
      const noto = deferred();
      waitForWebFontMock.mockImplementation((family: string) =>
        family === 'Roboto' ? roboto.promise : noto.promise,
      );
      const { result, rerender } = renderHook(
        ({ fonts }: { fonts: string }) =>
          useDeferUntilWebFontReady('target', fonts),
        { initialProps: { fonts: 'Roboto' } },
      );

      rerender({ fonts: 'Noto Sans JP' });
      roboto.resolve();
      await flush();
      expect(result.current.state).toBe('pending');

      noto.resolve();
      await flush();
      expect(result.current.state).toBe('ready');
    });

    it('未指定に変わった後に前の確認が失敗しても状態に反映されない', async () => {
      const roboto = deferred();
      waitForWebFontMock.mockImplementation(() => roboto.promise);
      const { result, rerender } = renderHook(
        ({ fonts }: { fonts: string | null }) =>
          useDeferUntilWebFontReady('target', fonts),
        { initialProps: { fonts: 'Roboto' as string | null } },
      );

      rerender({ fonts: null });
      expect(result.current.state).toBe('ready');

      roboto.reject(new DOMException('timeout', 'TimeoutError'));
      await flush();
      expect(result.current.state).toBe('ready');
    });

    it('未指定から指定に変わった場合はpendingになる', () => {
      const { result, rerender } = renderHook(
        ({ fonts }: { fonts: string | undefined }) =>
          useDeferUntilWebFontReady('target', fonts),
        { initialProps: { fonts: undefined as string | undefined } },
      );
      expect(result.current.state).toBe('ready');

      rerender({ fonts: 'Roboto' });
      expect(result.current.state).toBe('pending');
    });

    it('アンマウント時に待機が中断される', () => {
      const { unmount } = renderHook(() =>
        useDeferUntilWebFontReady('target', 'Roboto'),
      );
      unmount();
      expect(getSignal(0).aborted).toBe(true);
    });
  });

  it.each<[string, WebFontTargets | null | undefined]>([
    ['null', null],
    ['undefined', undefined],
    ['空文字', ''],
    ['空配列', []],
    ['null/undefinedのみの配列', [null, undefined]],
  ])('待つWebフォントが%sの場合は待たずにreadyになる', (_, fonts) => {
    const loader = vi.fn(() => Promise.resolve());
    const { result } = renderHook(() =>
      useDeferUntilWebFontReady('target', fonts, {
        pending: 'loading',
        loader,
      }),
    );
    expect(result.current.state).toBe('ready');
    expect(result.current.node).toBe('target');
    expect(loader).not.toHaveBeenCalled();
    expect(waitForWebFontMock).not.toHaveBeenCalled();
  });
});
