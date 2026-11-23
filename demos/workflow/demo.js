// Scripted, self-playing illustration of an AI issue-to-PR workflow.
// It does not run or contact anything: every name, number and log line below is invented.

const NS = "demo-ai-issue-to-pr";

/* ============================== DATA ============================== */

// Row kinds:
//   cmd     a shell command, typed out         log     a plain log line
//   check   spinner that settles to pass/fail/note (r), pending time p ms
//   comment a line of issue/PR conversation    chips   label chips
//   diff    one diff line (+ / -)              table   preformatted table line
// d = ms pause before the row (defaults per kind in DEFAULT_PAUSE).

// Invented token counts: [stage, input, output, cache]
const USAGE = [
  ["triage", 1200, 300, 9000],
  ["implement", 8400, 3900, 190000],
  ["debug", 2100, 800, 60000],
  ["review", 1800, 450, 21750],
];
const fmt = (n) => n.toLocaleString("en-US");

function usageTable(stages) {
  const line = (a, b, c, d, e) => a.padEnd(10) + b.padStart(8) + c.padStart(8) + d.padStart(9) + e.padStart(10);
  const out = [line("stage", "input", "output", "cache", "total")];
  let ti = 0, to = 0, tc = 0;
  for (const [s, i, o, c] of USAGE.filter((r) => stages.includes(r[0]))) {
    out.push(line(s, fmt(i), fmt(o), fmt(c), fmt(i + o + c)));
    ti += i; to += o; tc += c;
  }
  out.push(line("total", fmt(ti), fmt(to), fmt(tc), fmt(ti + to + tc)));
  return out;
}
const sumTokens = (stages) =>
  USAGE.filter((r) => stages.includes(r[0])).reduce((n, [, i, o, c]) => n + i + o + c, 0);

