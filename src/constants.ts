/**
 * 描画に関する状態
 */
export const RenderingState = {
  pending: 'pending',
  fallback: 'fallback',
  ready: 'ready',
} as const;

/**
 * 描画に関する状態
 */
export type RenderingState =
  (typeof RenderingState)[keyof typeof RenderingState];
