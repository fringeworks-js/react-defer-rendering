import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import useDeferUntilTrue from './useDeferUntilTrue';

describe('useDeferUntilTrue', () => {
  it('conditionがtrueの場合、readyとしてtargetが返る', () => {
    const { result } = renderHook(() => useDeferUntilTrue('target', true, {}));
    expect(result.current.state).toBe('ready');
    expect(result.current.node).toBe('target');
  });

  it('conditionがfalseの場合、pendingとして扱われる', () => {
    const { result } = renderHook(() =>
      useDeferUntilTrue('target', false, { pending: 'loading' }),
    );
    expect(result.current.state).toBe('pending');
    expect(result.current.node).toBe('loading');
  });

  it('conditionがnull/undefinedの場合もpendingとして扱われる', () => {
    const { result: nullResult } = renderHook(() =>
      useDeferUntilTrue('target', null, {}),
    );
    expect(nullResult.current.state).toBe('pending');

    const { result: undefinedResult } = renderHook(() =>
      useDeferUntilTrue('target', undefined, {}),
    );
    expect(undefinedResult.current.state).toBe('pending');
  });

  it('conditionの変化に追従してstateが切り替わる', () => {
    const { result, rerender } = renderHook(
      ({ condition }) => useDeferUntilTrue('target', condition, {}),
      { initialProps: { condition: false } },
    );
    expect(result.current.state).toBe('pending');

    rerender({ condition: true });
    expect(result.current.state).toBe('ready');
    expect(result.current.node).toBe('target');
  });
  it('optionsを省略できる', () => {
    const { result } = renderHook(() => useDeferUntilTrue('target', true));
    expect(result.current.state).toBe('ready');
  });
});
