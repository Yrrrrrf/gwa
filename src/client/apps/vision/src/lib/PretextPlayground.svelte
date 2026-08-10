<script lang="ts">
import { getTextStore } from "rune-lab/layout";

const BODY =
  "This paragraph is not wrapped by the browser. Every line you see was measured " +
  "and placed by pretext: for each line band we carve the free slots around the " +
  "obstacle, hand the widest slot's width to layoutNextLine, and advance the " +
  "cursor to wherever that line ended. Drag the box anywhere — the text reflows " +
  "instantly because re-layout is pure arithmetic over cached word widths, with " +
  "no DOM measurement in the loop. Switch the theme and it re-measures with the " +
  "new font too.";

const LINE_HEIGHT = 26;
const HEIGHT = 320;
const PAD_X = 16; // horizontal keep-out around the obstacle
const PAD_Y = 6; // vertical keep-out around the obstacle
const MIN_SLOT = 40; // slots narrower than this are skipped, like the demo's empty-slot bands
const BOX = { w: 150, h: 96 };

const textStore = getTextStore();

let width = $state(0);
let box = $state({ x: 200, y: 100 });
let drag: { dx: number; dy: number } | null = $state(null);

const prepared = $derived.by(() => {
  const _ = textStore.epoch;
  return textStore.ready
    ? textStore.engine.prepareWithSegments(BODY, textStore.font)
    : null;
});

type PlacedLine = { x: number; y: number; text: string };

const placed = $derived.by(() => {
  if (!prepared || !textStore.ready || width <= 0) return [] as PlacedLine[];
  const engine = textStore.engine;
  const lines: PlacedLine[] = [];
  let cursor = { segmentIndex: 0, graphemeIndex: 0 };

  for (let top = 0; top + LINE_HEIGHT <= HEIGHT; top += LINE_HEIGHT) {
    // Band vs obstacle (full line band, not a single y sample — same rule as the demo)
    const overlaps = top < box.y + BOX.h + PAD_Y &&
      top + LINE_HEIGHT > box.y - PAD_Y;

    let slot = { left: 0, right: width };
    if (overlaps) {
      const blockedL = Math.max(0, box.x - PAD_X);
      const blockedR = Math.min(width, box.x + BOX.w + PAD_X);
      const candidates = [
        { left: 0, right: blockedL },
        { left: blockedR, right: width },
      ].filter((s) => s.right - s.left >= MIN_SLOT);
      if (candidates.length === 0) continue; // band fully blocked: skip, keep cursor
      slot = candidates.reduce((a, b) =>
        b.right - b.left > a.right - a.left ? b : a
      );
    }

    const line = engine.layoutNextLine(
      prepared,
      cursor,
      slot.right - slot.left,
    );
    if (!line) break; // text exhausted
    lines.push({ x: slot.left, y: top, text: line.text });
    cursor = line.end;
  }
  return lines;
});

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), hi);
}

function onDown(e: PointerEvent) {
  (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  drag = { dx: e.clientX - box.x, dy: e.clientY - box.y };
}
function onMove(e: PointerEvent) {
  if (!drag) return;
  box = {
    x: clamp(e.clientX - drag.dx, -BOX.w / 2, width - BOX.w / 2),
    y: clamp(e.clientY - drag.dy, -BOX.h / 2, HEIGHT - BOX.h / 2),
  };
}
function onUp() {
  drag = null;
}
</script>

<div
  class="relative w-full overflow-hidden rounded-xl border border-base-300 bg-base-100 select-none"
  style="height: {HEIGHT}px;"
  bind:clientWidth={width}
>
  {#if !textStore.ready}
    <p class="p-4 text-sm opacity-60 whitespace-pre-wrap">{BODY}</p>
  {:else}
    {#each placed as line, i (i)}
      <div
        class="absolute whitespace-nowrap"
        style="left:{line.x}px; top:{line.y}px; font:{textStore.font}; line-height:{LINE_HEIGHT}px;"
      >
        {line.text}
      </div>
    {/each}
  {/if}

  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class="absolute flex items-center justify-center rounded-2xl bg-warning/80 text-warning-content text-xs font-bold shadow-lg touch-none cursor-grab active:cursor-grabbing"
    style="left:{box.x}px; top:{box.y}px; width:{BOX.w}px; height:{BOX.h}px;"
    onpointerdown={onDown}
    onpointermove={onMove}
    onpointerup={onUp}
    onpointercancel={onUp}
  >
    drag me 🚧
  </div>
</div>
