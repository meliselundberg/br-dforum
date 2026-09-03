const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const missesEl = document.getElementById("misses");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const modal = document.getElementById("gameModal");
const modalTitle = document.getElementById("modalTitle");
const modalText = document.getElementById("modalText");

const winningScore = 50;
const maxMisses = 3;

let score = 0;
let misses = 0;
let gameRunning = false;
let gameOver = false;
let animationId = null;
let keys = {};
let fallingItems = [];
let spawnTimer = 0;
let lastTime = 0;

const basket = {
  x: canvas.width / 2 - 55,
  y: canvas.height - 72,
  width: 110,
  height: 46,
  speed: 470
};

function resetGame() {
  score = 0;
  misses = 0;
  gameRunning = false;
  gameOver = false;
  fallingItems = [];
  spawnTimer = 0;
  lastTime = 0;

  basket.x = canvas.width / 2 - basket.width / 2;

  updateStats();
  hideModal();
  drawStartScreen();
}

function startGame() {
  score = 0;
  misses = 0;
  gameRunning = true;
  gameOver = false;
  fallingItems = [];
  spawnTimer = 0;
  lastTime = performance.now();

  updateStats();
  hideModal();
  startButton.style.display = "none";

  if (animationId) {
    cancelAnimationFrame(animationId);
  }

  animationId = requestAnimationFrame(gameLoop);
}

function updateStats() {
  scoreEl.textContent = score + " / " + winningScore;
  missesEl.textContent = misses + " / " + maxMisses;
}

function gameLoop(timestamp) {
  if (!gameRunning) return;

  const delta = Math.min((timestamp - lastTime) / 1000, 0.04);
  lastTime = timestamp;

  updateBasket(delta);
  updateSpawning(delta);
  updateItems(delta);
  checkCollisions();
  drawGame();

  if (!gameOver) {
    animationId = requestAnimationFrame(gameLoop);
  }
}

function updateBasket(delta) {
  if (keys.ArrowLeft) {
    basket.x -= basket.speed * delta;
  }

  if (keys.ArrowRight) {
    basket.x += basket.speed * delta;
  }

  basket.x = clamp(basket.x, 10, canvas.width - basket.width - 10);
}

function updateSpawning(delta) {
  spawnTimer -= delta;

  const spawnRate = getSpawnRate();

  if (spawnTimer <= 0) {
    spawnItem();
    spawnTimer = spawnRate;
  }
}

function getSpawnRate() {
  if (score >= 40) return 0.46;
  if (score >= 25) return 0.58;
  if (score >= 10) return 0.72;
  return 0.86;
}

function getFallSpeed() {
  if (score >= 40) return random(250, 340);
  if (score >= 25) return random(210, 295);
  if (score >= 10) return random(175, 250);
  return random(145, 210);
}

function spawnItem() {
  const isTrash = Math.random() < getTrashChance();

  const item = {
    type: isTrash ? "trash" : "bread",
    x: random(26, canvas.width - 26),
    y: -40,
    size: isTrash ? random(30, 42) : random(32, 46),
    speed: getFallSpeed(),
    rotation: random(-0.35, 0.35)
  };

  fallingItems.push(item);
}

function getTrashChance() {
  if (score >= 40) return 0.24;
  if (score >= 25) return 0.20;
  if (score >= 10) return 0.16;
  return 0.12;
}

function updateItems(delta) {
  for (const item of fallingItems) {
    item.y += item.speed * delta;
  }

  const remainingItems = [];

  for (const item of fallingItems) {
    if (item.y - item.size > canvas.height) {
      if (item.type === "bread") {
        misses++;
        updateStats();

        if (misses >= maxMisses) {
          loseGame("FÖRLUST!", "För många bröd gick förlorade.\nFörsök igen.");
          return;
        }
      }
    } else {
      remainingItems.push(item);
    }
  }

  fallingItems = remainingItems;
}

function checkCollisions() {
  const remainingItems = [];

  for (const item of fallingItems) {
    if (isCaught(item)) {
      if (item.type === "trash") {
        loseGame("FÖRLUST!", "Du fångade en sopa.\nDet där var inte särskilt brödigt.");
        return;
      }

      score++;
      updateStats();

      if (score >= winningScore) {
        winGame();
        return;
      }
    } else {
      remainingItems.push(item);
    }
  }

  fallingItems = remainingItems;
}

function isCaught(item) {
  const itemLeft = item.x - item.size / 2;
  const itemRight = item.x + item.size / 2;
  const itemTop = item.y - item.size / 2;
  const itemBottom = item.y + item.size / 2;

  const basketLeft = basket.x;
  const basketRight = basket.x + basket.width;
  const basketTop = basket.y;
  const basketBottom = basket.y + basket.height;

  return (
    itemRight > basketLeft &&
    itemLeft < basketRight &&
    itemBottom > basketTop &&
    itemTop < basketBottom
  );
}

function winGame() {
  gameRunning = false;
  gameOver = true;
  startButton.style.display = "flex";

  showModal(
    "DU VANN!",
    "-10 prickar\nVisa detta för arrangör."
  );
}

function loseGame(title, text) {
  gameRunning = false;
  gameOver = true;
  startButton.style.display = "flex";

  showModal(title, text);
}

