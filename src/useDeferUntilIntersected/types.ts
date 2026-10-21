import type { ReactNode, RefObject } from 'react';
import type { UseDeferUntilTrueOptions } from '../useDeferUntilTrue';

export type UseDeferUntilIntersectedOptions<P extends ReactNode = ReactNode> =
  UseDeferUntilTrueOptions<P> & {
    /**
     * 監視するコンテナーの参照
     * デフォルトはnull（ビューポート）
     */
    rootRef?: RefObject<Element | null | undefined>;

    /**
     * 交差を判定する範囲を広げる余白\
     * 数値はピクセル（上下左右に同じ値）、文字列はIntersectionObserverのrootMarginの書式（例: `'10px 0px'`、`'10%'`。単位は`px`と`%`のみ）\
     * 未指定の場合はビューポート（rootRefを指定した場合はコンテナー）の端で判定される
     */
    rootMargin?: number | string;

    /**
     * ビューポートに基準となる要素がどの程度の割合入ったら描画するか(0～1)\
     * デフォルトは0.1（10%）
     * @default 0.1
     */
    threshold?: number;

    /**
     * SSR時など、実際の交差状態を判定できない環境での初期値\
     * デフォルトはfalse
     * @default false
     */
    initialCondition?: boolean;
  };
