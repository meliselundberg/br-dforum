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
  x: canvas.width / 2 - 70,
  y: canvas.height - 88,
  width: 140,
  height: 56,
  speed: 760
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
  startButton.style.display = "inline-flex";
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

  basket.x = clamp(basket.x, 12, canvas.width - basket.width - 12);
}

function updateSpawning(delta) {
  spawnTimer -= delta;

  if (spawnTimer <= 0) {
    spawnItem();
    spawnTimer = getSpawnRate();
  }
}

function getSpawnRate() {
  if (score >= 40) return 0.42;
  if (score >= 25) return 0.52;
  if (score >= 10) return 0.66;
  return 0.78;
}

function getFallSpeed() {
  if (score >= 40) return random(285, 370);
  if (score >= 25) return random(235, 320);
  if (score >= 10) return random(190, 265);
  return random(155, 225);
}

function getTrashChance() {
  if (score >= 40) return 0.23;
  if (score >= 25) return 0.19;
  if (score >= 10) return 0.15;
  return 0.1;
}

function spawnItem() {
  const isTrash = Math.random() < getTrashChance();

  fallingItems.push({
    type: isTrash ? "trash" : "bread",
    x: random(34, canvas.width - 34),
    y: -54,
    size: isTrash ? random(34, 48) : random(34, 50),
    speed: getFallSpeed(),
    rotation: random(-0.45, 0.45),
    rotationSpeed: random(-1.2, 1.2),
    breadType: Math.floor(random(0, 4))
  });
}

