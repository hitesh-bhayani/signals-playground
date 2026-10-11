// The same counter + doubled + logging effect, written idiomatically for each library.
export const snippets = {
  vue: `import { ref, computed, effect } from '@vue/reactivity'

const count = ref(0)
const doubled = computed(() => count.value * 2)

effect(() => console.log(doubled.value))

count.value++          // logs 2`,

  preact: `import { signal, computed, effect, batch } from '@preact/signals-core'

const count = signal(0)
const doubled = computed(() => count.value * 2)

effect(() => console.log(doubled.value))

batch(() => {
  count.value++
  count.value++        // logs 4, once
})`,

  solid: `import { createSignal, createMemo, createEffect, createRoot } from 'solid-js'

createRoot(() => {
  const [count, setCount] = createSignal(0)
  const doubled = createMemo(() => count() * 2)   // eager: runs now

  createEffect(() => console.log(doubled()))

  setCount(c => c + 1)  // logs 2
})`,

  alien: `import { signal, computed, effect } from 'alien-signals'

const count = signal(0)
const doubled = computed(() => count() * 2)

effect(() => console.log(doubled()))

count(count() + 1)     // logs 2`,

  tc39: `import { Signal } from 'signal-polyfill'

const count = new Signal.State(0)
const doubled = new Signal.Computed(() => count.get() * 2)

// No built-in effect(): frameworks build one on a Watcher.
const w = new Signal.subtle.Watcher(() => queueMicrotask(() => {
  for (const s of w.getPending()) s.get()
  w.watch()
}))
const log = new Signal.Computed(() => console.log(doubled.get()))
w.watch(log); log.get()

count.set(count.get() + 1)   // logs 2 on the next microtask`,
};
