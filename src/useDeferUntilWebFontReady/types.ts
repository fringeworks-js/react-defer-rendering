import type { WebFontMatchOptions } from '@fringeworks/web-font-observer';
import type { ReactNode } from 'react';
import type { RenderingState } from '../constants';
import type { UseDeferUntilReadyOptions } from '../useDeferUntilReady';

/**
 * 太さ等を指定して待つWebフォント
 */
export type WebFont = WebFontMatchOptions & {
  /**
   * フォントファミリー
   */
  family: string;
};

/**
 * 待つWebフォント\
 * フォントファミリーのみで良い場合は文字列で指定できる
 */
export type WebFontTarget = string | WebFont;

/**
 * 待つWebフォントの指定\
 * 複数のWebフォントを待つ場合は配列で指定する。配列内のnull/undefinedは無視される
 */
export type WebFontTargets =
  | WebFontTarget
  | readonly (WebFontTarget | null | undefined)[];

export type UseDeferUntilWebFontReadyOptions<
  P extends ReactNode = ReactNode,
  E extends ReactNode = ReactNode,
> = UseDeferUntilReadyOptions<P, E> & {
  /**
   * Webフォントが利用可能にならなかった場合に失敗とみなすまでの時間（ミリ秒）\
   * Webフォントごとに適用されるが、すべて並行して待つため実質的に全体の待ち時間となる\
   * デフォルトはブラウザがWebフォントを待つ時間（block period）の推奨値と同じ3000ms
   * @default 3000
   */
  timeout?: number;

  /**
   * Webフォントをロードする関数\
   * 完了後にWebフォントの確認が行われる。待つWebフォントが変わった時のみ呼ばれる
   * @param signal 待機が不要になった時に中断されるAbortSignal
   * @returns
   */
  loader?: (signal: AbortSignal) => Promise<void>;

  /**
   * SSR時など、実際のWebフォント読み込み状態を判定できない環境での初期状態\
   * デフォルトは'pending'
   * @default 'pending'
   */
  initialState?: RenderingState;
};
