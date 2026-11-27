const $ = (id) => document.getElementById(id);
const canvas = $("gameCanvas");
const ctx = canvas.getContext("2d");

const img = (p) => Object.assign(new Image(), { src: "assets/" + p });
const imgs = {
  bg: img("Flappy Bird/background-day.png"),
  base: img("Flappy Bird/base.png"),
  pipe: img("Flappy Bird/pipe-green.png"),
  msg: img("UI/message.png"),
  over: img("UI/gameover.png")
};
const birdImgs = ["up", "mid", "down"].map((f) => img(`Flappy Bird/yellowbird-${f}flap.png`));
const numImgs = Array.from({ length: 10 }, (_, i) => img(`UI/Numbers/${i}.png`));
const sfx = Object.fromEntries(["wing", "point", "hit", "die", "swoosh"].map((n) => [n, new Audio(`assets/Sound Efects/${n}.wav`)]));
const play = (a) => { a.currentTime = 0; a.play().catch(() => {}); };

// Prosta muzyka w tle (Web Audio API)
let audioCtx = null, musicTimer = null, noteIdx = 0;
const melody = [262, 330, 392, 523, 392, 330, 294, 349, 440, 349, 294, 247];

function setMusic(on) {
  if (!on) { clearInterval(musicTimer); musicTimer = null; return; }
  if (musicTimer) return;
  audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  musicTimer = setInterval(() => {
    if (state !== "PLAYING") return;
    const osc = audioCtx.createOscillator(), gain = audioCtx.createGain();
    osc.type = "triangle";
    osc.frequency.value = melody[noteIdx++ % melody.length];
    gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.22);
    osc.connect(gain); gain.connect(audioCtx.destination);
    osc.start(); osc.stop(audioCtx.currentTime + 0.22);
  }, 260);
}

// Stałe i stan gry
const GROUND_Y = 400, PIPE_W = 52, PIPE_H = 320, GRAVITY = 0.15, JUMP = -4.0;
let state = "READY", bird, pipes, boosts, flyers, baseX = 0, ticks = 0;
let score = 0, prevScore = 0, ghostTimer = 0, fastTimer = 0, lowGravTimer = 0, spinStart = 0, isRecord = false;

const getScores = () => JSON.parse(localStorage.getItem("flappy_top5") || "[]");

function resetGame() {
  bird = { x: 140, y: 200, w: 34, h: 24, vy: 0, frame: 0, angle: 0 };
  pipes = []; boosts = []; flyers = [];
  ticks = score = ghostTimer = fastTimer = lowGravTimer = 0;
  isRecord = false;
  state = "READY";
  $("gameOverPanel").style.display = "none";
  $("congratsText").style.display = "none";
  play(sfx.swoosh);
}

function spawnPipe() {
  const gap = 120 + Math.random() * 35;
  const top = 50 + Math.random() * (GROUND_Y - gap - 110);
  pipes.push({ x: canvas.width + 10, top, gap, passed: false });

  if (Math.random() < 0.35) {
    boosts.push({ x: canvas.width + 36, y: top + gap / 2, r: 11, type: Math.random() < 0.5 ? "ghost" : "fast", hit: false });
  }
  if (pipes.length >= 2 && Math.random() < 0.4) {
    flyers.push({ x: canvas.width + 140, baseY: 90 + Math.random() * 220, y: 150, r: 10, speed: 2.8 + Math.random() * 1.2, phase: Math.random() * 6.28 });
  }
}

function crash() {
  if (state !== "PLAYING") return;
  play(sfx.hit); play(sfx.die); setMusic(false);
  state = "DYING";
  bird.vy = 0;
}

function showGameOver() {
  state = "GAMEOVER";
  const top5 = [...getScores(), score].sort((a, b) => b - a).slice(0, 5);
  localStorage.setItem("flappy_top5", JSON.stringify(top5));

  $("currentScore").textContent = score;
  $("bestScore").textContent = top5[0] ?? score;
  $("prevScore").textContent = prevScore;
  prevScore = score;

  const list = $("topScores");
  list.innerHTML = "";
  top5.forEach((s) => {
    const li = document.createElement("li");
    li.textContent = s + " pkt";
    list.appendChild(li);
  });

  $("congratsText").style.display = isRecord ? "block" : "none";
  $("gameOverPanel").style.display = "block";
}