const STAGES = [
  {
    label: "Triage",
    title: "Triage the issue",
    blurb: "A comment asks for triage; a light Claude model reads the issue and repo, read-only.",
    rows: [
      { k: "comment", who: "maintainer", t: "Triage this." },
      { k: "check", t: "gate: phrase matched, commenter is a collaborator", r: "pass" },
      { k: "log", t: "run: claude-code-action --model claude-haiku-5-5" },
      { k: "log", t: "     allowed tools: Read, Grep, Glob, Write" },
      { k: "check", t: "read issue #42, src/search/, tests/", r: "pass", p: 650 },
      { k: "log", t: "verdict: READY" },
      { k: "check", t: "append clarified details to the issue description", r: "pass" },
      { k: "chips", label: "labels", items: ["awaiting-confirmation"] },
      { k: "comment", who: "github-actions[bot]", t: "Please comment \"Confirm\" to pass this to Claude Bot." },
    ],
  },
  {
    label: "Confirm",
    title: "Wait for a human to confirm",
    blurb: "Nothing is built until a collaborator replies Confirm, so a person stays in the loop.",
    rows: [
      { k: "comment", who: "maintainer", t: "Confirm" },
      { k: "check", t: "comment is exactly \"Confirm\"", r: "pass", p: 350 },
      { k: "check", t: "commenter is OWNER, MEMBER or COLLABORATOR", r: "pass", p: 350 },
      { k: "check", t: "issue has label awaiting-confirmation", r: "pass", p: 350 },
      { k: "cmd", t: "gh issue edit 42 --add-label claude-bot \\" },
      { k: "log", t: "    --remove-label awaiting-confirmation", d: 60 },
      { k: "chips", label: "labels", items: ["claude-bot"] },
      { k: "comment", who: "github-actions[bot]", t: "Claude Bot: Starting implementation..." },
    ],
  },
  {
    label: "Implement",
    title: "Implement on a branch",
    blurb: "Claude works on a fresh branch; the workflow then commits and pushes what it changed.",
    rows: [
      { k: "cmd", t: "git checkout -b claude-fix-issue-42" },
      { k: "log", t: "run: claude-code-action (issue + discussion as context)" },
      { k: "check", t: "explore repo, edit the search code", r: "pass", p: 600 },
      { k: "log", t: "  src/search/query.ts", d: 80 },
      { k: "diff", t: "-  const q = input.toLowerCase();" },
      { k: "diff", t: "+  const q = input.toLowerCase().replace(/\\s+/g, \"\");" },
      { k: "check", t: "write notes: decisions, issues, please check", r: "pass", p: 350 },
      { k: "cmd", t: "git commit -m \"fix: automatically resolved issue #42 via Claude\"", d: 200 },
      { k: "cmd", t: "git push origin HEAD:refs/heads/claude-fix-issue-42", d: 200 },
    ],
  },
  {
    label: "Test",
    title: "Build and test",
    blurb: "A reusable workflow runs the repo's test command and reports pass or fail.",
    rows: [
      { k: "log", t: "uses: ./.github/workflows/test-program.yml (ref: claude-fix-issue-42)" },
      { k: "cmd", t: "npm test   # the TEST_COMMAND repo variable" },
      { k: "log", t: "PASS  tests/normalize.spec.ts  (4 tests)" },
      { k: "log", t: "FAIL  tests/search.spec.ts" },
      { k: "log", t: "  ● search › keeps quoted phrases intact", d: 60 },
      { k: "log", t: "    expected \"new york\", received \"newyork\"", d: 60 },
      { k: "check", t: "result: failure  (1 failed, 11 passed)", r: "fail", p: 700 },
      { k: "log", t: "upload artifact: test-log" },
      { k: "comment", who: "github-actions[bot]", t: "Tests failed. Debugging now (one attempt)..." },
    ],
  },
  {
    label: "Debug",
    title: "One debug attempt, then retest",
    blurb: "Claude gets a single attempt to fix the failure; the retest must pass or the run fails.",
    rows: [
      { k: "log", t: "download artifact: test-log" },
      { k: "log", t: "run: claude-code-action (reads the log, fixes the root cause)" },
      { k: "check", t: "root cause: spaces inside quoted phrases were stripped", r: "pass", p: 650 },
      { k: "diff", t: "-  const q = input.toLowerCase().replace(/\\s+/g, \"\");", d: 100 },
      { k: "diff", t: "+  const q = input.toLowerCase().trim();" },
      { k: "cmd", t: "git push origin HEAD:refs/heads/claude-fix-issue-42", d: 200 },
      { k: "log", t: "retest: test-program.yml (fail-on-error: true)" },
      { k: "check", t: "npm test: 12 passed, 0 failed", r: "pass", p: 500 },
      { k: "log", t: "a second failure here would fail the workflow: no PR" },
    ],
  },
  {
    label: "Open PR",
    title: "Open the pull request",
    blurb: "With tests green, a PR opens carrying Claude's notes and a token-usage table.",
    rows: [
      { k: "cmd", t: "gh pr create --head claude-fix-issue-42 --base main" },
      { k: "log", t: "## Claude Notes" },
      { k: "log", t: "- Decision: trim only the ends of the query" },
      { k: "log", t: "- Please check: quoted phrases still match" },
      ...usageTable(["triage", "implement", "debug"]).map((t) => ({ k: "table", t })),
      { k: "comment", who: "github-actions[bot]", t: "Pull request opened: https://example.com/acme-app/pull/43", d: 450 },
    ],
  },
  {
    label: "Review",
    title: "Review the pull request",
    blurb: "A light model reviews the diff against the repo's standards and comments once.",
    rows: [
      { k: "log", t: "trigger: pull_request opened (same-repo, not a draft)" },
      { k: "check", t: "effectiveness: the change does what the issue asks", r: "pass", p: 450 },
      { k: "check", t: "standards: no rule in the standards docs broken", r: "pass", p: 450 },
      { k: "check", t: "consistency: 1 minor suggestion on naming", r: "note", p: 450 },
      { k: "comment", who: "github-actions[bot]", t: "Claude Review: Minor suggestions" },
      { k: "log", t: `usage: + review row (${fmt(sumTokens(["review"]))} tokens) added to the PR description` },
      { k: "log", t: `PR total: ${fmt(sumTokens(["triage", "implement", "debug", "review"]))} tokens` },
    ],
  },
];

