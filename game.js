/* =========================================================
   EURO TACTIC 2D – Match Engine v1.1 (Stable)
   HTML5 Canvas | PWA Ready
========================================================= */

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

/* ================= Resize ================= */
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

/* ================= Audio (Mobile Safe) ================= */
let audioCtx = null;
let audioUnlocked = false;

function unlockAudio() {
  if (audioUnlocked) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  audioUnlocked = true;
}

function playSound(freq = 500, dur = 0.12) {
  if (!audioUnlocked) return;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.frequency.value = freq;
  g.gain.value = 0.2;
  o.connect(g);
  g.connect(audioCtx.destination);
  o.start();
  o.stop(audioCtx.currentTime + dur);
}

/* ================= Touch Control ================= */
const touch = { active: false, x: 0, y: 0 };

canvas.addEventListener("touchstart", e => {
  unlockAudio();
  touch.active = true;
  touch.x = e.touches[0].clientX;
  touch.y = e.touches[0].clientY;
});

canvas.addEventListener("touchmove", e => {
  touch.x = e.touches[0].clientX;
  touch.y = e.touches[0].clientY;
});

canvas.addEventListener("touchend", () => touch.active = false);

/* ================= Utils ================= */
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/* ================= Ball ================= */
class Ball {
  constructor() {
    this.reset();
  }
  reset() {
    this.x = canvas.width / 2;
    this.y = canvas.height / 2;
    this.vx = 0;
    this.vy = 0;
  }
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.97;
    this.vy *= 0.97;

    if (this.x < 6 || this.x > canvas.width - 6) this.vx *= -1;
    if (this.y < 6 || this.y > canvas.height - 6) this.vy *= -1;
  }
  draw() {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(this.x, this.y, 6, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* ================= Player ================= */
class Player {
  constructor(x, y, color, ai = false) {
    this.x = x;
    this.y = y;
    this.color = color;
    this.ai = ai;
    this.speed = 3;
  }
  update(target) {
    if (!this.ai) return;
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const d = Math.hypot(dx, dy);
    if (d > 5) {
      this.x += (dx / d) * this.speed;
      this.y += (dy / d) * this.speed;
    }
  }
  draw() {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 12, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* ================= Game Objects ================= */
const ball = new Ball();
const player = new Player(180, canvas.height / 2, "#1e90ff");
const enemy = new Player(canvas.width - 180, canvas.height / 2, "#ff3b3b", true);

let score = 0;
let goalLock = false;

/* ================= Kick ================= */
function kick(from, power = 6) {
  const dx = ball.x - from.x;
  const dy = ball.y - from.y;
  const d = Math.hypot(dx, dy) || 1;
  ball.vx = (dx / d) * power;
  ball.vy = (dy / d) * power;
  playSound(600);
}

/* ================= Update ================= */
function update() {
  // Player movement
  if (touch.active) {
    const dx = touch.x - player.x;
    const dy = touch.y - player.y;
    const d = Math.hypot(dx, dy);
    if (d > 10) {
      player.x += (dx / d) * player.speed;
      player.y += (dy / d) * player.speed;
    }
  }

  enemy.update(ball);
  ball.update();

  if (dist(player, ball) < 18) kick(player, 7);
  if (dist(enemy, ball) < 18) kick(enemy, 6);

  // Goal (Right Side)
  if (!goalLock && ball.x > canvas.width - 20) {
    goalLock = true;
    score++;
    playSound(900, 0.2);

    setTimeout(() => {
      ball.reset();
      player.x = 180;
      enemy.x = canvas.width - 180;
      goalLock = false;
    }, 800);
  }
}

/* ================= Draw ================= */
function draw() {
  ctx.fillStyle = "#0b6623";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "#fff";
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();

  player.draw();
  enemy.draw();
  ball.draw();

  ctx.fillStyle = "#fff";
  ctx.font = "20px sans-serif";
  ctx.fillText("Score: " + score, 20, 30);
}

/* ================= Loop ================= */
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}
loop();
