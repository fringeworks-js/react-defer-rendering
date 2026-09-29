import type { ReactNode } from 'react';
import type { RenderingState } from '../constants';
import type { UseDeferUntilReadyOptions } from '../useDeferUntilReady';

export type UseDeferUntilFontReadyOptions<
  P extends ReactNode = ReactNode,
  E extends ReactNode = ReactNode,
> = UseDeferUntilReadyOptions<P, E> & {
  /**
   *　フォントの太さ
   */
  fontWeight?: number | string | null | undefined;

  /**
   *　フォントの通常体 (normal)、筆記体 (italic)、斜体(oblique)
   */
  fontStyle?: string | null | undefined;

  /**
   *　フォントの通常、圧縮、引き伸ばし
   */
  fontStretch?: string | null | undefined;

  /**
   * 読み込みに失敗した場合のタイムアウト（ミリ秒）
   * デフォルトは4000ms
   * @default 4000
   */
  timeout?: number;

  /**
   * フォントをロードする関数
   * @returns
   */
  loader?: () => Promise<void>;

  /**
   * SSR時など、実際のフォント読み込み状態を判定できない環境での初期状態\
   * デフォルトは'pending'
   * @default 'pending'
   */
  initialState?: RenderingState;
};
