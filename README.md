# @niche-works/react-defer-rendering

`@niche-works/react-defer-rendering` is a niche library specialized in deferring the rendering of components until a specified condition is met.\
It provides a set of hooks covering a wide range of conditions, including timers, Promises, and browser APIs (`matchMedia`, `IntersectionObserver`, etc.).

**[日本語のREADMEはこちら](./README.ja.md)**

## Installation

```bash
npm install @niche-works/react-defer-rendering
# or
pnpm add @niche-works/react-defer-rendering
```

## Usage

Each hook returns a `state` (`'pending' | 'fallback' | 'ready'`) representing the rendering status of the target node, along with the `node` that should be rendered for that state.

```tsx
import { useDeferUntilTrue } from '@niche-works/react-defer-rendering';

const { node } = useDeferUntilTrue(<MyComponent />, isReady, {
  pending: <Spinner />,
});

return node;
```

- While the condition is not met (`pending`), the node specified in the `pending` option is rendered
- Once the condition is met (`ready`), rendering switches to the target node passed as the first argument
- Some hooks also support a failure state (`fallback`)

### When the target to wait for is not specified

Hooks that take something to wait for become `ready` immediately when the second argument is `null` / `undefined`, since there is nothing to wait for. If it later becomes unspecified, the state returns to `ready`; if it changes from unspecified to a value, the hook starts waiting again from `pending`.\
Because hooks cannot be called conditionally, you can make deferred rendering an optional feature of your component by passing `undefined` as the second argument.

| Hook                                                                                                                         | Second argument treated as unspecified        |
| ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `useDeferUntilTimeout`, `useDeferUntilDate`, `useDeferUntilResolved`, `useDeferUntilAsyncComplete` | `null` / `undefined`                          |
| `useDeferUntilBreakpoint`, `useDeferUntilRender`, `useDeferUntilFontReady`                                                                             | `null` / `undefined` / empty string           |
| `useDeferUntilIntersected`, `useDeferUntilScrolled`                                                                          | The ref object itself is `null` / `undefined` |

For `useDeferUntilIntersected` and `useDeferUntilScrolled`, a ref whose `current` is `null` means the element has not been mounted yet, so the state stays `pending`.

```tsx
function Heading({ fontFamily, children }: Props) {
  // Render immediately when fontFamily is not specified
  const { node } = useDeferUntilFontReady(<h1>{children}</h1>, fontFamily, {
    pending: null,
  });
  return node;
}
```

Note that the second argument of `useDeferUntilTrue` is the condition itself, so `null` / `undefined` is treated as unmet (`pending`).

## Basic Hooks

### `useDeferUntilReady`

The most fundamental hook, controlling rendering by directly specifying a `state` (`'pending' | 'fallback' | 'ready'`). All other hooks are built on top of this one.

```tsx
import { useDeferUntilReady } from '@niche-works/react-defer-rendering';

const { node } = useDeferUntilReady(<MyComponent />, state, {
  pending: <Spinner />,
  fallback: <ErrorMessage />,
});
```

### `useDeferUntilTrue`

Defers rendering until a boolean condition becomes `true`.

```tsx
import { useDeferUntilTrue } from '@niche-works/react-defer-rendering';

const { node } = useDeferUntilTrue(<MyComponent />, isReady, {
  pending: <Spinner />,
});
```

## Waiting for Elapsed Time

### `useDeferUntilTimeout`

Defers rendering until the specified duration (in milliseconds) has elapsed.

```tsx
import { useDeferUntilTimeout } from '@niche-works/react-defer-rendering';

const { node } = useDeferUntilTimeout(<MyComponent />, 3000, {
  pending: <Spinner />,
});
```

### `useDeferUntilDate`

Defers rendering until the specified date and time.

```tsx
import { useDeferUntilDate } from '@niche-works/react-defer-rendering';

const { node } = useDeferUntilDate(
  <Campaign />,
  new Date('2026-01-01T00:00:00'),
  { pending: <ComingSoon /> },
);
```

## Waiting for Async Completion

### `useDeferUntilResolved`

Defers rendering until a Promise settles (resolves or rejects).

```tsx
import { useDeferUntilResolved } from '@niche-works/react-defer-rendering';

const { node } = useDeferUntilResolved(<MyComponent />, fetchPromise, {
  pending: <Spinner />,
  fallback: <ErrorMessage />,
});
```

### `useDeferUntilAsyncComplete`

Defers rendering until an async function finishes executing. `asyncFn` is invoked after mount (inside an effect), which also manages the creation of the Promise itself. It is not invoked during SSR.\nSince `asyncFn` is re-invoked whenever its reference changes, memoize it with `useCallback` or similar.

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

