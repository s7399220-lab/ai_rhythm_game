/* AI주간 리듬게임 - 4레인
 * 음원 방식 2가지
 *  1) 애플뮤직(MusicKit): 로그인한 계정으로 재생. 음원 분석이 불가능하므로
 *     (a) 곡을 들으며 직접 입력한 "녹화 채보", (b) songs.js의 BPM으로 만든 "자동 BPM 채보"를 사용
 *  2) 파일: assets/songs/ 의 음원 파일을 분석해 자동 채보
 */
const LANES = 4;
const KEYS = ["d", "f", "j", "k"];
const W = 480, H = 720, HIT_Y = 620, LANE_W = W / LANES;
const WINDOW = { perfect: 0.045, great: 0.09, good: 0.13 };
const LEAD_IN = 3.0;      // 시작 전 카운트다운(초)
const FIRST_NOTE = 4.0;   // 자동 BPM 채보의 첫 노트 최소 시각(초)

const $ = (s) => document.querySelector(s);
const canvas = $("#game");
const g = canvas.getContext("2d");

const opt = { diff: "normal", speed: 5, offset: 0, source: "youtube" };
function P() { return YTP; }
const recName = (s) => opt.source + "-" + s.id;
let selected = null;
let lastMode = "play";
let audioCtx = null;
const bufferCache = {};
const chartCache = {};
let lastRecorded = null;

let run = null; // 플레이 중 상태

const setStatus = (t) => { $("#status").textContent = t; };

/* ---------- 화면 전환 ---------- */
function show(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
  $("#screen-" + id).classList.add("active");
}

/* ---------- 곡 선택 UI ---------- */
const listEl = $("#song-list");
SONGS.forEach((s) => {
  const b = document.createElement("button");
  b.className = "song";
  b.style.setProperty("--c", s.color);
  b.innerHTML = `<span class="dot"></span><div><div class="t">${s.title}</div><div class="a">${s.artist || "&nbsp;"}</div></div><span class="tag" id="tag-${s.id}"></span>`;
  b.onclick = () => {
    selected = s;
    document.querySelectorAll(".song").forEach((x) => x.classList.remove("on"));
    b.classList.add("on");
    $("#btn-start").disabled = false;
    $("#btn-start").textContent = "▶ " + s.title + " 시작";
    $("#btn-record").disabled = opt.source === "file";
    setStatus("");
  };
  listEl.appendChild(b);
});

/* ----- 채보 저장/불러오기 (녹화 채보) ----- */
function loadLocalRec(song) {
  try {
    const raw = localStorage.getItem("rec:" + recName(song));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
async function loadRecorded(song) {
  const local = loadLocalRec(song);
  if (local && local.length) return local;
  try { // charts/<id>.json (녹화 후 내려받은 파일을 charts 폴더에 넣어두면 사용)
    const r = await fetch(`charts/${recName(song)}.json`);
    if (r.ok) { const j = await r.json(); if (Array.isArray(j) && j.length) return j; }
  } catch {}
  return null;
}

/* ----- 곡 옆 태그 ----- */
async function refreshTags() {
  for (const s of SONGS) {
    const el = $("#tag-" + s.id);
    el.className = "tag";
    if (opt.source === "file") {
      try {
        const r = await fetch(s.file, { method: "HEAD" });
        if (!r.ok) throw 0;
        el.textContent = "";
      } catch { el.textContent = "음원 없음 (데모 모드)"; }
    } else {
      if (opt.source === "youtube" && !YTP.parseId(s.youtube)) { el.textContent = "유튜브 링크 필요"; continue; }
      const rec = await loadRecorded(s);
      if (rec) { el.textContent = "녹화 채보 ✅"; el.classList.add("ok"); }
      else if (s.bpm > 0) { el.textContent = "BPM 채보 ✅"; el.classList.add("ok"); }
      else el.textContent = "채보 없음 (녹화 필요)";
    }
  }
}

/* ----- 옵션 ----- */
document.querySelectorAll("#diff-buttons button").forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll("#diff-buttons button").forEach((x) => x.classList.remove("on"));
    b.classList.add("on");
    opt.diff = b.dataset.diff;
  };
});
document.querySelectorAll("#src-buttons button").forEach((b) => {
  b.onclick = () => {
    document.querySelectorAll("#src-buttons button").forEach((x) => x.classList.remove("on"));
    b.classList.add("on");
    opt.source = b.dataset.src;
    $("#btn-record").disabled = !selected || opt.source === "file";
    refreshTags();
    connectProvider();
  };
});
$("#speed").oninput = (e) => { opt.speed = +e.target.value; $("#speed-val").textContent = opt.speed; };
$("#offset").oninput = (e) => { opt.offset = +e.target.value; $("#offset-val").textContent = opt.offset; };

