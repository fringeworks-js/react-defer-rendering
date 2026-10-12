// @vitest-environment node
import type { RefObject } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import useDeferUntilScrolled from './useDeferUntilScrolled';

function Fixture({ initialCondition }: { initialCondition?: boolean }) {
  const elementRef: RefObject<HTMLElement | null> = { current: null };
  const { node } = useDeferUntilScrolled('ready-content', elementRef, {
    pending: 'pending-content',
    initialCondition,
  });
  return <>{node}</>;
}

describe('useDeferUntilScrolled (SSR)', () => {
  it('documentが存在しない環境でもrenderToStringが例外なく完了する', () => {
    // 以前はrootRefの初期値としてトップレベルでdocument.documentElementを
    // 参照しており、SSR環境では`document is not defined`で必ずクラッシュしていた。
    // 現在はdocument参照をuseEffect内に移動しているため、
    // レンダリング（useEffectを実行しないrenderToString）では例外にならない。
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
