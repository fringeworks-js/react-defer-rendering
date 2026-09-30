// @vitest-environment node
import { renderToString } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { RenderingState } from '../constants';
import type { WebFontTargets } from './types';
import useDeferUntilWebFontReady from './useDeferUntilWebFontReady';

function Fixture({
  fonts = 'Roboto',
  initialState,
}: {
  fonts?: WebFontTargets | null;
  initialState?: RenderingState;
}) {
  const { node } = useDeferUntilWebFontReady('ready-content', fonts, {
    pending: 'pending-content',
    initialState,
  });
  return <>{node}</>;
}

describe('useDeferUntilWebFontReady (SSR)', () => {
  it('documentが存在しない環境でもrenderToStringが例外なく完了する', () => {
    expect(() => renderToString(<Fixture />)).not.toThrow();
  });

  it('initialStateを指定しない場合、pending側のノードがSSR出力に含まれる', () => {
    const html = renderToString(<Fixture />);
    expect(html).toContain('pending-content');
    expect(html).not.toContain('ready-content');
  });

  it('initialState: readyを指定した場合、ready側のノードがSSR出力に含まれる', () => {
    const html = renderToString(<Fixture initialState="ready" />);
    expect(html).toContain('ready-content');
  });

  it('待つWebフォントが未指定の場合、ready側のノードがSSR出力に含まれる', () => {
    const html = renderToString(<Fixture fonts={null} />);
    expect(html).toContain('ready-content');
  });
});
