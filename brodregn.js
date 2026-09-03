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
let floatingDecor = [];

const basket = {
  x: canvas.width / 2 - 78,
  y: canvas.height - 96,
  width: 156,
  height: 64,
  speed: 850
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

  createFloatingDecor();
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
  updateDecor(delta);
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

  basket.x = clamp(basket.x, 14, canvas.width - basket.width - 14);
}

function updateSpawning(delta) {
  spawnTimer -= delta;

  if (spawnTimer <= 0) {
    spawnItem();
    spawnTimer = getSpawnRate();
  }
}

function getSpawnRate() {
  if (score >= 40) return 0.4;
  if (score >= 25) return 0.5;
  if (score >= 10) return 0.64;
  return 0.76;
}

function getFallSpeed() {
  if (score >= 40) return random(300, 390);
  if (score >= 25) return random(245, 330);
  if (score >= 10) return random(200, 280);
  return random(160, 235);
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
    x: random(42, canvas.width - 42),
    y: -60,
    size: isTrash ? random(40, 54) : random(40, 58),
    speed: getFallSpeed(),
    rotation: random(-0.45, 0.45),
    rotationSpeed: random(-1.25, 1.25),
    breadType: Math.floor(random(0, 4)),
    faceOffset: random(-3, 3)
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

  const basketLeft = basket.x + 8;
  const basketRight = basket.x + basket.width - 8;
  const basketTop = basket.y + 12;
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
  drawFloatingDecor();
  drawFallingItems();
  drawGround();
  drawBasket();
}

function drawStartScreen() {
  clearCanvas();
  drawBackground();
  drawFloatingDecor();
  drawPreviewItems();
  drawGround();
  drawBasket();

  ctx.save();
  ctx.textAlign = "center";

  drawRoundedPanel(canvas.width / 2 - 285, 198, 570, 160, 30, "rgba(255, 255, 255, 0.72)", "rgba(127, 38, 29, 0.13)");

  ctx.fillStyle = "#7f261d";
  ctx.font = "700 78px Georgia";
  ctx.fillText("BRÖDREGN", canvas.width / 2, 264);

  ctx.fillStyle = "#6b4127";
  ctx.font = "900 24px Arial";
  ctx.fillText("Fånga 50 bröd. Undvik soporna.", canvas.width / 2, 308);

  ctx.font = "700 17px Arial";
  ctx.fillText("Tryck på startknappen för att börja.", canvas.width / 2, 338);

  ctx.restore();
}

function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, "#aeeeff");
  sky.addColorStop(0.45, "#ffeeb6");
  sky.addColorStop(1, "#ffbd78");

  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawSun(canvas.width - 105, 105);
  drawCloud(130, 118, 1.1);
  drawCloud(720, 150, 0.88);
  drawCloud(430, 75, 0.68);

  drawTinySparkles();
}

