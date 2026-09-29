# @niche-works/react-defer-rendering

`@niche-works/react-defer-rendering` は、指定した条件が満たされるまでコンポーネントの描画を遅延させることに特化したニッチなライブラリです。\
タイマー、Promise、ブラウザAPI（`matchMedia`、`IntersectionObserver`等）など、様々な条件に対応したフック群を提供します。

**[English README is available here](./README.md)**

## インストール

```bash
npm install @niche-works/react-defer-rendering
# または
pnpm add @niche-works/react-defer-rendering
```

## 使い方

各フックは、対象ノードの描画状態を表す `state`（`'pending' | 'fallback' | 'ready'`）と、状態に応じて描画すべき `node` を返します。

```tsx
import { useDeferUntilTrue } from '@niche-works/react-defer-rendering';

const { node } = useDeferUntilTrue(<MyComponent />, isReady, {
  pending: <Spinner />,
});

return node;
```

- 条件を満たしていない間（`pending`）は、`pending` オプションに指定したノードが表示されます
- 条件を満たすと（`ready`）、第一引数に渡した対象ノードに切り替わります
- 一部のフックは失敗時の状態（`fallback`）にも対応しています

### 待つ対象が未指定の場合

待つ対象を受け取るフックは、第二引数が`null` / `undefined`の場合、待つものがないとみなして即座に`ready`になります。途中で未指定に変わった場合も`ready`に戻り、未指定から指定に変わった場合は改めて`pending`から待ち始めます。\
フックは条件付きで呼び出せないため、コンポーネントの機能として遅延描画を任意にしたい場合は、第二引数に`undefined`を渡すことで無効にできます。

| フック                                                                                                                           | 未指定として扱われる第二引数          |
| -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| `useDeferUntilTimeout` / `useDeferUntilDate` / `useDeferUntilResolved` / `useDeferUntilAsyncComplete` | `null` / `undefined`                  |
| `useDeferUntilBreakpoint` / `useDeferUntilRender` / `useDeferUntilFontReady`                                                                                | `null` / `undefined` / 空文字         |
| `useDeferUntilIntersected` / `useDeferUntilScrolled`                                                                             | 参照（ref）自体が`null` / `undefined` |

`useDeferUntilIntersected` / `useDeferUntilScrolled`では、参照はあるものの`ref.current`が`null`の場合は「要素がまだマウントされていない」とみなし、`pending`のままになります。

```tsx
function Heading({ fontFamily, children }: Props) {
  // fontFamilyが未指定なら待たずに表示する
  const { node } = useDeferUntilFontReady(<h1>{children}</h1>, fontFamily, {
    pending: null,
  });
  return node;
}
```

なお、`useDeferUntilTrue`の第二引数は条件そのものであり、`null` / `undefined`は条件を満たしていない（`pending`）として扱われます。

## 基本のフック

### `useDeferUntilReady`

`state`（`'pending' | 'fallback' | 'ready'`）を直接指定して描画を制御する、最も基本的なフックです。他のフックはすべてこのフックをベースに実装されています。

```tsx
import { useDeferUntilReady } from '@niche-works/react-defer-rendering';

const { node } = useDeferUntilReady(<MyComponent />, state, {
  pending: <Spinner />,
  fallback: <ErrorMessage />,
});
```

### `useDeferUntilTrue`

真偽値の条件が`true`になるまで描画を遅延させます。

```tsx
import { useDeferUntilTrue } from '@niche-works/react-defer-rendering';

const { node } = useDeferUntilTrue(<MyComponent />, isReady, {
  pending: <Spinner />,
});
```

## 時間経過を待つ

### `useDeferUntilTimeout`

指定の時間（ミリ秒）が経過するまで描画を遅延させます。

```tsx
import { useDeferUntilTimeout } from '@niche-works/react-defer-rendering';

const { node } = useDeferUntilTimeout(<MyComponent />, 3000, {
  pending: <Spinner />,
});
```

### `useDeferUntilDate`

指定の日時になるまで描画を遅延させます。

```tsx
import { useDeferUntilDate } from '@niche-works/react-defer-rendering';

const { node } = useDeferUntilDate(
  <Campaign />,
  new Date('2026-01-01T00:00:00'),
  { pending: <ComingSoon /> },
);
```

## 非同期処理の完了を待つ

### `useDeferUntilResolved`

Promiseが解決（resolve/reject）するまで描画を遅延させます。

```tsx
import { useDeferUntilResolved } from '@niche-works/react-defer-rendering';

const { node } = useDeferUntilResolved(<MyComponent />, fetchPromise, {
  pending: <Spinner />,
  fallback: <ErrorMessage />,
});
```

### `useDeferUntilAsyncComplete`

非同期関数の実行が完了するまで描画を遅延させます。`asyncFn`はマウント後（effect内）に呼び出され、Promiseの生成自体を管理します。SSR時は呼び出されません。\n`asyncFn`の参照が変わるたびに再実行されるため、`useCallback`等でメモ化してください。

```tsx
import { useDeferUntilAsyncComplete } from '@niche-works/react-defer-rendering';
import { useCallback } from 'react';

const loadData = useCallback(
  () => fetch('/api/data').then((res) => res.json()),
  [],
);
const { node } = useDeferUntilAsyncComplete(<MyComponent />, loadData, {
  pending: <Spinner />,
});
```

## 値の変化を待つ

### `useDeferUntilChange`

指定した値が変化するまで描画を遅延させます。値が変化するたびに一時的に`pending`を経由します。