/* ============================== STYLE ============================== */

const DEFAULT_PAUSE = { cmd: 300, log: 190, check: 200, comment: 340, chips: 200, diff: 120, table: 150 };
const TYPE_STEP_MS = 20;   // typing tick
const TYPE_CHARS = 3;      // characters revealed per tick
const FADE_MS = 200;
const HOLD_MS = 900;       // pause after a stage finishes before the next begins
const LAST_HOLD_MS = 2600; // pause on the final stage before looping

const CSS = `
.${NS}{--bg:#fcfcfa;--fg:#1b1b1a;--mute:#6a6a64;--line:#d8d8d2;--ok:#4c7a58;--bad:#a2483f;
  box-sizing:border-box;width:100%;height:100%;display:flex;flex-direction:column;overflow:hidden;
  background:var(--bg);color:var(--fg);font:13px/1.35 "Iowan Old Style",Charter,"Palatino Linotype",Georgia,serif}
.${NS} *{box-sizing:border-box}
.${NS} button{font:inherit;color:inherit;background:none;border:0;padding:0;margin:0;cursor:pointer}
.${NS} :focus-visible{outline:2px solid var(--fg);outline-offset:2px}
.${NS} .sr{position:absolute;width:1px;height:1px;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}

.${NS} .bar{flex:none;height:62px;display:flex;align-items:flex-start;padding:10px 16px 0;border-bottom:1px solid var(--line)}
.${NS} .node{display:flex;flex-direction:column;align-items:center;gap:3px;min-width:0}
.${NS} .dot{width:18px;height:18px;border-radius:50%;border:1px solid var(--line);color:var(--mute);
  display:flex;align-items:center;justify-content:center;font-size:12px;line-height:1}
.${NS} .lbl{font-size:12px;line-height:16px;color:var(--mute);white-space:nowrap}
.${NS} .link{flex:1;min-width:6px;height:1px;margin:9px 4px 0;background:var(--line)}
.${NS} .link.done{background:var(--fg)}
.${NS} .node.done .dot{border-color:var(--fg);color:var(--fg)}
.${NS} .node.done .lbl{color:var(--fg)}
.${NS} .node.active .dot{background:var(--fg);border-color:var(--fg);color:var(--bg)}
.${NS} .node.active .lbl{color:var(--fg);font-weight:600}

.${NS} .panel{flex:1;min-height:0;padding:12px 16px;display:flex;flex-direction:column;
  opacity:1;transition:opacity ${FADE_MS}ms ease}
.${NS} .panel.out{opacity:0}
.${NS} .title{flex:none;font-size:15px;line-height:20px;font-weight:600}
.${NS} .blurb{flex:none;margin-top:1px;color:var(--mute);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.${NS} .vis{flex:1;min-height:0;margin-top:10px;padding:8px 12px;border:1px solid var(--line);border-radius:3px;overflow:hidden;
  font:13px/17px ui-monospace,"SF Mono",Menlo,Consolas,monospace}
.${NS} .row{display:flex;align-items:flex-start;gap:8px;height:17px;white-space:pre;overflow:hidden}
.${NS} .row .txt{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis}
.${NS} .row.log .txt,.${NS} .row.table .txt{color:var(--mute)}
.${NS} .row.table .txt{color:var(--fg)}
.${NS} .prompt{color:var(--mute);flex:none}
.${NS} .caret{display:inline-block;width:7px;height:13px;margin-left:1px;background:var(--fg);vertical-align:-1px}
.${NS} .row.diff .txt.minus{color:var(--mute)}
.${NS} .row.diff .txt.plus{color:var(--fg);font-weight:700}
.${NS} .row.comment{font:13px/17px "Iowan Old Style",Charter,"Palatino Linotype",Georgia,serif}
.${NS} .who{flex:none;color:var(--mute)}
.${NS} .who::after{content:":"}
.${NS} .chips{gap:6px;align-items:center}
.${NS} .chips .key{color:var(--mute)}
.${NS} .chip{height:15px;line-height:13px;padding:0 6px;border:1px solid var(--mute);border-radius:3px}
.${NS} .mark{flex:none;width:12px;height:17px;display:flex;align-items:center}
.${NS} .mark svg{width:12px;height:12px;display:block}
.${NS} .spin{animation:${NS}-spin .9s linear infinite;transform-origin:50% 50%}
@keyframes ${NS}-spin{to{transform:rotate(360deg)}}

.${NS} .foot{flex:none;height:38px;display:flex;align-items:center;gap:6px;padding:0 16px;border-top:1px solid var(--line)}
.${NS} .btn{height:24px;padding:0 10px;border:1px solid var(--line);border-radius:3px;font-size:12px;line-height:22px;background:var(--bg)}
.${NS} .btn:hover{border-color:var(--mute)}
.${NS} .btn[aria-disabled="true"]{color:var(--mute);background:transparent;cursor:default}
.${NS} .btn[aria-disabled="true"]:hover{border-color:var(--line)}
.${NS} .note{margin-left:auto;font-size:12px;color:var(--mute);white-space:nowrap}

.${NS}.calm .panel,.${NS}.calm .spin{transition:none;animation:none}
@media (prefers-reduced-motion:reduce){.${NS} .panel,.${NS} .spin{transition:none;animation:none}}
`;

