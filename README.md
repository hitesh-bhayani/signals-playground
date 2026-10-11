# ⚡ Signals Playground

**Live demo: https://hitesh-bhayani.github.io/signals-playground/**

Signals are turning into the shared reactivity model of the web. Vue, Preact, Solid and Angular all use them, and there is a [TC39 proposal](https://github.com/tc39/proposal-signals) to put them in the language. This playground runs the **same reactive graph and the same benchmarks** on five implementations, so the differences are visible instead of theoretical.

| Library | Version | Evaluation | Effects | `batch()` |
| --- | --- | --- | --- | --- |
| [Vue reactivity](https://github.com/vuejs/core/tree/main/packages/reactivity) | 3.5.43 | lazy | sync | no public API |
| [Preact Signals](https://github.com/preactjs/signals) | 1.14.4 | lazy | sync | ✅ |
| [Solid](https://github.com/solidjs/solid) | 1.9.17 | **eager** memos | sync | ✅ |
| [alien-signals](https://github.com/stackblitz/alien-signals) | 3.2.1 | lazy | sync | ✅ (`startBatch`/`endBatch`) |
| [TC39 Signals polyfill](https://github.com/proposal-signals/signal-polyfill) | 0.2.2 | lazy | none built in: microtask via `Watcher` | implicit |

## What's on the page

1. **The diamond.** `a → (b, c) → d`, an effect on `d`, and one computed nobody reads. Move the slider to see that every library is glitch-free (`d` runs once per update), that Solid's memos are eager (the unread computed still runs), and how `batch()` coalesces writes.
2. **Benchmark.** Four pull-based workloads (deep chain, wide fan-out, diamond grid, create & read), median of 7 runs, executed in *your* browser. Compare the ratios; the absolute numbers depend on your machine.
3. **Same counter, five APIs.** Idiomatic code for each library side by side.

## How it works

Everything goes through one small adapter interface in [`src/adapters.js`](src/adapters.js):

```js
signal(v)    -> { get(), set(v) }
computed(fn) -> { get() }
effect(fn)   -> dispose()
batch(fn)
root(fn)     -> dispose()
```

Every demo and benchmark in [`src/scenarios.js`](src/scenarios.js) is written once against that interface. The TC39 proposal deliberately ships no `effect()`, so the adapter builds the minimal microtask version from the proposal README on top of `Signal.subtle.Watcher`.

## Run locally

```bash
npm install
npm test        # 32 tests: correctness, glitch-freedom, batching and laziness for every library
npm run dev     # http://localhost:5173
```

The tests run with `node --conditions=browser`, so `solid-js` loads its reactive build instead of the SSR one.

## License

MIT © Hitesh Bhayani