function update() {
  ticks++;
  const baseW = imgs.base.width || 336;

  if (state === "READY") {
    baseX = (baseX - 1.5) % baseW;
    bird.y = 200 + Math.sin(ticks * 0.08) * 6;
    if (ticks % 8 === 0) bird.frame = (bird.frame + 1) % 3;
    return;
  }
  if (state === "RECORD_SPIN") {
    bird.angle += 0.25;
    if (performance.now() - spinStart >= 3000) showGameOver();
    return;
  }
  if (state === "DYING") {
    bird.vy += GRAVITY * 1.2;
    bird.y += bird.vy;
    bird.angle = Math.min(Math.PI / 2, bird.angle + 0.12);
    if (bird.y + bird.h >= GROUND_Y) {
      bird.y = GROUND_Y - bird.h;
      const oldBest = getScores()[0] || 0;
      isRecord = score > 0 && score > oldBest;
      if (isRecord) { state = "RECORD_SPIN"; spinStart = performance.now(); }
      else showGameOver();
    }
    return;
  }
  if (state !== "PLAYING") return;

  let speed = 2;
  if (fastTimer > 0) {
    fastTimer--;
    speed = 6;
    bird.vy = 0;
    if (fastTimer === 0) {
      if (pipes.some((p) => p.x < bird.x + bird.w + 50 && p.x + PIPE_W > bird.x - 20)) fastTimer = 1;
      else { ghostTimer = Math.max(ghostTimer, 90); lowGravTimer = 30; }
    }
  } else {
    bird.vy += lowGravTimer > 0 ? GRAVITY * 0.2 : GRAVITY;
    bird.y += bird.vy;
    if (lowGravTimer > 0) lowGravTimer--;
  }

  if (ghostTimer > 0) ghostTimer--;
  bird.angle = bird.vy < 0 ? -0.45 : Math.min(Math.PI / 2, bird.angle + 0.06);
  if (ticks % 6 === 0) bird.frame = (bird.frame + 1) % 3;
  baseX = (baseX - speed) % baseW;

  if (pipes.length === 0 || canvas.width - pipes[pipes.length - 1].x >= 220) spawnPipe();

  const immune = ghostTimer > 0 || fastTimer > 0;
  pipes.forEach((p) => {
    p.x -= speed;
    if (!p.passed && p.x + PIPE_W < bird.x) { p.passed = true; score++; play(sfx.point); }
    const hitX = bird.x + bird.w - 4 > p.x && bird.x + 4 < p.x + PIPE_W;
    if (!immune && hitX && (bird.y + 3 < p.top || bird.y + bird.h - 3 > p.top + p.gap)) crash();
  });
  pipes = pipes.filter((p) => p.x + PIPE_W > -10);

  const cx = bird.x + bird.w / 2, cy = bird.y + bird.h / 2;
  boosts.forEach((b) => {
    b.x -= speed;
    if (!b.hit && Math.hypot(cx - b.x, cy - b.y) < b.r + 14) {
      b.hit = true;
      play(sfx.point);
      if (b.type === "ghost") ghostTimer = 300;
      else { fastTimer = 75; score += 5; }
    }
  });
  boosts = boosts.filter((b) => !b.hit && b.x > -20);

  flyers.forEach((f) => {
    f.x -= f.speed + (fastTimer > 0 ? 4 : 0);
    f.y = f.baseY + Math.sin(ticks * 0.08 + f.phase) * 25;
    if (!immune && Math.hypot(cx - f.x, cy - f.y) < f.r + 11) crash();
  });
  flyers = flyers.filter((f) => f.x > -30);

  if (bird.y + bird.h >= GROUND_Y) { bird.y = GROUND_Y - bird.h; crash(); }
  if (bird.y < 0) { bird.y = 0; bird.vy = 0; }
}

function circle(x, y, r, fill, stroke) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = fill; ctx.fill();
  ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke();
}

function draw() {
  for (let x = 0; x < canvas.width; x += 288) ctx.drawImage(imgs.bg, x, 0, 288, canvas.height);

  ctx.save();
  if (ghostTimer > 0) ctx.globalAlpha = 0.35;
  pipes.forEach((p) => {
    ctx.save();
    ctx.translate(p.x + PIPE_W / 2, p.top);
    ctx.scale(1, -1);
    ctx.drawImage(imgs.pipe, -PIPE_W / 2, 0, PIPE_W, PIPE_H);
    ctx.restore();
    ctx.drawImage(imgs.pipe, p.x, p.top + p.gap, PIPE_W, PIPE_H);
  });
  ctx.restore();

  boosts.forEach((b) => {
    circle(b.x, b.y, b.r, b.type === "ghost" ? "#4fc3f7" : "#ffd54f", "#fff");
    ctx.fillStyle = "#000"; ctx.font = "bold 11px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(b.type === "ghost" ? "G" : ">>", b.x, b.y + 4);
  });
  flyers.forEach((f) => circle(f.x, f.y, f.r, "#e53935", "#543847"));

  const baseW = imgs.base.width || 336;
  for (let x = baseX; x < canvas.width; x += baseW) ctx.drawImage(imgs.base, x, GROUND_Y, baseW, canvas.height - GROUND_Y);

  ctx.save();
  ctx.translate(bird.x + bird.w / 2, bird.y + bird.h / 2);
  ctx.rotate(bird.angle);
  ctx.drawImage(birdImgs[bird.frame], -bird.w / 2, -bird.h / 2, bird.w, bird.h);
  ctx.restore();

  ctx.font = "bold 12px sans-serif"; ctx.textAlign = "left";
  if (ghostTimer > 0) { ctx.fillStyle = "#0288d1"; ctx.fillText(`DUCH: ${Math.ceil(ghostTimer / 60)}s`, 10, 24); }
  if (fastTimer > 0) { ctx.fillStyle = "#f57c00"; ctx.fillText("FAST FORWARD!", 10, 42); }

  const digits = String(score).split("");
  digits.forEach((d, i) => {
    const nImg = numImgs[+d];
    if (nImg.complete) ctx.drawImage(nImg, canvas.width - 12 - (digits.length - i) * 24, 14);
  });

  if (state === "READY") ctx.drawImage(imgs.msg, (canvas.width - imgs.msg.width) / 2, 70);
  if (state === "GAMEOVER") ctx.drawImage(imgs.over, (canvas.width - imgs.over.width) / 2, 110);
}

function handleKey(e) {
  if (e.code !== "Space") return;
  e.preventDefault();
  if (state === "READY") { state = "PLAYING"; setMusic(true); bird.vy = JUMP; play(sfx.wing); }
  else if (state === "PLAYING" && fastTimer === 0) { bird.vy = JUMP; play(sfx.wing); }
  else if (state === "GAMEOVER" && !e.repeat) resetGame();
}

document.addEventListener("keydown", handleKey);
$("restartBtn").addEventListener("click", resetGame);
window.addEventListener("beforeunload", () => { document.removeEventListener("keydown", handleKey); setMusic(false); });

resetGame();
(function loop() { update(); draw(); requestAnimationFrame(loop); })();