## Waiting for a Value to Change

### `useDeferUntilChange`

Defers rendering until the specified value changes. Each time the value changes, it briefly passes through the `pending` state.

```tsx
import { useDeferUntilChange } from '@niche-works/react-defer-rendering';

const { node } = useDeferUntilChange(<Toast>{message}</Toast>, message, {
  pending: null,
});
```

## Manual Control at Any Timing

### `useDeferUntilOnReady`

Lets you control the state at any timing by calling the returned `onReady` / `onFallback` / `onPending` handlers. Useful for conditions the hook itself cannot detect, such as event handlers.

```tsx
import { useDeferUntilOnReady } from '@niche-works/react-defer-rendering';

const { node, onReady } = useDeferUntilOnReady(<Video />, {
  pending: <Spinner />,
});

<video onCanPlay={onReady}>{node}</video>;
```

### `useDeferUntilCallThreshold`

Similar to `useDeferUntilOnReady`, but the state only switches once each handler has been called the specified number of times.

```tsx
import { useDeferUntilCallThreshold } from '@niche-works/react-defer-rendering';

const { node, onReady } = useDeferUntilCallThreshold(<Gallery />, {
  pending: <Spinner />,
  onReadyCount: 3, // becomes ready once onReady has been called 3 times
});
```

## Waiting for Browser State

> **Note (SSR / RSC):** The hooks listed here depend on browser APIs, so their actual state cannot be determined on the server. See [Using with SSR / RSC](#using-with-ssr--rsc) for details.

### `useDeferUntilBreakpoint`

Defers rendering until a media query matches.

```tsx
import { useDeferUntilBreakpoint } from '@niche-works/react-defer-rendering';

const { node } = useDeferUntilBreakpoint(
  <DesktopNav />,
  '(min-width: 1024px)',
  { pending: <MobileNav /> },
);
```

### `useDeferUntilIntersected`

Defers rendering until a reference element enters the viewport.

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

Defers rendering until a reference element becomes visible as a result of scrolling.

```tsx
const { node } = useDeferUntilScrolled(<LazyImage />, elementRef, {
  pending: <Placeholder />,
  rootMargin: 100,
});
```

### `useDeferUntilRender`

Defers rendering until an element matching the selector is rendered into the DOM. Useful for waiting on elements outside of your own control, such as ones inserted by third-party scripts.

```tsx
import { useDeferUntilRender } from '@niche-works/react-defer-rendering';

const { node } = useDeferUntilRender(<Overlay />, '#third-party-widget', {
  pending: null,
});
```

### `useDeferUntilFontReady`

Defers rendering until the specified font becomes available.

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

## Common Options

### Options for `pending` / `ready`

These options are shared across all hooks.

| Option               | Type        | Description                                    |
| -------------------- | ----------- | ---------------------------------------------- |
| `pending?`           | `ReactNode` | Node rendered while waiting for the condition  |
| `pendingDefer?`      | `number`    | Delay (in ms) before showing `pending`         |
| `readyDefer?`        | `number`    | Delay (in ms) before showing the target node   |
| `preserveOnceReady?` | `boolean`   | Whether to keep the `ready` state once reached |

### Options for `fallback`

`useDeferUntilReady`, `useDeferUntilResolved`, `useDeferUntilAsyncComplete`, `useDeferUntilOnReady`, `useDeferUntilCallThreshold`, and `useDeferUntilFontReady` also support a `fallback` state for failures.

| Option                  | Type        | Description                                       |
| ----------------------- | ----------- | ------------------------------------------------- |
| `fallback?`             | `ReactNode` | Node rendered on failure                          |
| `fallbackDefer?`        | `number`    | Delay (in ms) before showing `fallback`           |
| `preserveOnceFallback?` | `boolean`   | Whether to keep the `fallback` state once reached |

## Using with SSR / RSC

Every hook in this library ships with a `'use client'` directive attached at build time. In React Server Components environments such as Next.js App Router, they are treated as client component boundaries without any additional configuration.

`useDeferUntilBreakpoint`, `useDeferUntilIntersected`, `useDeferUntilScrolled`, and `useDeferUntilRender` depend on browser APIs (`matchMedia`, `IntersectionObserver`, `MutationObserver`, etc.), so their actual state cannot be determined on the server. These hooks accept an `initialCondition` option to specify the value used during SSR (it is treated as `false` if not specified). Similarly, `useDeferUntilFontReady` accepts an `initialState` option to specify its initial state during SSR.

## License

MIT