function showModal(title, text) {
  modalTitle.textContent = title;
  modalText.textContent = text;
  modal.classList.add("show");
}

function hideModal() {
  modal.classList.remove("show");
}

function drawGame() {
  clearCanvas();
  drawBackground();
  drawFallingItems();
  drawBasket();
}

function drawStartScreen() {
  clearCanvas();
  drawBackground();
  drawBasket();

  ctx.save();
  ctx.textAlign = "center";
  ctx.fillStyle = "#7f261d";
  ctx.font = "700 54px Georgia";
  ctx.fillText("BRÖDREGN", canvas.width / 2, 170);

  ctx.fillStyle = "#604b37";
  ctx.font = "700 22px Arial";
  ctx.fillText("Fånga 50 bröd. Undvik soporna.", canvas.width / 2, 215);

  ctx.font = "600 17px Arial";
  ctx.fillText("Tryck på startknappen för att börja.", canvas.width / 2, 252);
  ctx.restore();
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawBackground() {
  ctx.save();

  ctx.fillStyle = "#fff7ea";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(196, 145, 69, 0.12)";
  for (let i = 0; i < 26; i++) {
    const x = (i * 97) % canvas.width;
    const y = (i * 53) % canvas.height;
    ctx.beginPath();
    ctx.arc(x, y, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = "rgba(168, 58, 44, 0.08)";
  ctx.beginPath();
  ctx.arc(100, 85, 70, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(196, 145, 69, 0.08)";
  ctx.beginPath();
  ctx.arc(canvas.width - 80, 120, 95, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawFallingItems() {
  for (const item of fallingItems) {
    if (item.type === "bread") {
      drawBread(item);
    } else {
      drawTrash(item);
    }
  }
}

function drawBread(item) {
  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.rotate(item.rotation);

  const w = item.size * 1.35;
  const h = item.size * 0.82;

  ctx.fillStyle = "#c9893d";
  ctx.strokeStyle = "#7a5427";
  ctx.lineWidth = 3;

  roundedRect(-w / 2, -h / 2, w, h, h / 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "#fff2d8";
  ctx.lineWidth = 3;

  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 13 - 8, -h / 4);
    ctx.quadraticCurveTo(i * 13, 0, i * 13 - 8, h / 4);
    ctx.stroke();
  }

  ctx.restore();
}

function drawTrash(item) {
  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.rotate(item.rotation);

  const s = item.size;

  ctx.fillStyle = "#3b342e";
  ctx.strokeStyle = "#1f1a16";
  ctx.lineWidth = 3;

  roundedRect(-s / 2, -s / 2, s, s * 1.05, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#2b2520";
  ctx.beginPath();
  ctx.moveTo(-s / 2, -s / 2 + 5);
  ctx.lineTo(-s / 4, -s / 2 - 10);
  ctx.lineTo(0, -s / 2 + 3);
  ctx.lineTo(s / 4, -s / 2 - 10);
  ctx.lineTo(s / 2, -s / 2 + 5);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#fff7ea";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-s * 0.18, -s * 0.15);
  ctx.lineTo(s * 0.18, s * 0.2);
  ctx.moveTo(s * 0.18, -s * 0.15);
  ctx.lineTo(-s * 0.18, s * 0.2);
  ctx.stroke();

  ctx.restore();
}

function drawBasket() {
  ctx.save();

  const x = basket.x;
  const y = basket.y;
  const w = basket.width;
  const h = basket.height;

  ctx.fillStyle = "#8a5328";
  ctx.strokeStyle = "#4f2f19";
  ctx.lineWidth = 4;

  ctx.beginPath();
  ctx.moveTo(x + 8, y + 8);
  ctx.lineTo(x + w - 8, y + 8);
  ctx.lineTo(x + w - 20, y + h);
  ctx.lineTo(x + 20, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 242, 216, 0.55)";
  ctx.lineWidth = 2;

  for (let i = 18; i < w - 18; i += 18) {
    ctx.beginPath();
    ctx.moveTo(x + i, y + 10);
    ctx.lineTo(x + i - 8, y + h - 3);
    ctx.stroke();
  }

  ctx.strokeStyle = "#4f2f19";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(x + w / 2, y + 8, w * 0.36, Math.PI, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

function roundedRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function random(min, max) {
  return Math.random() * (max - min) + min;
}

window.addEventListener("keydown", function(event) {
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    keys[event.key] = true;
    event.preventDefault();
  }
});

window.addEventListener("keyup", function(event) {
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    keys[event.key] = false;
  }
});

canvas.addEventListener("touchstart", handleTouchMove, { passive: false });
canvas.addEventListener("touchmove", handleTouchMove, { passive: false });

function handleTouchMove(event) {
  event.preventDefault();

  const touch = event.touches[0];
  const rect = canvas.getBoundingClientRect();

  const scaleX = canvas.width / rect.width;
  const touchX = (touch.clientX - rect.left) * scaleX;

  basket.x = touchX - basket.width / 2;
  basket.x = clamp(basket.x, 10, canvas.width - basket.width - 10);

  if (!gameRunning && !gameOver) {
    drawStartScreen();
  }
}

startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", startGame);

resetGame();
