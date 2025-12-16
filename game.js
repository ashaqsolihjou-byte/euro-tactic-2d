/* =========================================================
   EURO TACTIC 2D – Match Engine v1.2 (Score, Timer, Basic Lineup)
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
  // Attempt to resume audio context if it starts in a suspended state
  if (audioCtx.state === 'suspended') {
      audioCtx.resume();
  }
  audioUnlocked = true;
}

// Ensure audio context is resumed on user interaction
document.addEventListener('touchstart', unlockAudio, { once: true });
document.addEventListener('click', unlockAudio, { once: true });


function playSound(freq = 500, dur = 0.12) {
  if (!audioUnlocked || !audioCtx) return;
  // Check if context is suspended, attempt to resume
  if (audioCtx.state === 'suspended') {
      audioCtx.resume().then(() => {
          // Play sound after resuming
          _playOscillatorSound(freq, dur);
      });
  } else {
      _playOscillatorSound(freq, dur);
  }
}

function _playOscillatorSound(freq, dur) {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.frequency.value = freq;
    g.gain.value = 0.2; // Reduced gain to prevent harshness
    o.connect(g);
    g.connect(audioCtx.destination);
    o.start();
    o.stop(audioCtx.currentTime + dur);
}


/* ================= Touch Control ================= */
const touch = { active: false, x: 0, y: 0 };

canvas.addEventListener("touchstart", e => {
  // Moved unlockAudio to global event listener to handle it once.
  touch.active = true;
  touch.x = e.touches[0].clientX;
  touch.y = e.touches[0].clientY;
  e.preventDefault(); // Prevent scrolling on mobile
});

canvas.addEventListener("touchmove", e => {
  touch.x = e.touches[0].clientX;
  touch.y = e.touches[0].clientY;
  e.preventDefault(); // Prevent scrolling on mobile
});

canvas.addEventListener("touchend", () => touch.active = false);

/* ================= Utils ================= */
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

