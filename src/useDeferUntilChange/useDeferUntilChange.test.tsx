import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import useDeferUntilChange from './useDeferUntilChange';

describe('useDeferUntilChange', () => {
  it('マウント後、変化がなければreadyに収束する', () => {
    const { result } = renderHook(() => useDeferUntilChange('target', 'a', {}));
    expect(result.current.state).toBe('ready');
    expect(result.current.node).toBe('target');
  });

  it('同じ値で再レンダーしてもready状態を維持する', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) =>
        useDeferUntilChange('target', value, {}),
      { initialProps: { value: 'a' } },
    );
    expect(result.current.state).toBe('ready');

    rerender({ value: 'a' });
    expect(result.current.state).toBe('ready');
  });

  it('値が変化した場合も、最終的にはreadyへ収束する', () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) =>
        useDeferUntilChange('target', value, {}),
      { initialProps: { value: 'a' } },
    );
    expect(result.current.state).toBe('ready');

    rerender({ value: 'b' });
    expect(result.current.state).toBe('ready');
    expect(result.current.node).toBe('target');
  });

  it('pendingノードを指定できる', () => {
    const { result } = renderHook(() =>
      useDeferUntilChange('target', 'a', { pending: 'loading' }),
    );
    // 初回コミット後は変化なしと判定されreadyに収束するため、
    // 定常状態としてはpendingノードではなくtargetが返る
    expect(result.current.state).toBe('ready');
    expect(result.current.node).toBe('target');
  });
});