function updateItems(delta) {
  for (const item of fallingItems) {
    item.y += item.speed * delta;
    item.rotation += item.rotationSpeed * delta;
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
  const basketTop = basket.y + 8;
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
  startButton.style.display = "inline-flex";

  showModal(
    "DU VANN!",
    "-10 prickar\nVisa för läggarlaget."
  );
}

function loseGame(title, text) {
  gameRunning = false;
  gameOver = true;
  startButton.style.display = "inline-flex";

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
  drawDecorativeBreadRain();
  drawBasket();

  ctx.save();
  ctx.textAlign = "center";

  ctx.fillStyle = "#7f261d";
  ctx.font = "700 76px Georgia";
  ctx.fillText("BRÖDREGN", canvas.width / 2, 245);

  ctx.fillStyle = "#604b37";
  ctx.font = "800 25px Arial";
  ctx.fillText("Fånga 50 bröd. Undvik soporna.", canvas.width / 2, 292);

  ctx.font = "600 18px Arial";
  ctx.fillText("Tryck på startknappen för att börja.", canvas.width / 2, 326);

  ctx.restore();
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#fff8ea");
  gradient.addColorStop(0.55, "#f7e0bd");
  gradient.addColorStop(1, "#e8bd7c");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawCloud(120, 100, 1);
  drawCloud(720, 130, 0.85);
  drawCloud(450, 75, 0.65);

  ctx.fillStyle = "rgba(127, 38, 29, 0.07)";
  ctx.beginPath();
  ctx.arc(80, 520, 170, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(196, 145, 69, 0.12)";
  ctx.beginPath();
  ctx.arc(850, 500, 210, 0, Math.PI * 2);
  ctx.fill();

  drawCrumbs();
}

function drawCloud(x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.fillStyle = "rgba(255, 252, 245, 0.72)";
  ctx.beginPath();
  ctx.arc(-46, 12, 28, 0, Math.PI * 2);
  ctx.arc(-16, -6, 36, 0, Math.PI * 2);
  ctx.arc(26, 4, 30, 0, Math.PI * 2);
  ctx.arc(52, 16, 22, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawCrumbs() {
  ctx.save();

  for (let i = 0; i < 54; i++) {
    const x = (i * 107 + 31) % canvas.width;
    const y = (i * 61 + 47) % canvas.height;
    const radius = 1.4 + (i % 4) * 0.45;

    ctx.fillStyle = i % 3 === 0
      ? "rgba(127, 38, 29, 0.11)"
      : "rgba(122, 84, 39, 0.12)";

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

function drawDecorativeBreadRain() {
  const previewItems = [
    { x: 150, y: 190, size: 42, rotation: -0.3, breadType: 0 },
    { x: 705, y: 245, size: 38, rotation: 0.4, breadType: 1 },
    { x: 250, y: 385, size: 35, rotation: 0.25, breadType: 2 },
    { x: 625, y: 390, size: 46, rotation: -0.25, breadType: 3 }
  ];

  previewItems.forEach(drawBread);
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
  if (item.breadType === 1) {
    drawBaguette(item);
  } else if (item.breadType === 2) {
    drawBun(item);
  } else if (item.breadType === 3) {
    drawCroissant(item);
  } else {
    drawLoaf(item);
  }
}

function drawLoaf(item) {
  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.rotate(item.rotation);

  const w = item.size * 1.42;
  const h = item.size * 0.86;

  ctx.fillStyle = "#c9893d";
  ctx.strokeStyle = "#6c3f1d";
  ctx.lineWidth = 3;

  roundedRect(-w / 2, -h / 2, w, h, h / 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "#fff0d0";
  ctx.lineWidth = 3;

  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 13 - 8, -h / 4);
    ctx.quadraticCurveTo(i * 13, 0, i * 13 - 8, h / 4);
    ctx.stroke();
  }

  ctx.restore();
}

function drawBaguette(item) {
  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.rotate(item.rotation);

  const w = item.size * 1.75;
  const h = item.size * 0.46;

  ctx.fillStyle = "#d3994f";
  ctx.strokeStyle = "#6c3f1d";
  ctx.lineWidth = 3;

  roundedRect(-w / 2, -h / 2, w, h, h / 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "#fff0d0";
  ctx.lineWidth = 3;

  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 17 - 8, -h * 0.25);
    ctx.lineTo(i * 17 + 7, h * 0.2);
    ctx.stroke();
  }

  ctx.restore();
}

function drawBun(item) {
  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.rotate(item.rotation);

  const s = item.size;

  ctx.fillStyle = "#d49b4c";
  ctx.strokeStyle = "#6c3f1d";
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.arc(0, 0, s * 0.52, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "#fff0d0";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.26, 0.2, Math.PI * 1.7);
  ctx.stroke();

  ctx.restore();
}

function drawCroissant(item) {
  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.rotate(item.rotation);

  const s = item.size;

  ctx.fillStyle = "#d69b44";
  ctx.strokeStyle = "#6c3f1d";
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.arc(0, 0, s * 0.55, 0.15 * Math.PI, 0.85 * Math.PI, false);
  ctx.arc(0, 0, s * 0.28, 0.85 * Math.PI, 0.15 * Math.PI, true);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function drawTrash(item) {
  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.rotate(item.rotation);

  const s = item.size;

  ctx.fillStyle = "#34302b";
  ctx.strokeStyle = "#1f1a16";
  ctx.lineWidth = 3;

  roundedRect(-s / 2, -s / 2, s, s * 1.08, 9);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#24201d";
  ctx.beginPath();
  ctx.moveTo(-s / 2, -s / 2 + 6);
  ctx.lineTo(-s / 4, -s / 2 - 11);
  ctx.lineTo(0, -s / 2 + 4);
  ctx.lineTo(s / 4, -s / 2 - 11);
  ctx.lineTo(s / 2, -s / 2 + 6);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#fff7ea";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-s * 0.18, -s * 0.15);
  ctx.lineTo(s * 0.18, s * 0.22);
  ctx.moveTo(s * 0.18, -s * 0.15);
  ctx.lineTo(-s * 0.18, s * 0.22);
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
  ctx.lineWidth = 5;

  ctx.beginPath();
  ctx.moveTo(x + 10, y + 10);
  ctx.lineTo(x + w - 10, y + 10);
  ctx.lineTo(x + w - 24, y + h);
  ctx.lineTo(x + 24, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 238, 204, 0.62)";
  ctx.lineWidth = 2.4;

  for (let i = 22; i < w - 18; i += 19) {
    ctx.beginPath();
    ctx.moveTo(x + i, y + 13);
    ctx.lineTo(x + i - 9, y + h - 4);
    ctx.stroke();
  }

  ctx.strokeStyle = "#4f2f19";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(x + w / 2, y + 11, w * 0.36, Math.PI, Math.PI * 2);
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
  basket.x = clamp(basket.x, 12, canvas.width - basket.width - 12);

  if (!gameRunning && !gameOver) {
    drawStartScreen();
  }
}

startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", startGame);

resetGame();
