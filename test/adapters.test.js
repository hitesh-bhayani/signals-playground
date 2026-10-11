// Run with: node --conditions=browser --test test/
// (the browser condition makes solid-js load its reactive build instead of the SSR one)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adapters, flush } from '../src/adapters.js';
import { createDiamond, benchmarks, measure } from '../src/scenarios.js';

for (const lib of adapters) {
  test(`${lib.name}: diamond is glitch-free`, async () => {
    const diamond = createDiamond(lib);
    await flush();
    assert.equal(diamond.read(), 5);
    assert.equal(diamond.effectValue(), 5);

    const before = { ...diamond.counts };
    diamond.set(2);
    await flush();

    assert.equal(diamond.read(), 10);
    assert.equal(diamond.effectValue(), 10);
    // One update to `a` must re-run d and the effect exactly once each.
    assert.equal(diamond.counts.d - before.d, 1);
    assert.equal(diamond.counts.effect - before.effect, 1);
    diamond.dispose();
  });

  test(`${lib.name}: batch coalesces two writes into one effect run`, async () => {
    let runs = 0;
    let a, b;
    const dispose = lib.root(() => {
      a = lib.signal(1);
      b = lib.signal(1);
      lib.effect(() => {
        a.get();
        b.get();
        runs++;
      });
    });
    await flush();
    const start = runs;
    lib.batch(() => {
      a.set(2);
      b.set(2);
    });
    await flush();
    // Vue's @vue/reactivity has no public batch, so it re-runs per write.
    assert.equal(runs - start, lib.id === 'vue' ? 2 : 1);
    dispose();
  });

  for (const bench of benchmarks) {
    test(`${lib.name}: ${bench.name} produces correct results`, () => {
      bench.run(lib);
    });
  }
}

test('laziness: only Solid evaluates a computed nobody reads', async () => {
  const unread = {};
  for (const lib of adapters) {
    const diamond = createDiamond(lib);
    diamond.set(5);
    await flush();
    unread[lib.id] = diamond.counts.unread;
    diamond.dispose();
  }
  assert.deepEqual(unread, { vue: 0, preact: 0, solid: 2, alien: 0, tc39: 0 });
});

test('measure returns the median of the timed runs', () => {
  const ticks = [0, 5, 0, 1, 0, 9, 0, 3];
  let i = 0;
  const median = measure(() => {}, { warmup: 0, runs: 4, now: () => ticks[i++] });
  assert.equal(median, 5);
});