$("#btn-start").onclick = () => { lastMode = "play"; startSong("play"); };
$("#btn-record").onclick = () => { lastMode = "record"; startSong("record"); };
$("#btn-retry").onclick = () => startSong(lastMode);
$("#btn-menu").onclick = () => { show("select"); refreshTags(); };
$("#btn-quit").onclick = () => quitGame();
$("#btn-export").onclick = () => {
  if (!lastRecorded) return;
  const blob = new Blob([JSON.stringify(lastRecorded.notes)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = lastRecorded.id + ".json";
  a.click();
  URL.revokeObjectURL(a.href);
};

/* ----- 음원 서비스 연결 (유튜브 / 애플뮤직) ----- */
function updateAmState() {
  const btn = $("#btn-am-login");
  if (opt.source === "file") {
    $("#am-state").textContent = "파일 모드: assets/songs 폴더의 음원 사용";
    btn.hidden = true;
    return;
  }
  btn.hidden = false;
  const p = P();
  const name = "유튜브";
  $("#am-state").textContent = p.authorized
    ? name + ": 연결됨 ✅"
    : p.ready ? name + ": 로그인이 필요해요" : name + ": " + (p.lastError || "연결 필요");
  btn.textContent = p.authorized ? "다시 연결" : "연결";
}
$("#btn-am-login").onclick = async () => {
  setStatus("연결 중...");
  try { await P().login(); setStatus(""); } catch (e) { setStatus("⚠ " + (e.message || e)); }
  updateAmState();
};
function connectProvider() {
  if (opt.source !== "file") P().init().then(updateAmState);
  updateAmState();
}
connectProvider();
refreshTags();

/* ---------- 채보 생성 공통 ---------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hash(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

function pushLane(notes, rng, t) {
  // 같은 레인 3연속 방지
  let lane = Math.floor(rng() * LANES);
  const n = notes.length;
  if (n >= 2 && notes[n - 1].lane === lane && notes[n - 2].lane === lane) lane = (lane + 1 + Math.floor(rng() * 3)) % LANES;
  notes.push({ t, lane });
}

const DIFF = {
  easy:   { minGap: 0.42, k: 1.9 },
  normal: { minGap: 0.28, k: 1.5 },
  hard:   { minGap: 0.17, k: 1.2 },
};
const THIN_GAP = { easy: 0.42, normal: 0.28, hard: 0 };

// 녹화 채보를 난이도에 맞게 솎아내기
function thin(notes, diff) {
  const gap = THIN_GAP[diff];
  const out = [];
  let last = -10;
  for (const n of [...notes].sort((a, b) => a.t - b.t)) {
    if (n.t - last >= gap) { out.push({ t: n.t, lane: n.lane }); last = n.t; }
  }
  return out;
}

// 자동 BPM 채보 (비트 격자 기반)
function gridChart(song, diff, length) {
  const rng = mulberry32(hash(song.id + diff + "grid"));
  const beat = 60 / song.bpm;
  const notes = [];
  let t = song.offset || 0;
  while (t < FIRST_NOTE) t += beat;
  const end = (length || 240) - 2;
  let i = 0, rest = 0;
  for (; t < end; t += beat, i++) {
    if (i > 0 && i % 16 === 0 && rng() < 0.25) rest = 4; // 가끔 쉬어가는 구간
    if (rest > 0) { rest--; continue; }
    if (diff === "easy") {
      if (i % 2 === 0) pushLane(notes, rng, t);
    } else {
      pushLane(notes, rng, t);
      if (rng() < (diff === "normal" ? 0.25 : 0.6)) pushLane(notes, rng, t + beat / 2);
    }
  }
  return notes;
}

// 파일 음원 분석 채보
function makeChart(song, buffer, diff) {
  const rng = mulberry32(hash(song.id + diff));
  const notes = [];
  if (!buffer) { // 데모: 120BPM 8분음표
    for (let t = 1; t < 60; t += 0.5) pushLane(notes, rng, t);
    return { notes, duration: 62 };
  }
  const sr = buffer.sampleRate;
  const ch0 = buffer.getChannelData(0);
  const ch1 = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : ch0;
  const hop = 512;
  const frames = Math.floor(ch0.length / hop);
  const energy = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    let s = 0;
    for (let j = 0; j < hop; j++) { const v = (ch0[i * hop + j] + ch1[i * hop + j]) * 0.5; s += v * v; }
    energy[i] = Math.sqrt(s / hop);
  }
  const flux = new Float32Array(frames);
  for (let i = 1; i < frames; i++) flux[i] = Math.max(0, energy[i] - energy[i - 1]);

  const dt = hop / sr;
  const win = Math.round(1 / dt);
  const { minGap, k } = DIFF[diff];
  let last = -10;
  for (let i = 2; i < frames - 2; i++) {
    let sum = 0, cnt = 0;
    for (let j = Math.max(0, i - win); j < Math.min(frames, i + win); j++) { sum += flux[j]; cnt++; }
    const thr = (sum / cnt) * k + 0.0015;
    const t = i * dt;
    if (flux[i] > thr && flux[i] >= flux[i - 1] && flux[i] >= flux[i + 1] && t - last >= minGap && t > 1.0) {
      pushLane(notes, rng, t);
      last = t;
    }
  }
  return { notes, duration: buffer.duration };
}

/* ---------- 파일 음원 로드 ---------- */
async function loadBuffer(song) {
  if (bufferCache[song.id] !== undefined) return bufferCache[song.id];
  try {
    const res = await fetch(song.file);
    if (!res.ok) throw new Error("not found");
    const arr = await res.arrayBuffer();
    bufferCache[song.id] = await audioCtx.decodeAudioData(arr);
  } catch (e) {
    bufferCache[song.id] = null; // 데모 모드
  }
  return bufferCache[song.id];
}

/* ---------- 게임 시작 ---------- */
function newRun(extra) {
  return Object.assign({
    song: selected,
    notes: [],
    duration: 0,
    score: 0, combo: 0, maxCombo: 0,
    count: { perfect: 0, great: 0, good: 0, miss: 0 },
    judge: { text: "", t: -10, color: "#fff" },
    flash: [0, 0, 0, 0],
    held: [false, false, false, false],
    particles: [],
    rec: [],
    done: false,
    raf: 0,
  }, extra);
}

async function startSong(mode) {
  if (!selected) return;
  if (run) { cancelAnimationFrame(run.raf); run = null; }
  if (opt.source !== "file") return startApple(mode);
  return startFile();
}

async function startFile() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") await audioCtx.resume();

  setStatus("곡 불러오는 중...");
  const buffer = await loadBuffer(selected);
  const key = selected.id + opt.diff;
  if (!chartCache[key]) chartCache[key] = makeChart(selected, buffer, opt.diff);
  const chart = chartCache[key];
  setStatus(buffer ? "" : "⚠ 음원 파일이 없어 데모 모드로 실행합니다 (소리 없음)");

  run = newRun({
    mode: "play", apple: false,
    notes: chart.notes.map((n) => ({ ...n, state: 0 })),
    duration: chart.duration,
    travel: 2.2 - opt.speed * 0.16,
    startAt: audioCtx.currentTime + LEAD_IN,
    src: null,
  });
  if (buffer) {
    const src = audioCtx.createBufferSource();
    src.buffer = buffer;
    src.connect(audioCtx.destination);
    src.start(run.startAt);
    run.src = src;
  }
  show("game");
  run.raf = requestAnimationFrame(loop);
}

async function startApple(mode) {
  setStatus("연결 중...");
  try {
    if (!P().authorized) await P().login();
  } catch (e) { setStatus("⚠ " + (e.message || e)); updateAmState(); return; }
  updateAmState();

  let info;
  try { info = await P().resolve(selected); }
  catch (e) { setStatus("⚠ " + (e.message || e)); return; }

  // 채보 준비
  let notes = [];
  if (mode === "play") {
    const rec = await loadRecorded(selected);
    if (rec) notes = thin(rec, opt.diff);
    else if (selected.bpm > 0) notes = gridChart(selected, opt.diff, selected.length || 0);
    else {
      setStatus("⚠ 이 곡은 채보가 없어요. '채보 녹화'로 만들거나 songs.js에 bpm/offset을 입력하세요.");
      return;
    }
  }

  setStatus(`곡: ${info.name} - ${info.artist}`);
  try { await P().prepare(info.id); }
  catch (e) { setStatus("⚠ 곡을 불러오지 못했어요: " + (e.message || e)); return; }

  run = newRun({
    mode, apple: true,
    notes: notes.map((n) => ({ ...n, state: 0 })),
    duration: selected.length || 0,
    travel: 2.2 - opt.speed * 0.16,
    t0: performance.now() / 1000 + LEAD_IN, // 재생 시작 시각
    playCalled: false, playAt: 0, synced: false, base: 0, lastRep: -1, trimmed: false, err: "",
  });
  show("game");
  run.raf = requestAnimationFrame(loop);
}

/* ---------- 시간 ---------- */
function songTime() {
  if (!run.apple) return audioCtx.currentTime - run.startAt - opt.offset / 1000;
  const p = performance.now() / 1000;
  if (run.synced) return p + run.base - opt.offset / 1000;
  return p - run.t0 - opt.offset / 1000;
}

// 애플뮤직 재생 시각과 화면 시계를 부드럽게 맞춤
function appleTick() {
  const p = performance.now() / 1000;
  if (P().error && !run.err) run.err = P().error;
  if (!run.playCalled && p >= run.t0) {
    run.playCalled = true;
    run.playAt = p;
    P().play().catch((e) => { run.err = "재생 실패: " + (e.message || e); });
  }
  if (!run.playCalled) return;
  const rep = P().time;
  if (P().playing && rep > 0.05 && rep !== run.lastRep) {
    const nb = rep - p;
    run.base = run.synced ? run.base * 0.85 + nb * 0.15 : nb;
    run.synced = true;
    run.lastRep = rep;
    const d = P().duration;
    if (d > 0) {
      run.duration = d;
      if (!run.trimmed) { run.notes = run.notes.filter((n) => n.t < d - 0.5); run.trimmed = true; }
    }
  }
  if (!run.synced && p - run.playAt > 12 && !run.err) run.err = "곡이 재생되지 않아요 (구독 상태/로그인을 확인하세요)";
}

function failRun(msg) {
  cancelAnimationFrame(run.raf);
  P().stop();
  run = null;
  show("select");
  setStatus("⚠ " + msg);
}

function quitGame() {
  if (!run) return;
  cancelAnimationFrame(run.raf);
  try { run.src && run.src.stop(); } catch {}
  if (run.apple) P().stop();
  run = null;
  show("select");
  refreshTags();
}

/* ---------- 입력 ---------- */
function press(lane) {
  if (!run || run.done) return;
  run.held[lane] = true;
  run.flash[lane] = 1;
  const now = songTime();

  if (run.mode === "record") { // 채보 녹화
    if (now < 0.3) return;
    const prev = run.rec[run.rec.length - 1];
    if (prev && prev.lane === lane && now - prev.t < 0.06) return;
    run.rec.push({ t: Math.round(now * 1000) / 1000, lane });
    return;
  }

  let best = null;
  for (const n of run.notes) {
    if (n.state !== 0 || n.lane !== lane) continue;
    const d = Math.abs(n.t - now);
    if (d <= WINDOW.good && (!best || d < Math.abs(best.t - now))) best = n;
    if (n.t - now > WINDOW.good) break;
  }
  if (!best) return;
  const d = Math.abs(best.t - now);
  const kind = d <= WINDOW.perfect ? "perfect" : d <= WINDOW.great ? "great" : "good";
  best.state = 1;
  applyJudge(kind, lane);
}

function applyJudge(kind, lane) {
  run.count[kind]++;
  if (kind === "miss") run.combo = 0;
  else {
    run.combo++;
    run.maxCombo = Math.max(run.maxCombo, run.combo);
    const base = { perfect: 1000, great: 700, good: 400 }[kind];
    run.score += Math.round(base * (1 + Math.min(run.combo, 50) / 100));
    if (lane != null) for (let i = 0; i < 8; i++) run.particles.push({ x: lane * LANE_W + LANE_W / 2, y: HIT_Y, vx: (Math.random() - 0.5) * 240, vy: -Math.random() * 220, life: 0.4 });
  }
  const label = { perfect: "PERFECT", great: "GREAT", good: "GOOD", miss: "MISS" }[kind];
  const color = { perfect: "#ffe14a", great: "#6cf5a0", good: "#6cb5ff", miss: "#ff5b5b" }[kind];
  run.judge = { text: label, t: performance.now() / 1000, color };
}

window.addEventListener("keydown", (e) => {
  if (e.repeat) return;
  if (e.key === "Escape") return quitGame();
  if (e.key === "Enter" && run && run.mode === "record" && !run.done) return finish();
  const i = KEYS.indexOf(e.key.toLowerCase());
  if (i >= 0) press(i);
});
window.addEventListener("keyup", (e) => {
  const i = KEYS.indexOf(e.key.toLowerCase());
  if (i >= 0 && run) run.held[i] = false;
});
canvas.addEventListener("pointerdown", (e) => {
  const r = canvas.getBoundingClientRect();
  const lane = Math.min(LANES - 1, Math.max(0, Math.floor(((e.clientX - r.left) / r.width) * LANES)));
  press(lane);
});
canvas.addEventListener("pointerup", () => run && run.held.fill(false));

/* ---------- 메인 루프 ---------- */
let lastFrame = 0;
function loop(ts) {
  if (!run) return;
  const dtSec = Math.min(0.05, (ts - lastFrame) / 1000 || 0.016);
  lastFrame = ts;

  if (run.apple) {
    appleTick();
    if (run.err) return failRun(run.err);
  }
  const now = songTime();

  // 놓친 노트 처리
  for (const n of run.notes) {
    if (n.state === 0 && now - n.t > WINDOW.good) { n.state = 2; applyJudge("miss"); }
  }

  draw(now, dtSec);
  if (run.mode === "record") drawRecordOverlay(now);

  // 종료 판단
  if (run.apple) {
    const p = performance.now() / 1000;
    const ended = run.synced && P().ended && p - run.playAt > 5;
    if (ended || (run.duration > 0 && now > run.duration + 0.5)) return finish();
  } else {
    const lastNote = run.notes.length ? run.notes[run.notes.length - 1].t : 0;
    if (now > Math.min(run.duration, lastNote + 3) + 0.5) return finish();
  }
  run.raf = requestAnimationFrame(loop);
}

/* ---------- 그리기 ---------- */
function draw(now, dt) {
  const color = run.song.color;
  g.clearRect(0, 0, W, H);
  g.fillStyle = "#05060d"; g.fillRect(0, 0, W, H);

  // 레인
  for (let i = 0; i < LANES; i++) {
    const x = i * LANE_W;
    g.fillStyle = i % 2 ? "#0b0e1c" : "#0e1122";
    g.fillRect(x, 0, LANE_W, H);
    if (run.flash[i] > 0) {
      const grad = g.createLinearGradient(0, HIT_Y - 260, 0, HIT_Y);
      grad.addColorStop(0, "rgba(255,255,255,0)");
      grad.addColorStop(1, hexA(color, 0.35 * run.flash[i]));
      g.fillStyle = grad; g.fillRect(x, HIT_Y - 260, LANE_W, 260);
      run.flash[i] = Math.max(0, run.flash[i] - dt * 4);
    }
    g.strokeStyle = "#1a1f38"; g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke();
  }

  // 판정선
  g.fillStyle = color; g.fillRect(0, HIT_Y - 2, W, 4);
  for (let i = 0; i < LANES; i++) {
    g.fillStyle = run.held[i] ? color : "#1c2140";
    g.fillRect(i * LANE_W + 6, HIT_Y + 14, LANE_W - 12, 44);
    g.fillStyle = run.held[i] ? "#000" : "#8b90b0";
    g.font = "bold 22px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(KEYS[i].toUpperCase(), i * LANE_W + LANE_W / 2, HIT_Y + 36);
  }

  // 노트
  for (const n of run.notes) {
    if (n.state !== 0) continue;
    const y = HIT_Y - ((n.t - now) / run.travel) * HIT_Y;
    if (y < -30) break;
    if (y > H + 30) continue;
    g.fillStyle = color;
    roundRect(n.lane * LANE_W + 8, y - 11, LANE_W - 16, 22, 6);
    g.fill();
    g.fillStyle = "rgba(255,255,255,.55)";
    roundRect(n.lane * LANE_W + 12, y - 8, LANE_W - 24, 6, 3);
    g.fill();
  }

  // 파티클
  run.particles = run.particles.filter((p) => (p.life -= dt) > 0);
  for (const p of run.particles) {
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 600 * dt;
    g.fillStyle = hexA(color, Math.max(0, p.life * 2.5));
    g.fillRect(p.x, p.y, 4, 4);
  }

  // HUD
  g.textAlign = "left"; g.textBaseline = "top";
  g.fillStyle = "#fff"; g.font = "bold 22px sans-serif";
  g.fillText(String(run.score).padStart(7, "0"), 14, 12);
  g.font = "13px sans-serif"; g.fillStyle = "#8b90b0";
  g.fillText(run.song.title, 14, 42);

  // 진행바
  const prog = run.duration > 0 ? Math.max(0, Math.min(1, now / run.duration)) : 0;
  g.fillStyle = "#1a1f38"; g.fillRect(0, 0, W, 4);
  g.fillStyle = color; g.fillRect(0, 0, W * prog, 4);

  // 콤보 / 판정
  if (run.combo >= 2) {
    g.textAlign = "center"; g.fillStyle = "rgba(255,255,255,.85)"; g.font = "bold 54px sans-serif";
    g.fillText(run.combo, W / 2, 200);
    g.font = "14px sans-serif"; g.fillStyle = "#8b90b0"; g.fillText("COMBO", W / 2, 262);
  }
  const age = performance.now() / 1000 - run.judge.t;
  if (age < 0.6) {
    g.globalAlpha = 1 - age / 0.6;
    g.textAlign = "center"; g.fillStyle = run.judge.color; g.font = "bold 28px sans-serif";
    g.fillText(run.judge.text, W / 2, 330 - age * 20);
    g.globalAlpha = 1;
  }

  // 카운트다운
  if (now < -0.05) {
    g.textAlign = "center"; g.textBaseline = "alphabetic"; g.fillStyle = "#fff"; g.font = "bold 90px sans-serif";
    g.fillText(Math.ceil(-now), W / 2, H / 2 - 20);
  }
}

function drawRecordOverlay(now) {
  g.textAlign = "center"; g.textBaseline = "alphabetic";
  g.fillStyle = "#ff5b5b"; g.font = "bold 26px sans-serif";
  g.fillText("🎙 채보 녹화 중", W / 2, 150);
  g.fillStyle = "#fff"; g.font = "bold 40px sans-serif";
  g.fillText(run.rec.length + " 노트", W / 2, 215);
  g.fillStyle = "#8b90b0"; g.font = "15px sans-serif";
  g.fillText("노래에 맞춰 D F J K를 누르세요", W / 2, 260);
  g.fillText("Enter: 저장하고 끝내기  /  ESC: 취소", W / 2, 285);
}

function roundRect(x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
}

/* ---------- 결과 ---------- */
function finish() {
  run.done = true;
  try { run.src && run.src.stop(); } catch {}
  if (run.apple) P().stop();

  if (run.mode === "record") {
    const notes = run.rec.slice().sort((a, b) => a.t - b.t);
    try { localStorage.setItem("rec:" + recName(run.song), JSON.stringify(notes)); } catch {}
    lastRecorded = { id: recName(run.song), notes };
    $("#r-title").textContent = run.song.title + " - 채보 녹화 완료";
    $("#r-grade").textContent = notes.length;
    $("#r-grade").style.color = run.song.color;
    $("#r-score").textContent = "노트 " + notes.length + "개 저장됨";
    $("#r-table").innerHTML = `<tr><td colspan="2">이제 '보통/쉬움/어려움' 난이도로 플레이할 수 있어요.<br>파일로 저장해 charts/${recName(run.song)}.json 에 넣으면 다른 PC에서도 쓸 수 있어요.</td></tr>`;
    $("#btn-export").hidden = false;
    show("result");
    return;
  }

  $("#btn-export").hidden = true;
  const c = run.count;
  const total = (c.perfect + c.great + c.good + c.miss) || 1;
  const acc = ((c.perfect * 1 + c.great * 0.7 + c.good * 0.4) / total) * 100;
  const grade = acc >= 95 ? "S" : acc >= 90 ? "A" : acc >= 80 ? "B" : acc >= 70 ? "C" : "D";
  $("#r-title").textContent = run.song.title + (run.song.artist ? " - " + run.song.artist : "");
  $("#r-grade").textContent = grade;
  $("#r-grade").style.color = run.song.color;
  $("#r-score").textContent = run.score.toLocaleString() + "점 (" + acc.toFixed(1) + "%)";
  $("#r-table").innerHTML = `
    <tr><td>PERFECT</td><td>${c.perfect}</td></tr>
    <tr><td>GREAT</td><td>${c.great}</td></tr>
    <tr><td>GOOD</td><td>${c.good}</td></tr>
    <tr><td>MISS</td><td>${c.miss}</td></tr>
    <tr><td>MAX COMBO</td><td>${run.maxCombo}</td></tr>`;
  show("result");
}
