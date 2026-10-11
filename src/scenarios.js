// Library-agnostic scenarios. Each one only talks to the adapter interface.

// The classic diamond: a -> (b, c) -> d, plus an effect on d.
// Returns counters so the UI can show glitch-freedom and laziness.
export function createDiamond(lib) {
  const counts = { b: 0, c: 0, d: 0, effect: 0, unread: 0 };
  let a, d, effectValue;
  const dispose = lib.root(() => {
    a = lib.signal(1);
    const b = lib.computed(() => (counts.b++, a.get() * 2));
    const c = lib.computed(() => (counts.c++, a.get() * 3));
    d = lib.computed(() => (counts.d++, b.get() + c.get()));
    // Never read by anyone: a lazy library should never run it.
    lib.computed(() => (counts.unread++, a.get() * 100));
    lib.effect(() => {
      counts.effect++;
      effectValue = d.get();
    });
  });
  return {
    counts,
    set: (v) => a.set(v),
    read: () => d.get(),
    effectValue: () => effectValue,
    dispose,
  };
}

// --- Benchmarks -----------------------------------------------------------
// Pull-based on purpose (set, then read) so libraries with async effects are
// measured on the same footing as synchronous ones.

export const benchmarks = [
  {
    id: 'chain',
    name: 'Deep chain',
    detail: '1 signal → 1,000 chained computeds, 500 updates',
    run(lib) {
      const n = 1000;
      let root, tail;
      const dispose = lib.root(() => {
        root = lib.signal(0);
        let prev = root;
        for (let i = 0; i < n; i++) {
          const p = prev;
          prev = lib.computed(() => p.get() + 1);
        }
        tail = prev;
      });
      for (let i = 1; i <= 500; i++) {
        root.set(i);
        if (tail.get() !== i + n) throw new Error(`${lib.id} chain mismatch`);
      }
      dispose();
    },
  },
  {
    id: 'fanout',
    name: 'Wide fan-out',
    detail: '1 signal → 1,000 sibling computeds, 200 updates',
    run(lib) {
      const n = 1000;
      let root;
      const nodes = [];
      const dispose = lib.root(() => {
        root = lib.signal(0);
        for (let i = 0; i < n; i++) nodes.push(lib.computed(() => root.get() + i));
      });
      for (let i = 1; i <= 200; i++) {
        root.set(i);
        let sum = 0;
        for (const node of nodes) sum += node.get();
        if (sum !== n * i + (n * (n - 1)) / 2) throw new Error(`${lib.id} fanout mismatch`);
      }
      dispose();
    },
  },
  {
    id: 'grid',
    name: 'Diamond grid',
    detail: '10 wide × 100 deep, each node reads two parents, 200 updates',
    run(lib) {
      const width = 10;
      const depth = 100;
      let root, last;
      const dispose = lib.root(() => {
        root = lib.signal(1);
        let layer = Array.from({ length: width }, () => lib.computed(() => root.get()));
        for (let d = 0; d < depth; d++) {
          const prev = layer;
          layer = prev.map((_, i) => {
            const left = prev[i];
            const right = prev[(i + 1) % width];
            return lib.computed(() => (left.get() + right.get()) % 1000003);
          });
        }
        last = layer;
      });
      for (let i = 1; i <= 200; i++) {
        root.set(i);
        for (const node of last) node.get();
      }
      dispose();
    },
  },
  {
    id: 'create',
    name: 'Create & read',
    detail: '10,000 signal + computed pairs created and read once',
    run(lib) {
      const dispose = lib.root(() => {
        for (let i = 0; i < 10000; i++) {
          const s = lib.signal(i);
          const c = lib.computed(() => s.get() * 2);
          if (c.get() !== i * 2) throw new Error(`${lib.id} create mismatch`);
        }
      });
      dispose();
    },
  },
];

// Median of several timed runs after a warm-up, in milliseconds.
export function measure(fn, { warmup = 2, runs = 7, now = () => performance.now() } = {}) {
  for (let i = 0; i < warmup; i++) fn();
  const times = [];
  for (let i = 0; i < runs; i++) {
    const t0 = now();
    fn();
    times.push(now() - t0);
  }
  times.sort((x, y) => x - y);
  return times[Math.floor(times.length / 2)];
}