/* ================= Game Constants ================= */
const PLAYER_RADIUS = 12;
const BALL_RADIUS = 6;
const GOAL_WIDTH = 20; // Width of the goal line
const GOAL_HEIGHT = 100; // Height of the goal opening
const MATCH_DURATION = 120; // seconds

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

    // Bounce off top/bottom walls
    if (this.y - BALL_RADIUS < 0) {
      this.y = BALL_RADIUS;
      this.vy *= -1;
      playSound(300);
    }
    if (this.y + BALL_RADIUS > canvas.height) {
      this.y = canvas.height - BALL_RADIUS;
      this.vy *= -1;
      playSound(300);
    }

    // Bounce off left/right field boundaries, but not in goal areas
    // Left side
    if (this.x - BALL_RADIUS < 0 && (this.y < canvas.height / 2 - GOAL_HEIGHT / 2 || this.y > canvas.height / 2 + GOAL_HEIGHT / 2)) {
      this.x = BALL_RADIUS;
      this.vx *= -1;
      playSound(300);
    }
    // Right side
    if (this.x + BALL_RADIUS > canvas.width && (this.y < canvas.height / 2 - GOAL_HEIGHT / 2 || this.y > canvas.height / 2 + GOAL_HEIGHT / 2)) {
      this.x = canvas.width - BALL_RADIUS;
      this.vx *= -1;
      playSound(300);
    }
  }
  draw() {
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.arc(this.x, this.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* ================= Player ================= */
class Player {
  constructor(x, y, color, team, controlled = false, ai = false) {
    this.initialX = x;
    this.initialY = y;
    this.x = x;
    this.y = y;
    this.color = color;
    this.team = team; // 'A' or 'B'
    this.controlled = controlled; // True if user controls this player
    this.ai = ai; // True if AI controls this player
    this.speed = 3;
  }
  resetPosition() {
    this.x = this.initialX;
    this.y = this.initialY;
  }
  update(targetBall, activePlayer) {
    if (this.controlled) {
      // User controlled, handled in main update loop
      return;
    }

    if (this.ai) {
      // Simple AI: move towards the ball if it's in their half, or defend goal
      let targetX, targetY;
      if (this.team === 'A') { // Left team AI
        if (targetBall.x < canvas.width / 2) { // Ball in their half
          targetX = targetBall.x;
          targetY = targetBall.y;
        } else { // Ball in opponent's half, defend
          targetX = canvas.width * 0.25; // Quarter line
          targetY = canvas.height / 2;
        }
      } else { // Right team AI
        if (targetBall.x > canvas.width / 2) { // Ball in their half
          targetX = targetBall.x;
          targetY = targetBall.y;
        } else { // Ball in opponent's half, defend
          targetX = canvas.width * 0.75; // Quarter line
          targetY = canvas.height / 2;
        }
      }

      const dx = targetX - this.x;
      const dy = targetY - this.y;
      const d = Math.hypot(dx, dy);
      if (d > 5) { // Only move if not very close
        this.x += (dx / d) * this.speed * 0.8; // Slightly slower AI
        this.y += (dy / d) * this.speed * 0.8;
      }
    }
  }
  draw() {
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, PLAYER_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Outline for current controlled player
    if (this.controlled) {
      ctx.strokeStyle = "yellow";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, PLAYER_RADIUS + 2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 1; // Reset to default
    }
  }
}

/* ================= Game Objects & State ================= */
const ball = new Ball();

// Team A (Blue) - user controlled player is the first one
const teamA = [
  new Player(canvas.width * 0.25, canvas.height / 2, "#1e90ff", 'A', true), // Main controlled player
  new Player(canvas.width * 0.15, canvas.height * 0.25, "#1e90ff", 'A', false, true), // AI teammate
  new Player(canvas.width * 0.15, canvas.height * 0.75, "#1e90ff", 'A', false, true), // AI teammate
  new Player(canvas.width * 0.35, canvas.height * 0.40, "#1e90ff", 'A', false, true), // AI teammate
  new Player(canvas.width * 0.35, canvas.height * 0.60, "#1e90ff", 'A', false, true), // AI teammate
];

// Team B (Red) - all AI controlled
const teamB = [
  new Player(canvas.width * 0.75, canvas.height / 2, "#ff3b3b", 'B', false, true), // Main opponent AI
  new Player(canvas.width * 0.85, canvas.height * 0.25, "#ff3b3b", 'B', false, true), // AI teammate
  new Player(canvas.width * 0.85, canvas.height * 0.75, "#ff3b3b", 'B', false, true), // AI teammate
  new Player(canvas.width * 0.65, canvas.height * 0.40, "#ff3b3b", 'B', false, true), // AI teammate
  new Player(canvas.width * 0.65, canvas.height * 0.60, "#ff3b3b", 'B', false, true), // AI teammate
];

let scoreA = 0;
let scoreB = 0;
let goalLock = false; // Prevents multiple scores from one goal

let timeRemaining = MATCH_DURATION;
let gameRunning = true;
let gameOver = false;
let gameLoopInterval; // To control the game timer accurately

/* ================= Kick ================= */
function kick(fromPlayer, power = 6) {
  // Check if the ball is within kicking distance
  if (dist(fromPlayer, ball) < PLAYER_RADIUS + BALL_RADIUS + 2) {
    const dx = ball.x - fromPlayer.x;
    const dy = ball.y - fromPlayer.y;
    const d = Math.hypot(dx, dy) || 1; // Avoid division by zero
    ball.vx = (dx / d) * power;
    ball.vy = (dy / d) * power;
    playSound(600);
  }
}

/* ================= Game Resets ================= */
function resetGame() {
  scoreA = 0;
  scoreB = 0;
  timeRemaining = MATCH_DURATION;
  gameRunning = true;
  gameOver = false;
  resetRound();
}

function resetRound() {
  ball.reset();
  teamA.forEach(p => p.resetPosition());
  teamB.forEach(p => p.resetPosition());
  goalLock = false; // Reset goal lock after a goal
}

/* ================= Update ================= */
function update() {
  if (gameOver) return;

  // Player movement (user controlled)
  const controlledPlayer = teamA.find(p => p.controlled);
  if (controlledPlayer && touch.active) {
    const dx = touch.x - controlledPlayer.x;
    const dy = touch.y - controlledPlayer.y;
    const d = Math.hypot(dx, dy);
    if (d > 10) {
      controlledPlayer.x += (dx / d) * controlledPlayer.speed;
      controlledPlayer.y += (dy / d) * controlledPlayer.speed;
    }
  }

  // Update all players (AI)
  teamA.forEach(p => p.update(ball, controlledPlayer));
  teamB.forEach(p => p.update(ball, null)); // AI does not need active player

  ball.update();

  // Collision and Kick detection
  [...teamA, ...teamB].forEach(p => {
    // Player-ball collision check
    if (dist(p, ball) < PLAYER_RADIUS + BALL_RADIUS) {
      kick(p, 7); // Apply kick if close enough
    }
  });

  // Goal Detection
  if (!goalLock) {
    // Right Goal (Team A scores)
    if (ball.x + BALL_RADIUS > canvas.width - GOAL_WIDTH &&
        ball.y > canvas.height / 2 - GOAL_HEIGHT / 2 &&
        ball.y < canvas.height / 2 + GOAL_HEIGHT / 2) {
      scoreA++;
      goalLock = true;
      playSound(900, 0.2); // Goal sound
      setTimeout(resetRound, 800);
    }

    // Left Goal (Team B scores)
    if (ball.x - BALL_RADIUS < GOAL_WIDTH &&
        ball.y > canvas.height / 2 - GOAL_HEIGHT / 2 &&
        ball.y < canvas.height / 2 + GOAL_HEIGHT / 2) {
      scoreB++;
      goalLock = true;
      playSound(900, 0.2); // Goal sound
      setTimeout(resetRound, 800);
    }
  }
}

/* ================= Draw ================= */
function draw() {
  // Field
  ctx.fillStyle = "#0b6623"; // Dark Green
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Field Lines
  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 2;

  // Center line
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();

  // Center Circle
  ctx.beginPath();
  ctx.arc(canvas.width / 2, canvas.height / 2, 60, 0, Math.PI * 2);
  ctx.stroke();

  // Left Goal Area
  ctx.beginPath();
  ctx.rect(0, canvas.height / 2 - GOAL_HEIGHT / 2 - 20, 60, GOAL_HEIGHT + 40);
  ctx.stroke();

  // Right Goal Area
  ctx.beginPath();
  ctx.rect(canvas.width - 60, canvas.height / 2 - GOAL_HEIGHT / 2 - 20, 60, GOAL_HEIGHT + 40);
  ctx.stroke();

  // Left Goal Post
  ctx.fillStyle = "#ccc";
  ctx.fillRect(0, canvas.height / 2 - GOAL_HEIGHT / 2, GOAL_WIDTH, GOAL_HEIGHT);
  ctx.strokeStyle = "#000";
  ctx.strokeRect(0, canvas.height / 2 - GOAL_HEIGHT / 2, GOAL_WIDTH, GOAL_HEIGHT);

  // Right Goal Post
  ctx.fillStyle = "#ccc";
  ctx.fillRect(canvas.width - GOAL_WIDTH, canvas.height / 2 - GOAL_HEIGHT / 2, GOAL_WIDTH, GOAL_HEIGHT);
  ctx.strokeStyle = "#000";
  ctx.strokeRect(canvas.width - GOAL_WIDTH, canvas.height / 2 - GOAL_HEIGHT / 2, GOAL_WIDTH, GOAL_HEIGHT);


  // Draw Players
  teamA.forEach(p => p.draw());
  teamB.forEach(p => p.draw());
  ball.draw();

  // Scoreboard
  ctx.fillStyle = "#fff";
  ctx.font = "bold 24px Arial";
  ctx.textAlign = "center";
  ctx.fillText(`${scoreA} - ${scoreB}`, canvas.width / 2, 30);

  // Timer
  ctx.textAlign = "left";
  const minutes = Math.floor(timeRemaining / 60);
  const seconds = Math.floor(timeRemaining % 60);
  const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  ctx.fillText(timeString, canvas.width - 80, 30); // Top right

  // Game Over Message
  if (gameOver) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 48px Arial";
    ctx.textAlign = "center";
    let message = "Game Over!";
    if (scoreA > scoreB) {
      message = "Team A Wins!";
    } else if (scoreB > scoreA) {
      message = "Team B Wins!";
    } else {
      message = "It's a Draw!";
    }
    ctx.fillText(message, canvas.width / 2, canvas.height / 2 - 20);
    ctx.font = "bold 24px Arial";
    ctx.fillText("Tap to Restart", canvas.width / 2, canvas.height / 2 + 30);
  }
}

/* ================= Game Loop ================= */
function gameLoop() {
  if (gameRunning) {
    update();
  }
  draw();
  requestAnimationFrame(gameLoop);
}

// Start timer for game duration
function startTimer() {
  clearInterval(gameLoopInterval); // Clear any existing interval
  gameLoopInterval = setInterval(() => {
    if (gameRunning && !gameOver) {
      timeRemaining--;
      if (timeRemaining <= 0) {
        timeRemaining = 0;
        gameRunning = false;
        gameOver = true;
      }
    }
  }, 1000);
}

// Handle restart when game is over
canvas.addEventListener('click', () => {
    if (gameOver) {
        resetGame();
        startTimer();
    }
});
canvas.addEventListener('touchstart', () => {
    if (gameOver) {
        resetGame();
        startTimer();
    }
});


// Initial call to start the game and timer
resetGame(); // Ensure initial state is clean
startTimer(); // Start the game timer
gameLoop(); // Start the animation frame loop
  
