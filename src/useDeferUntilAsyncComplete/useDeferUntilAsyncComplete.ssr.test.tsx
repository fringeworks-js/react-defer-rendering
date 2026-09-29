// @vitest-environment node
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import useDeferUntilAsyncComplete from './useDeferUntilAsyncComplete';

describe('useDeferUntilAsyncComplete (SSR)', () => {
  it('SSR時はasyncFnを実行せず、pending側のノードが出力される', () => {
    const asyncFn = vi.fn(() => Promise.resolve());
    function Fixture() {
      const { node } = useDeferUntilAsyncComplete('ready-content', asyncFn, {
        pending: 'pending-content',
      });
      return <>{node}</>;
    }

    const html = renderToString(<Fixture />);
    expect(asyncFn).not.toHaveBeenCalled();
    expect(html).toContain('pending-content');
    expect(html).not.toContain('ready-content');
  });
});
