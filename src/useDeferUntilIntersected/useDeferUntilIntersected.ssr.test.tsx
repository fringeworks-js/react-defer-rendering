// @vitest-environment node
import type { RefObject } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import useDeferUntilIntersected from './useDeferUntilIntersected';

function Fixture({ initialCondition }: { initialCondition?: boolean }) {
  const elementRef: RefObject<HTMLElement | null> = { current: null };
  const { node } = useDeferUntilIntersected('ready-content', elementRef, {
    pending: 'pending-content',
    initialCondition,
  });
  return <>{node}</>;
}

describe('useDeferUntilIntersected (SSR)', () => {
  it('window/IntersectionObserverが存在しない環境でもrenderToStringが例外なく完了する', () => {
    // getSnapshotはrefに保持した監視結果を読むだけだが、
    // subscribe自体はSSR時に呼ばれずgetServerSnapshotが使われることを確認する
    expect(() => renderToString(<Fixture />)).not.toThrow();
  });

  it('initialConditionを指定しない場合、pending側のノードがSSR出力に含まれる', () => {
    const html = renderToString(<Fixture />);
    expect(html).toContain('pending-content');
    expect(html).not.toContain('ready-content');
  });

  it('initialCondition: trueを指定した場合、ready側のノードがSSR出力に含まれる', () => {
    const html = renderToString(<Fixture initialCondition />);
    expect(html).toContain('ready-content');
    expect(html).not.toContain('pending-content');
  });
});
