# @fringeworks/react-defer-rendering

`@fringeworks/react-defer-rendering` は、指定した条件が満たされるまでコンポーネントの描画を遅延させることに特化したニッチなライブラリです。\
タイマー、Promise、ブラウザAPI（`matchMedia`、`IntersectionObserver`等）など、様々な条件に対応したフック群を提供します。

**[English README is available here](./README.md)**

## インストール

```bash
npm install @fringeworks/react-defer-rendering
# または
pnpm add @fringeworks/react-defer-rendering
```

## 使い方

各フックは、対象ノードの描画状態を表す `state`（`'pending' | 'fallback' | 'ready'`）と、状態に応じて描画すべき `node` を返します。

```tsx
import { useDeferUntilTrue } from '@fringeworks/react-defer-rendering';

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

| フック                                                                                                | 未指定として扱われる第二引数           |
| ----------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `useDeferUntilTimeout` / `useDeferUntilDate` / `useDeferUntilResolved` / `useDeferUntilAsyncComplete` | `null` / `undefined`                   |
| `useDeferUntilBreakpoint` / `useDeferUntilRender`                                                     | `null` / `undefined` / 空文字          |
| `useDeferUntilWebFontReady`                                                                           | `null` / `undefined` / 空文字 / 空配列 |
| `useDeferUntilIntersected` / `useDeferUntilScrolled`                                                  | 参照（ref）自体が`null` / `undefined`  |

`useDeferUntilIntersected` / `useDeferUntilScrolled`では、参照はあるものの`ref.current`が`null`の場合は「要素がまだマウントされていない」とみなし、`pending`のままになります。

```tsx
function Heading({ fontFamily, children }: Props) {
  // fontFamilyが未指定なら待たずに表示する
  const { node } = useDeferUntilWebFontReady(<h1>{children}</h1>, fontFamily, {
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
import { useDeferUntilReady } from '@fringeworks/react-defer-rendering';

const { node } = useDeferUntilReady(<MyComponent />, state, {
  pending: <Spinner />,
  fallback: <ErrorMessage />,
});
```

### `useDeferUntilTrue`

真偽値の条件が`true`になるまで描画を遅延させます。

```tsx
import { useDeferUntilTrue } from '@fringeworks/react-defer-rendering';

const { node } = useDeferUntilTrue(<MyComponent />, isReady, {
  pending: <Spinner />,
});
```

## 時間経過を待つ

### `useDeferUntilTimeout`

指定の時間（ミリ秒）が経過するまで描画を遅延させます。

```tsx
import { useDeferUntilTimeout } from '@fringeworks/react-defer-rendering';

const { node } = useDeferUntilTimeout(<MyComponent />, 3000, {
  pending: <Spinner />,
});
```

### `useDeferUntilDate`

指定の日時になるまで描画を遅延させます。

```tsx
import { useDeferUntilDate } from '@fringeworks/react-defer-rendering';

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
import { useDeferUntilResolved } from '@fringeworks/react-defer-rendering';

const { node } = useDeferUntilResolved(<MyComponent />, fetchPromise, {
  pending: <Spinner />,
  fallback: <ErrorMessage />,
});
```

### `useDeferUntilAsyncComplete`

非同期関数の実行が完了するまで描画を遅延させます。`asyncFn`はマウント後（effect内）に呼び出され、Promiseの生成自体を管理します。SSR時は呼び出されません。\n`asyncFn`の参照が変わるたびに再実行されるため、`useCallback`等でメモ化してください。

```tsx
import { useDeferUntilAsyncComplete } from '@fringeworks/react-defer-rendering';
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
import { useDeferUntilChange } from '@fringeworks/react-defer-rendering';

const { node } = useDeferUntilChange(<Toast>{message}</Toast>, message, {
  pending: null,
});
```

## 任意のタイミングで手動制御する

### `useDeferUntilOnReady`

戻り値の`onReady` / `onFallback` / `onPending`を呼び出すことで、任意のタイミングで状態を制御できます。イベントハンドラー等、フック側では検知できない条件に対応する場合に使用します。

```tsx
import { useDeferUntilOnReady } from '@fringeworks/react-defer-rendering';

const { node, onReady } = useDeferUntilOnReady(<Video />, {
  pending: <Spinner />,
});

<video onCanPlay={onReady}>{node}</video>;
```

### `useDeferUntilCallThreshold`

`useDeferUntilOnReady`と同様ですが、各ハンドラーが指定回数呼ばれて初めて状態が切り替わります。

```tsx
import { useDeferUntilCallThreshold } from '@fringeworks/react-defer-rendering';

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
import { useDeferUntilBreakpoint } from '@fringeworks/react-defer-rendering';

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
import { useDeferUntilIntersected } from '@fringeworks/react-defer-rendering';

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
import { useDeferUntilRender } from '@fringeworks/react-defer-rendering';

const { node } = useDeferUntilRender(<Overlay />, '#third-party-widget', {
  pending: null,
});
```

### `useDeferUntilWebFontReady`

指定のWebフォントがすべて利用可能になるまで描画を遅延させます。Webフォントの確認には[`@fringeworks/web-font-observer`](https://www.npmjs.com/package/@fringeworks/web-font-observer)を使用しています。\
対象は`@font-face`で定義されたWebフォントです。システムフォントはロードの完了を検知できないため、指定するとタイムアウト後に`fallback`になります。

```tsx
import { useDeferUntilWebFontReady } from '@fringeworks/react-defer-rendering';

const { node } = useDeferUntilWebFontReady(
  <Heading>Title</Heading>,
  'Noto Sans JP',
  {
    pending: <Heading style={{ visibility: 'hidden' }}>Title</Heading>,
  },
);
```

複数のWebフォントを待つ場合は配列で指定します。太さなどを指定する場合はオブジェクトで指定します。配列内の`null` / `undefined`は無視されるため、条件付きでWebフォントを追加できます。\
配列やオブジェクトはインラインで記述しても問題ありません（内容が変わらない限り待機はやり直されません）。

```tsx
const { node } = useDeferUntilWebFontReady(<Article />, [
  { family: 'Noto Sans JP', text: 'あ' },
  { family: 'Roboto', weight: 400 },
  isBold ? { family: 'Roboto', weight: 700 } : null,
]);
```

| オプション      | 型                                       | デフォルト  | 説明                                                                                             |
| --------------- | ---------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------ |
| `timeout?`      | `number`                                 | `3000`      | Webフォントが利用可能にならなかった場合に`fallback`とするまでの時間（ミリ秒）                    |
| `loader?`       | `(signal: AbortSignal) => Promise<void>` | -           | Webフォントをロードする関数。完了後に確認を開始します。待つWebフォントが変わった時のみ呼ばれます |
| `initialState?` | `'pending' \| 'ready' \| 'fallback'`     | `'pending'` | SSR時など、読み込み状態を判定できない環境での初期状態                                            |

オブジェクトで指定できる`weight` / `style` / `width` / `text`は`@fringeworks/web-font-observer`と同じです。

- 1つでも利用可能にならなかった場合は`fallback`になり、残りの待機は中断されます。
- 既にロード済みのWebフォントは待たずに`ready`になります（キャッシュ済みの場合にちらつきません）。
- `fallback`になった後でWebフォントのロードが完了した場合は`ready`になります。`fallback`を維持したい場合は`preserveOnceFallback`を指定してください。
- `@font-face`の定義は遅延対象のノードの外（グローバルなCSSやレイアウト等）に置いてください。遅延対象の中にあると定義が登録されず、タイムアウトまで待つことになります。

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

`useDeferUntilReady` / `useDeferUntilResolved` / `useDeferUntilAsyncComplete` / `useDeferUntilOnReady` / `useDeferUntilCallThreshold` / `useDeferUntilWebFontReady` は、失敗時の状態として`fallback`にも対応しています。

| オプション              | 型          | 説明                                           |
| ----------------------- | ----------- | ---------------------------------------------- |
| `fallback?`             | `ReactNode` | 失敗時に表示するノード                         |
| `fallbackDefer?`        | `number`    | `fallback`を表示するまでの遅延時間（ミリ秒）   |
| `preserveOnceFallback?` | `boolean`   | 一度`fallback`になったら、その状態を保持するか |

## SSR / RSCでの利用について

このライブラリの各フックには、ビルド時に`'use client'`ディレクティブが付与されています。Next.jsのApp Router等のReact Server Components環境でも、追加の設定なくクライアントコンポーネントの境界として扱われます。

`useDeferUntilBreakpoint` / `useDeferUntilIntersected` / `useDeferUntilScrolled` / `useDeferUntilRender` はブラウザAPI（`matchMedia`、`IntersectionObserver`、`MutationObserver`等）に依存するため、サーバー上では実際の状態を判定できません。これらのフックは`initialCondition`オプションで、SSR時に使用する初期値を指定できます（未指定の場合は`false`として扱われます）。同様に`useDeferUntilWebFontReady`は`initialState`オプションでSSR時の初期状態を指定できます。

## ライセンス

MIT
