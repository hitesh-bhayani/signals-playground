import { adapters, flush } from './adapters.js';
import { createDiamond, benchmarks, measure } from './scenarios.js';
import { snippets } from './snippets.js';

const $ = (sel) => document.querySelector(sel);

// --- 1. Diamond -----------------------------------------------------------

const diamonds = adapters.map((lib) => ({ lib, diamond: createDiamond(lib) }));
const tbody = $('#diamond tbody');

function renderDiamonds() {
  tbody.innerHTML = diamonds
    .map(({ lib, diamond }) => {
      const { d, effect, unread } = diamond.counts;
      return `<tr>
        <td><a href="${lib.url}" target="_blank" rel="noopener">${lib.name}</a> <span class="ver">${lib.version}</span></td>
        <td class="num">${diamond.effectValue()}</td>
        <td class="num">${d}</td>
        <td class="num">${effect}</td>
        <td class="num ${unread ? 'warn' : 'ok'}">${unread}</td>
        <td>${lib.asyncEffects ? 'microtask' : 'sync'}</td>
      </tr>`;
    })
    .join('');
}

async function setAll(update) {
  for (const { lib, diamond } of diamonds) update(lib, diamond);
  await flush();
  renderDiamonds();
}

$('#a').addEventListener('input', (e) => {
  const v = Number(e.target.value);
  $('#a-value').textContent = v;
  setAll((_, diamond) => diamond.set(v));
});

$('#burst').addEventListener('click', () => {
  const base = Number($('#a').value);
  setAll((lib, diamond) =>
    lib.batch(() => {
      for (let i = 1; i <= 10; i++) diamond.set(base + i);
      diamond.set(base);
    }),
  );
});

flush().then(renderDiamonds);

// --- 2. Benchmark ---------------------------------------------------------

const benchHead = $('#bench thead');
const benchBody = $('#bench tbody');
benchHead.innerHTML = `<tr><th>Workload</th>${adapters.map((l) => `<th>${l.name}</th>`).join('')}</tr>`;

function renderBench(results) {
  benchBody.innerHTML = benchmarks
    .map((b) => {
      const row = results[b.id] || {};
      const values = Object.values(row);
      const best = values.length ? Math.min(...values) : 0;
      const worst = values.length ? Math.max(...values) : 0;
      const cells = adapters
        .map((l) => {
          const ms = row[l.id];
          if (ms === undefined) return '<td class="num muted">…</td>';
          const ratio = ms / best;
          // Bar length is proportional to time: shorter is faster.
          const width = Math.max(4, (ms / worst) * 100);
          return `<td class="num"><div class="bar" style="--w:${width}%"></div>${ms.toFixed(2)} ms<span class="ratio">${ratio < 1.05 ? 'fastest' : ratio.toFixed(1) + '×'}</span></td>`;
        })
        .join('');
      return `<tr><td><strong>${b.name}</strong><div class="muted small">${b.detail}</div></td>${cells}</tr>`;
    })
    .join('');
}
renderBench({});

const nextFrame = () => new Promise((r) => setTimeout(r, 16));

$('#run').addEventListener('click', async (e) => {
  const button = e.currentTarget;
  button.disabled = true;
  const results = {};
  try {
    for (const bench of benchmarks) {
      results[bench.id] = {};
      for (const lib of adapters) {
        $('#status').textContent = `Running ${bench.name} on ${lib.name}…`;
        await nextFrame(); // let the page repaint between runs
        results[bench.id][lib.id] = measure(() => bench.run(lib));
        renderBench(results);
      }
    }
    $('#status').textContent = `Done · ${navigator.userAgent.match(/(Chrome|Firefox|Safari)\/[\d.]+/)?.[0] ?? ''}`;
  } catch (err) {
    $('#status').textContent = `Error: ${err.message}`;
  } finally {
    button.disabled = false;
  }
});

// --- 3. Snippets ----------------------------------------------------------

const tabs = $('#tabs');
function showSnippet(id) {
  $('#snippet').textContent = snippets[id];
  for (const t of tabs.children) t.setAttribute('aria-selected', String(t.dataset.id === id));
}
tabs.innerHTML = adapters
  .map((l) => `<button role="tab" class="tab" data-id="${l.id}">${l.name}</button>`)
  .join('');
tabs.addEventListener('click', (e) => {
  const id = e.target.closest('[data-id]')?.dataset.id;
  if (id) showSnippet(id);
});
showSnippet(adapters[0].id);