```tsx
import { useDeferUntilChange } from '@niche-works/react-defer-rendering';

const { node } = useDeferUntilChange(<Toast>{message}</Toast>, message, {
  pending: null,
});
```

## 任意のタイミングで手動制御する

### `useDeferUntilOnReady`

戻り値の`onReady` / `onFallback` / `onPending`を呼び出すことで、任意のタイミングで状態を制御できます。イベントハンドラー等、フック側では検知できない条件に対応する場合に使用します。

```tsx
import { useDeferUntilOnReady } from '@niche-works/react-defer-rendering';

const { node, onReady } = useDeferUntilOnReady(<Video />, {
  pending: <Spinner />,
});

<video onCanPlay={onReady}>{node}</video>;
```

### `useDeferUntilCallThreshold`

`useDeferUntilOnReady`と同様ですが、各ハンドラーが指定回数呼ばれて初めて状態が切り替わります。

```tsx
import { useDeferUntilCallThreshold } from '@niche-works/react-defer-rendering';

const { node, onReady } = useDeferUntilCallThreshold(<Gallery />, {
  pending: <Spinner />,
  onReadyCount: 3, // onReadyが3回呼ばれたらreadyにする
});
```

## ブラウザの状態を待つ

> **注意（SSR / RSC）:** ここで挙げるフックはブラウザAPIに依存するため、サーバー上では実際の状態を判定できません。詳細は[SSR / RSCでの利用について](#ssr--rscでの利用について)を参照してください。

### `useDeferUntilBreakpoint`

メディアクエリーが一致するまで描画を遅延させます。

```tsx
import { useDeferUntilBreakpoint } from '@niche-works/react-defer-rendering';

const { node } = useDeferUntilBreakpoint(
  <DesktopNav />,
  '(min-width: 1024px)',
  { pending: <MobileNav /> },
);
```

### `useDeferUntilIntersected`

基準となる要素がビューポートに入るまで描画を遅延させます。

```tsx
import { useRef } from 'react';
import { useDeferUntilIntersected } from '@niche-works/react-defer-rendering';

const elementRef = useRef<HTMLDivElement>(null);
const { node } = useDeferUntilIntersected(<HeavyChart />, elementRef, {
  pending: <Placeholder />,
});

<div ref={elementRef}>{node}</div>;
```

### `useDeferUntilScrolled`

基準となる要素がスクロールによって可視範囲に入るまで描画を遅延させます。

```tsx
const { node } = useDeferUntilScrolled(<LazyImage />, elementRef, {
  pending: <Placeholder />,
  rootMargin: 100,
});
```

### `useDeferUntilRender`

セレクターに一致する要素がDOMに描画されるまで描画を遅延させます。自身の管理外にある要素（サードパーティスクリプトが挿入する要素等）の出現を待つ場合に使用します。

```tsx
import { useDeferUntilRender } from '@niche-works/react-defer-rendering';

const { node } = useDeferUntilRender(<Overlay />, '#third-party-widget', {
  pending: null,
});
```

### `useDeferUntilFontReady`

指定のフォントが利用可能になるまで描画を遅延させます。

```tsx
import { useDeferUntilFontReady } from '@niche-works/react-defer-rendering';

const { node } = useDeferUntilFontReady(
  <Heading>Title</Heading>,
  'Noto Sans JP',
  {
    pending: <Heading style={{ visibility: 'hidden' }}>Title</Heading>,
  },
);
```

## 共通オプション

### `pending` / `ready` に関するオプション

すべてのフックで共通のオプションです。

| オプション           | 型          | 説明                                         |
| -------------------- | ----------- | -------------------------------------------- |
| `pending?`           | `ReactNode` | 条件を待っている間に表示するノード           |
| `pendingDefer?`      | `number`    | `pending`を表示するまでの遅延時間（ミリ秒）  |
| `readyDefer?`        | `number`    | 対象ノードを表示するまでの遅延時間（ミリ秒） |
| `preserveOnceReady?` | `boolean`   | 一度`ready`になったら、その状態を保持するか  |

### `fallback` に関するオプション

`useDeferUntilReady` / `useDeferUntilResolved` / `useDeferUntilAsyncComplete` / `useDeferUntilOnReady` / `useDeferUntilCallThreshold` / `useDeferUntilFontReady` は、失敗時の状態として`fallback`にも対応しています。

| オプション              | 型          | 説明                                           |
| ----------------------- | ----------- | ---------------------------------------------- |
| `fallback?`             | `ReactNode` | 失敗時に表示するノード                         |
| `fallbackDefer?`        | `number`    | `fallback`を表示するまでの遅延時間（ミリ秒）   |
| `preserveOnceFallback?` | `boolean`   | 一度`fallback`になったら、その状態を保持するか |

## SSR / RSCでの利用について

このライブラリの各フックには、ビルド時に`'use client'`ディレクティブが付与されています。Next.jsのApp Router等のReact Server Components環境でも、追加の設定なくクライアントコンポーネントの境界として扱われます。

`useDeferUntilBreakpoint` / `useDeferUntilIntersected` / `useDeferUntilScrolled` / `useDeferUntilRender` はブラウザAPI（`matchMedia`、`IntersectionObserver`、`MutationObserver`等）に依存するため、サーバー上では実際の状態を判定できません。これらのフックは`initialCondition`オプションで、SSR時に使用する初期値を指定できます（未指定の場合は`false`として扱われます）。同様に`useDeferUntilFontReady`は`initialState`オプションでSSR時の初期状態を指定できます。

## ライセンス

MIT
