"use strict";
// Renders window.PAGE = {tag, title, lede, fields: [[name, value]], samples: [{name, audio, midi, notes: [[onset, dur, pitch, vel]]}]}
const page = window.PAGE, DUR = 32, AXIS = 18;
const cards = document.getElementById("cards"), contents = document.getElementById("contents");
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const panel = fields => { const p = el("div", "header-panel");
  fields.forEach(([n, v]) => { const f = el("div", "field"); f.append(el("span", "field-name", n), el("code", "", v)); p.append(f); }); return p; };

const intro = el("article", "card");
intro.append(el("span", "kind-tag", page.tag), el("h1", "", page.title), el("p", "lede", page.lede), panel(page.fields));
cards.append(intro);

function size(canvas) {
  const r = window.devicePixelRatio || 1, w = canvas.clientWidth, h = canvas.clientHeight;
  canvas.width = w * r; canvas.height = h * r;
  const c = canvas.getContext("2d"); c.setTransform(r, 0, 0, r, 0, 0); return [c, w, h];
}
function drawRoll(view) {
  const [c, w, h] = size(view.roll), rh = h - AXIS, notes = view.sample.notes;
  let lo = 127, hi = 0;
  for (const n of notes) { if (n[2] < lo) lo = n[2]; if (n[2] > hi) hi = n[2]; }
  lo -= 2; hi += 2;
  const row = rh / (hi - lo + 1);
  c.strokeStyle = "#dcdde0"; c.strokeRect(0.5, 0.5, w - 1, rh - 1);
  c.fillStyle = "#33506e";
  for (const [on, dur, pitch, vel] of notes) {
    c.globalAlpha = 0.25 + 0.75 * Math.min(1, vel / 110);
    c.fillRect(on / DUR * w, rh - (pitch - lo + 1) * row, Math.max(1, dur / DUR * w), Math.max(1.2, row - 0.4));
  }
  c.globalAlpha = 1; c.fillStyle = "#74777d"; c.font = "10px system-ui, sans-serif"; c.textBaseline = "top";
  for (let t = 0; t <= DUR; t += 4) { c.textAlign = t === 0 ? "left" : t === DUR ? "right" : "center"; c.fillText(t + " s", t / DUR * w, rh + 5); }
}
function drawCursor(view) {
  const [c, w, h] = size(view.cursor), t = view.audio.currentTime;
  if (!(t > 0)) return;
  c.fillStyle = "#141619"; c.fillRect(Math.min(t, DUR) / DUR * w, 0, 1.5, h - AXIS);
}

// rolls are drawn only when their card comes near the viewport
const views = new Map();
const io = new IntersectionObserver(es => es.forEach(e => {
  if (e.isIntersecting) { drawRoll(views.get(e.target)); io.unobserve(e.target); }
}), { root: cards, rootMargin: "400px" });

page.samples.forEach((sample, i) => {
  const card = el("article", "card"); card.id = "s" + i;
  const head = el("div", "head-row");
  head.append(el("span", "kind-tag", page.tag), el("span", "position", `${i + 1} / ${page.samples.length}`));
  const audio = el("audio"); audio.controls = true; audio.preload = "none"; audio.src = sample.audio;
  const stack = el("div", "roll-stack"), roll = el("canvas"), cursor = el("canvas", "cursor");
  stack.append(roll, cursor);
  const link = el("a", "midi-link", sample.midi); link.href = sample.midi;
  card.append(head, el("h1", "", sample.name), panel([["notes", sample.notes.length], ["notes / s", (sample.notes.length / DUR).toFixed(2)]]), audio, stack, link);
  cards.append(card);

  const view = { sample, audio, roll, cursor }; views.set(stack, view); io.observe(stack);
  const tick = () => { drawCursor(view); if (!audio.paused) requestAnimationFrame(tick); };
  audio.addEventListener("play", () => { views.forEach(o => { if (o !== view) o.audio.pause(); }); tick(); });
  audio.addEventListener("seeked", () => drawCursor(view));
  stack.addEventListener("click", ev => { const r = stack.getBoundingClientRect(); audio.currentTime = (ev.clientX - r.left) / r.width * DUR; });

  const btn = el("button", "piece-link");
  btn.append(el("strong", "", sample.name), el("small", "", `${sample.notes.length} notes`));
  btn.addEventListener("click", () => card.scrollIntoView({ behavior: "smooth", block: "start" }));
  contents.append(btn);
});
