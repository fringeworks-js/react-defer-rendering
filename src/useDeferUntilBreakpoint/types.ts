import type { ReactNode } from 'react';
import type { UseDeferUntilTrueOptions } from '../useDeferUntilTrue';

export type UseDeferUntilBreakpointOptions<P extends ReactNode = ReactNode> =
  UseDeferUntilTrueOptions<P> & {
    /**
     * メディアクエリーの変化を反映するまでの時間（ミリ秒）\
     * この間に続けて変化した場合は、最後の変化から数え直す。0の場合は次のタスクで反映する\
     * デフォルトは100ms
     * @default 100
     */
    detectionDelay?: number;

    /**
     * SSR時など、実際のメディアクエリーを判定できない環境での初期値\
     * デフォルトはfalse
     * @default false
     */
    initialCondition?: boolean;
  };