function drawSun(x, y) {
  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = "rgba(255, 210, 91, 0.26)";
  ctx.beginPath();
  ctx.arc(0, 0, 72, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffd75f";
  ctx.strokeStyle = "#c9893d";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#7f261d";
  ctx.beginPath();
  ctx.arc(-13, -6, 4, 0, Math.PI * 2);
  ctx.arc(13, -6, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#7f261d";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 5, 16, 0.15, Math.PI - 0.15);
  ctx.stroke();

  ctx.restore();
}

function drawCloud(x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.fillStyle = "rgba(255, 255, 255, 0.76)";
  ctx.strokeStyle = "rgba(126, 63, 31, 0.09)";
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.arc(-48, 14, 29, 0, Math.PI * 2);
  ctx.arc(-16, -6, 39, 0, Math.PI * 2);
  ctx.arc(28, 3, 32, 0, Math.PI * 2);
  ctx.arc(55, 17, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.restore();
}

function drawTinySparkles() {
  ctx.save();

  for (let i = 0; i < 28; i++) {
    const x = (i * 129 + 43) % canvas.width;
    const y = (i * 71 + 29) % 420 + 40;

    ctx.fillStyle = i % 2 === 0 ? "rgba(255, 154, 191, 0.42)" : "rgba(255, 255, 255, 0.52)";
    ctx.beginPath();
    ctx.moveTo(x, y - 5);
    ctx.lineTo(x + 4, y);
    ctx.lineTo(x, y + 5);
    ctx.lineTo(x - 4, y);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

function createFloatingDecor() {
  floatingDecor = [];

  for (let i = 0; i < 18; i++) {
    floatingDecor.push({
      x: random(20, canvas.width - 20),
      y: random(60, canvas.height - 130),
      size: random(4, 10),
      speed: random(6, 16),
      type: i % 3
    });
  }
}

function updateDecor(delta) {
  for (const decor of floatingDecor) {
    decor.y += decor.speed * delta;

    if (decor.y > canvas.height - 90) {
      decor.y = 40;
      decor.x = random(20, canvas.width - 20);
    }
  }
}

function drawFloatingDecor() {
  ctx.save();

  for (const decor of floatingDecor) {
    if (decor.type === 0) {
      ctx.fillStyle = "rgba(127, 38, 29, 0.15)";
      ctx.beginPath();
      ctx.arc(decor.x, decor.y, decor.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (decor.type === 1) {
      ctx.fillStyle = "rgba(255, 154, 191, 0.32)";
      drawHeart(decor.x, decor.y, decor.size);
    } else {
      ctx.fillStyle = "rgba(255, 255, 255, 0.42)";
      ctx.beginPath();
      ctx.moveTo(decor.x, decor.y - decor.size);
      ctx.lineTo(decor.x + decor.size, decor.y);
      ctx.lineTo(decor.x, decor.y + decor.size);
      ctx.lineTo(decor.x - decor.size, decor.y);
      ctx.closePath();
      ctx.fill();
    }
  }

  ctx.restore();
}

function drawHeart(x, y, size) {
  ctx.beginPath();
  ctx.moveTo(x, y + size * 0.35);
  ctx.bezierCurveTo(x - size * 1.1, y - size * 0.35, x - size * 0.5, y - size * 1.1, x, y - size * 0.45);
  ctx.bezierCurveTo(x + size * 0.5, y - size * 1.1, x + size * 1.1, y - size * 0.35, x, y + size * 0.35);
  ctx.fill();
}

function drawGround() {
  ctx.save();

  ctx.fillStyle = "rgba(126, 63, 31, 0.08)";
  ctx.beginPath();
  ctx.ellipse(canvas.width / 2, canvas.height + 18, canvas.width * 0.62, 82, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawPreviewItems() {
  const previewItems = [
    { x: 155, y: 205, size: 46, rotation: -0.25, breadType: 0, faceOffset: 0 },
    { x: 740, y: 265, size: 44, rotation: 0.38, breadType: 1, faceOffset: 0 },
    { x: 245, y: 410, size: 42, rotation: 0.2, breadType: 2, faceOffset: 0 },
    { x: 665, y: 415, size: 50, rotation: -0.15, breadType: 3, faceOffset: 0 }
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

  const w = item.size * 1.45;
  const h = item.size * 0.88;

  drawShadow(0, h * 0.35, w * 0.5, h * 0.2);

  ctx.fillStyle = "#d99545";
  ctx.strokeStyle = "#6c3f1d";
  ctx.lineWidth = 3.5;

  roundedRect(-w / 2, -h / 2, w, h, h / 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "rgba(255, 229, 183, 0.58)";
  roundedRect(-w * 0.34, -h * 0.34, w * 0.68, h * 0.24, h * 0.12);
  ctx.fill();

  ctx.strokeStyle = "#fff2d2";
  ctx.lineWidth = 3;

  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 14 - 8, -h / 4);
    ctx.quadraticCurveTo(i * 14, 0, i * 14 - 8, h / 4);
    ctx.stroke();
  }

  drawCuteFace(0, 3 + item.faceOffset, item.size * 0.22);

  ctx.restore();
}

function drawBaguette(item) {
  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.rotate(item.rotation);

  const w = item.size * 1.9;
  const h = item.size * 0.5;

  drawShadow(0, h * 0.45, w * 0.46, h * 0.22);

  ctx.fillStyle = "#d89b4d";
  ctx.strokeStyle = "#6c3f1d";
  ctx.lineWidth = 3.5;

  roundedRect(-w / 2, -h / 2, w, h, h / 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "#fff2d2";
  ctx.lineWidth = 3;

  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 20 - 10, -h * 0.25);
    ctx.lineTo(i * 20 + 8, h * 0.22);
    ctx.stroke();
  }

  drawCuteFace(0, 2 + item.faceOffset, item.size * 0.18);

  ctx.restore();
}

function drawBun(item) {
  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.rotate(item.rotation);

  const s = item.size;

  drawShadow(0, s * 0.25, s * 0.45, s * 0.14);

  ctx.fillStyle = "#da9d4c";
  ctx.strokeStyle = "#6c3f1d";
  ctx.lineWidth = 3.5;

  ctx.beginPath();
  ctx.arc(0, 0, s * 0.52, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "#fff2d2";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, s * 0.27, 0.25, Math.PI * 1.75);
  ctx.stroke();

  drawCuteFace(0, 4 + item.faceOffset, item.size * 0.22);

  ctx.restore();
}

function drawCroissant(item) {
  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.rotate(item.rotation);

  const s = item.size;

  drawShadow(0, s * 0.28, s * 0.45, s * 0.14);

  ctx.fillStyle = "#dca04a";
  ctx.strokeStyle = "#6c3f1d";
  ctx.lineWidth = 3.5;

  ctx.beginPath();
  ctx.arc(0, 2, s * 0.58, 0.15 * Math.PI, 0.85 * Math.PI, false);
  ctx.arc(0, 2, s * 0.31, 0.85 * Math.PI, 0.15 * Math.PI, true);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 242, 210, 0.8)";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.arc(-12, 2, s * 0.28, 0.2 * Math.PI, 0.72 * Math.PI);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(12, 2, s * 0.28, 0.28 * Math.PI, 0.8 * Math.PI);
  ctx.stroke();

  drawCuteFace(0, 8 + item.faceOffset, item.size * 0.17);

  ctx.restore();
}

function drawCuteFace(x, y, scale) {
  ctx.save();
  ctx.translate(x, y);

  ctx.fillStyle = "#5c2f19";

  ctx.beginPath();
  ctx.arc(-scale, -scale * 0.25, scale * 0.22, 0, Math.PI * 2);
  ctx.arc(scale, -scale * 0.25, scale * 0.22, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#5c2f19";
  ctx.lineWidth = Math.max(1.5, scale * 0.13);
  ctx.beginPath();
  ctx.arc(0, scale * 0.1, scale * 0.5, 0.15, Math.PI - 0.15);
  ctx.stroke();

  ctx.fillStyle = "rgba(255, 154, 191, 0.55)";
  ctx.beginPath();
  ctx.arc(-scale * 1.55, scale * 0.1, scale * 0.28, 0, Math.PI * 2);
  ctx.arc(scale * 1.55, scale * 0.1, scale * 0.28, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawTrash(item) {
  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.rotate(item.rotation);

  const s = item.size;

  drawShadow(0, s * 0.34, s * 0.42, s * 0.16);

  ctx.fillStyle = "#3f3831";
  ctx.strokeStyle = "#211a15";
  ctx.lineWidth = 3.5;

  roundedRect(-s / 2, -s / 2, s, s * 1.1, 10);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#2b2520";
  ctx.beginPath();
  ctx.moveTo(-s / 2, -s / 2 + 6);
  ctx.lineTo(-s / 4, -s / 2 - 12);
  ctx.lineTo(0, -s / 2 + 4);
  ctx.lineTo(s / 4, -s / 2 - 12);
  ctx.lineTo(s / 2, -s / 2 + 6);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#fff7ea";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-s * 0.2, -s * 0.13);
  ctx.lineTo(s * 0.2, s * 0.22);
  ctx.moveTo(s * 0.2, -s * 0.13);
  ctx.lineTo(-s * 0.2, s * 0.22);
  ctx.stroke();

  ctx.fillStyle = "#90c978";
  ctx.beginPath();
  ctx.arc(s * 0.3, -s * 0.22, s * 0.13, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawBasket() {
  ctx.save();

  const x = basket.x;
  const y = basket.y;
  const w = basket.width;
  const h = basket.height;

  drawShadow(x + w / 2, y + h + 8, w * 0.52, 12);

  ctx.fillStyle = "#9a5f2f";
  ctx.strokeStyle = "#4f2f19";
  ctx.lineWidth = 5;

  ctx.beginPath();
  ctx.moveTo(x + 12, y + 12);
  ctx.quadraticCurveTo(x + w / 2, y + 0, x + w - 12, y + 12);
  ctx.lineTo(x + w - 28, y + h);
  ctx.quadraticCurveTo(x + w / 2, y + h + 10, x + 28, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 236, 202, 0.66)";
  ctx.lineWidth = 2.5;

  for (let i = 24; i < w - 18; i += 20) {
    ctx.beginPath();
    ctx.moveTo(x + i, y + 15);
    ctx.lineTo(x + i - 10, y + h - 3);
    ctx.stroke();
  }

  for (let j = 22; j < h - 4; j += 17) {
    ctx.beginPath();
    ctx.moveTo(x + 22, y + j);
    ctx.lineTo(x + w - 22, y + j - 4);
    ctx.stroke();
  }

  ctx.strokeStyle = "#4f2f19";
  ctx.lineWidth = 7;
  ctx.beginPath();
  ctx.arc(x + w / 2, y + 14, w * 0.35, Math.PI, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

function drawShadow(x, y, radiusX, radiusY) {
  ctx.save();
  ctx.fillStyle = "rgba(72, 38, 16, 0.14)";
  ctx.beginPath();
  ctx.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawRoundedPanel(x, y, width, height, radius, fill, stroke) {
  ctx.save();

  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 3;

  roundedRect(x, y, width, height, radius);
  ctx.fill();
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
  basket.x = clamp(basket.x, 14, canvas.width - basket.width - 14);

  if (!gameRunning && !gameOver) {
    drawStartScreen();
  }
}

startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", startGame);

resetGame();
