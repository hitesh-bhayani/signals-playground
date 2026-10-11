// One small interface over five reactivity libraries, so every demo and
// benchmark runs the exact same code against each of them.
//
// adapter = {
//   id, name, version, url,
//   signal(v)    -> { get(), set(v) }
//   computed(fn) -> { get() }
//   effect(fn)   -> dispose()
//   batch(fn)       run fn with updates coalesced (where the library supports it)
//   root(fn)        run fn inside an ownership scope, returns dispose()
//   asyncEffects    true when effects run on a microtask instead of synchronously
// }

import { ref, computed as vueComputed, effect as vueEffect, effectScope } from '@vue/reactivity';
import {
  signal as pSignal,
  computed as pComputed,
  effect as pEffect,
  batch as pBatch,
} from '@preact/signals-core';
import { createSignal, createMemo, createComputed, createRoot, batch as sBatch } from 'solid-js';
import {
  signal as aSignal,
  computed as aComputed,
  effect as aEffect,
  effectScope as aScope,
  startBatch,
  endBatch,
} from 'alien-signals';
import { Signal } from 'signal-polyfill';

const vue = {
  id: 'vue',
  name: 'Vue reactivity',
  version: '3.5.43',
  url: 'https://github.com/vuejs/core/tree/main/packages/reactivity',
  signal(v) {
    const r = ref(v);
    return { get: () => r.value, set: (n) => (r.value = n) };
  },
  computed(fn) {
    const c = vueComputed(fn);
    return { get: () => c.value };
  },
  effect(fn) {
    const runner = vueEffect(fn);
    return () => runner.effect.stop();
  },
  // @vue/reactivity has no public batch API; component updates are batched by the scheduler instead.
  batch: (fn) => fn(),
  root(fn) {
    const scope = effectScope();
    scope.run(fn);
    return () => scope.stop();
  },
  asyncEffects: false,
};

const preact = {
  id: 'preact',
  name: 'Preact Signals',
  version: '1.14.4',
  url: 'https://github.com/preactjs/signals',
  signal(v) {
    const s = pSignal(v);
    return { get: () => s.value, set: (n) => (s.value = n) };
  },
  computed(fn) {
    const c = pComputed(fn);
    return { get: () => c.value };
  },
  effect: (fn) => pEffect(() => void fn()),
  batch: pBatch,
  root(fn) {
    // Preact Signals has no ownership tree; collect disposers by hand.
    fn();
    return () => {};
  },
  asyncEffects: false,
};

const solid = {
  id: 'solid',
  name: 'Solid',
  version: '1.9.17',
  url: 'https://github.com/solidjs/solid',
  signal(v) {
    const [get, set] = createSignal(v);
    return { get, set: (n) => set(() => n) };
  },
  computed(fn) {
    return { get: createMemo(fn) };
  },
  effect(fn) {
    // createComputed runs synchronously, which keeps effect counts comparable.
    let dispose;
    createRoot((d) => {
      dispose = d;
      createComputed(() => void fn());
    });
    return dispose;
  },
  batch: sBatch,
  root(fn) {
    let dispose;
    createRoot((d) => {
      dispose = d;
      fn();
    });
    return dispose;
  },
  asyncEffects: false,
};

const alien = {
  id: 'alien',
  name: 'alien-signals',
  version: '3.2.1',
  url: 'https://github.com/stackblitz/alien-signals',
  signal(v) {
    const s = aSignal(v);
    return { get: () => s(), set: (n) => s(n) };
  },
  computed(fn) {
    const c = aComputed(fn);
    return { get: () => c() };
  },
  effect: (fn) => aEffect(() => void fn()),
  batch(fn) {
    startBatch();
    try {
      return fn();
    } finally {
      endBatch();
    }
  },
  root(fn) {
    return aScope(fn);
  },
  asyncEffects: false,
};

// The TC39 proposal ships no effect(); frameworks are expected to build one on Watcher.
// This is the minimal microtask-scheduled version from the proposal README.
let pending = false;
const watcher = new Signal.subtle.Watcher(() => {
  if (pending) return;
  pending = true;
  queueMicrotask(() => {
    pending = false;
    for (const s of watcher.getPending()) s.get();
    watcher.watch();
  });
});

const tc39 = {
  id: 'tc39',
  name: 'TC39 Signals (polyfill)',
  version: '0.2.2',
  url: 'https://github.com/tc39/proposal-signals',
  signal(v) {
    const s = new Signal.State(v);
    return { get: () => s.get(), set: (n) => s.set(n) };
  },
  computed(fn) {
    const c = new Signal.Computed(fn);
    return { get: () => c.get() };
  },
  effect(fn) {
    const c = new Signal.Computed(() => void fn());
    watcher.watch(c);
    c.get();
    return () => watcher.unwatch(c);
  },
  // Effects already coalesce on the microtask, so batching is implicit.
  batch: (fn) => fn(),
  root(fn) {
    fn();
    return () => {};
  },
  asyncEffects: true,
};

export const adapters = [vue, preact, solid, alien, tc39];

// Wait for microtask-scheduled effects (TC39) to settle.
export const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