const MARKS = {
  pass: `<svg viewBox="0 0 12 12" fill="none" stroke="#4c7a58" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.5 5 9l4.5-5.5"/></svg>`,
  fail: `<svg viewBox="0 0 12 12" fill="none" stroke="#a2483f" stroke-width="1.6" stroke-linecap="round"><path d="M3 3l6 6M9 3l-6 6"/></svg>`,
  note: `<svg viewBox="0 0 12 12" fill="none" stroke="#6a6a64" stroke-width="1.4"><circle cx="6" cy="6" r="3.2"/></svg>`,
  wait: `<svg class="spin" viewBox="0 0 12 12" fill="none" stroke="#6a6a64" stroke-width="1.4" stroke-linecap="round"><path d="M6 1.5a4.5 4.5 0 1 1-4.5 4.5" /></svg>`,
  step: `<svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 6.5 5 9l4.5-5.5"/></svg>`,
};

/* ============================== ROWS ============================== */

function h(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

// Builds a row in its final state; returns the element plus hooks for animating it.
function buildRow(row) {
  const el = h("div", "row " + row.k);
  const hooks = {};
  switch (row.k) {
    case "cmd": {
      el.append(h("span", "prompt", "$"));
      hooks.txt = h("span", "txt", row.t);
      el.append(hooks.txt);
      break;
    }
    case "check": {
      hooks.mark = h("span", "mark");
      hooks.mark.innerHTML = MARKS[row.r];
      el.append(hooks.mark, h("span", "txt", row.t));
      break;
    }
    case "comment": {
      el.append(h("span", "who", row.who), h("span", "txt", row.t));
      break;
    }
    case "chips": {
      el.append(h("span", "key", row.label + ":"));
      for (const item of row.items) el.append(h("span", "chip", item));
      el.classList.add("chips");
      break;
    }
    case "diff": {
      el.append(h("span", "txt " + (row.t[0] === "+" ? "plus" : "minus"), row.t));
      break;
    }
    default:
      el.append(h("span", "txt", row.t));
  }
  return { el, hooks };
}

/* ============================== PLAYER ============================== */

export function mount(root) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ac = new AbortController();
  const timers = new Set();

  const later = (fn, ms) => {
    const id = setTimeout(() => { timers.delete(id); fn(); }, ms);
    timers.add(id);
    return id;
  };
  const every = (fn, ms) => {
    const id = setInterval(fn, ms);
    timers.add(id);
    return id;
  };
  const stopTimer = (id) => { clearTimeout(id); clearInterval(id); timers.delete(id); };
  const clearTimers = () => { for (const id of timers) { clearTimeout(id); clearInterval(id); } timers.clear(); };

  /* --- DOM skeleton --- */
  const wrap = h("div", NS + (reduced ? " calm" : ""));
  const style = document.createElement("style");
  style.textContent = CSS;

  const bar = h("ol", "bar");
  bar.style.listStyle = "none";
  bar.style.margin = "0";
  const nodes = [];
  const links = [];
  STAGES.forEach((s, i) => {
    const li = h("li");
    li.style.display = "contents";
    const btn = h("button", "node");
    btn.type = "button";
    btn.setAttribute("aria-label", `Stage ${i + 1} of ${STAGES.length}: ${s.label}`);
    const dot = h("span", "dot", String(i + 1));
    btn.append(dot, h("span", "lbl", s.label));
    li.append(btn);
    bar.append(li);
    nodes.push({ btn, dot });
    if (i < STAGES.length - 1) {
      const link = h("li", "link");
      link.setAttribute("aria-hidden", "true");
      bar.append(link);
      links.push(link);
    }
  });

  const panel = h("div", "panel");
  const title = h("div", "title");
  const blurb = h("div", "blurb");
  const vis = h("div", "vis");
  panel.append(title, blurb, vis);

  const foot = h("div", "foot");
  const mkBtn = (label, aria) => {
    const b = h("button", "btn", label);
    b.type = "button";
    b.setAttribute("aria-label", aria);
    return b;
  };
  const prevBtn = mkBtn("Prev", "Previous stage");
  const playBtn = mkBtn("Pause", "Pause autoplay");
  const nextBtn = mkBtn("Next", "Next stage");
  const replayBtn = mkBtn("Replay", "Replay from the first stage");
  const note = h("span", "note");
  foot.append(prevBtn, playBtn, nextBtn, replayBtn, note);

  const live = h("div", "sr");
  live.setAttribute("aria-live", "polite");

  wrap.append(style, bar, panel, foot, live);
  root.replaceChildren(wrap);

  /* --- state --- */
  let idx = 0;
  let playing = !reduced;
  let stageDone = false;
  let visible = typeof IntersectionObserver === "undefined";
  let run = 0; // bumps whenever a stage (re)starts, so stale callbacks can be ignored

  const setDisabled = (b, off) => b.setAttribute("aria-disabled", off ? "true" : "false");

  function paintChrome() {
    nodes.forEach((n, i) => {
      const state = i < idx ? "done" : i === idx ? "active" : "";
      n.btn.className = "node " + state;
      n.dot.innerHTML = i < idx ? MARKS.step : "";
      if (i >= idx) n.dot.textContent = String(i + 1);
      if (i === idx) n.btn.setAttribute("aria-current", "step");
      else n.btn.removeAttribute("aria-current");
    });
    links.forEach((l, i) => { l.className = "link" + (i < idx ? " done" : ""); });
    playBtn.textContent = playing ? "Pause" : "Play";
    playBtn.setAttribute("aria-label", playing ? "Pause autoplay" : "Play autoplay");
    setDisabled(playBtn, reduced);
    setDisabled(prevBtn, idx === 0);
    setDisabled(nextBtn, idx === STAGES.length - 1);
    note.textContent = `Sample data · ${idx + 1} of ${STAGES.length}`;
  }

  /* --- stage playback --- */
  function fillHeader() {
    const s = STAGES[idx];
    title.textContent = s.title;
    blurb.textContent = s.blurb;
    blurb.title = s.blurb;
    live.textContent = `Stage ${idx + 1} of ${STAGES.length}: ${s.title}. ${s.blurb}`;
    vis.replaceChildren();
  }

  function showAllRows() {
    for (const row of STAGES[idx].rows) vis.append(buildRow(row).el);
  }

  function finishStage() {
    stageDone = true;
    if (playing && visible) later(advance, idx === STAGES.length - 1 ? LAST_HOLD_MS : HOLD_MS);
  }

  function advance() {
    if (idx === STAGES.length - 1) goTo(0, true);
    else goTo(idx + 1, true);
  }

  function playRow(row, done) {
    const { el, hooks } = buildRow(row);
    vis.append(el);
    if (row.k === "cmd") {
      const text = row.t;
      hooks.txt.textContent = "";
      const caret = h("span", "caret");
      el.querySelector(".txt").after(caret);
      let n = 0;
      const id = every(() => {
        n = Math.min(text.length, n + TYPE_CHARS);
        hooks.txt.textContent = text.slice(0, n);
        if (n >= text.length) { stopTimer(id); caret.remove(); done(); }
      }, TYPE_STEP_MS);
    } else if (row.k === "check") {
      hooks.mark.innerHTML = MARKS.wait;
      later(() => { hooks.mark.innerHTML = MARKS[row.r]; done(); }, row.p || 450);
    } else {
      done();
    }
  }

  function startStage(instant) {
    run++;
    const mine = run;
    stageDone = false;
    fillHeader();
    const rows = STAGES[idx].rows;
    if (instant || reduced) {
      showAllRows();
      finishStage();
      return;
    }
    const step = (k) => {
      if (mine !== run) return;
      if (k >= rows.length) { finishStage(); return; }
      const row = rows[k];
      later(() => { if (mine === run) playRow(row, () => step(k + 1)); }, row.d != null ? row.d : DEFAULT_PAUSE[row.k]);
    };
    step(0);
  }

  function goTo(i, animate, opts = {}) {
    clearTimers();
    run++;
    idx = Math.max(0, Math.min(STAGES.length - 1, i));
    stageDone = false;
    paintChrome();
    const begin = () => {
      panel.classList.remove("out");
      startStage(opts.instant);
    };
    if (animate && !reduced) {
      panel.classList.add("out");
      later(begin, FADE_MS);
    } else {
      begin();
    }
  }

  /* --- controls --- */
  function setPlaying(on) {
    if (reduced) return;
    playing = on;
    paintChrome();
    if (!on) {
      // Stop where we are and show the stage fully rendered.
      clearTimers();
      run++;
      panel.classList.remove("out");
      fillHeader();
      showAllRows();
      stageDone = true;
    } else if (visible) {
      if (stageDone) later(advance, 500);
      else startStage(false);
    }
  }

  const on = (el, fn) => el.addEventListener("click", (e) => {
    if (el.getAttribute("aria-disabled") === "true") return;
    fn(e);
  }, { signal: ac.signal });

  on(playBtn, () => setPlaying(!playing));
  on(prevBtn, () => goTo(idx - 1, true));
  on(nextBtn, () => goTo(idx + 1, true));
  on(replayBtn, () => {
    if (!reduced) playing = true;
    goTo(0, true);
  });
  nodes.forEach((n, i) => on(n.btn, () => {
    playing = false;
    goTo(i, true);
  }));

  /* --- pause while off-screen --- */
  let io = null;
  if (typeof IntersectionObserver !== "undefined") {
    io = new IntersectionObserver((entries) => {
      const now = entries[entries.length - 1].isIntersecting;
      if (now === visible) return;
      visible = now;
      if (!visible) {
        clearTimers();
        run++;
      } else if (playing) {
        if (stageDone) later(advance, 500);
        else { panel.classList.remove("out"); startStage(false); }
      }
    }, { threshold: 0.25 });
    io.observe(wrap);
  }

  paintChrome();
  if (reduced) {
    startStage(true);
  } else if (visible) {
    startStage(false);
  } else {
    fillHeader(); // wait for the observer to report visibility
  }

  return () => {
    run++;
    clearTimers();
    if (io) io.disconnect();
    ac.abort();
    root.replaceChildren();
  };
}
