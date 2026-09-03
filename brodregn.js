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
  x: 0,
  y: 0,
  width: 156,
  height: 64,
  speed: 920
};

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.round(rect.width * dpr);
  canvas.height = Math.round(rect.height * dpr);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  basket.width = Math.min(156, rect.width * 0.24);
  basket.height = basket.width * 0.42;
  basket.y = rect.height - basket.height - 26;
  basket.x = clamp(basket.x, 14, rect.width - basket.width - 14);

  createFloatingDecor();

  if (!gameRunning) {
    drawStartScreen();
  }
}

function gameWidth() {
  return canvas.getBoundingClientRect().width;
}

function gameHeight() {
  return canvas.getBoundingClientRect().height;
}

function resetGame() {
  score = 0;
  misses = 0;
  gameRunning = false;
  gameOver = false;
  fallingItems = [];
  spawnTimer = 0;
  lastTime = 0;

  basket.x = gameWidth() / 2 - basket.width / 2;

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

  basket.x = gameWidth() / 2 - basket.width / 2;

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

  basket.x = clamp(basket.x, 14, gameWidth() - basket.width - 14);
}

function updateSpawning(delta) {
  spawnTimer -= delta;

  if (spawnTimer <= 0) {
    spawnItem();
    spawnTimer = getSpawnRate();
  }
}

function getSpawnRate() {
  if (score >= 40) return 0.38;
  if (score >= 25) return 0.49;
  if (score >= 10) return 0.62;
  return 0.74;
}

function getFallSpeed() {
  const h = gameHeight();
  const base = h / 4.2;

  if (score >= 40) return random(base * 1.45, base * 1.8);
  if (score >= 25) return random(base * 1.22, base * 1.58);
  if (score >= 10) return random(base * 1.0, base * 1.35);
  return random(base * 0.84, base * 1.12);
}

function getTrashChance() {
  if (score >= 40) return 0.23;
  if (score >= 25) return 0.19;
  if (score >= 10) return 0.15;
  return 0.1;
}

function spawnItem() {
  const isTrash = Math.random() < getTrashChance();
  const size = isTrash
    ? random(40, 54)
    : random(42, 60);

  fallingItems.push({
    type: isTrash ? "trash" : "bread",
    x: random(size, gameWidth() - size),
    y: -70,
    size: size,
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
    if (item.y - item.size > gameHeight()) {
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

  const w = gameWidth();
  const h = gameHeight();

  ctx.save();
  ctx.textAlign = "center";

  drawRoundedPanel(
    w / 2 - Math.min(290, w * 0.43),
    h * 0.32,
    Math.min(580, w * 0.86),
    158,
    30,
    "rgba(255, 255, 255, 0.72)",
    "rgba(127, 38, 29, 0.13)"
  );

  ctx.fillStyle = "#7f261d";
  ctx.font = "700 " + Math.min(78, w * 0.115) + "px Georgia";
  ctx.fillText("BRÖDREGN", w / 2, h * 0.32 + 65);

  ctx.fillStyle = "#6b4127";
  ctx.font = "900 " + Math.min(24, w * 0.038) + "px Arial";
  ctx.fillText("Fånga 50 bröd. Undvik soporna.", w / 2, h * 0.32 + 108);

  ctx.font = "700 " + Math.min(17, w * 0.03) + "px Arial";
  ctx.fillText("Tryck på startknappen för att börja.", w / 2, h * 0.32 + 136);

  ctx.restore();
}

function clearCanvas() {
  ctx.clearRect(0, 0, gameWidth(), gameHeight());
}

function drawBackground() {
  const w = gameWidth();
  const h = gameHeight();

  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#9cecff");
  sky.addColorStop(0.44, "#fff0b8");
  sky.addColorStop(1, "#ffbd78");

  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  drawSun(w - 88, 92, Math.min(1, w / 650));
  drawCloud(w * 0.16, 118, Math.min(1.1, w / 620));
  drawCloud(w * 0.78, 158, Math.min(0.9, w / 650));
  drawCloud(w * 0.48, 75, Math.min(0.7, w / 720));
  drawHills();
  drawTinySparkles();
}

function drawSun(x, y, scale) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.fillStyle = "rgba(255, 210, 91, 0.28)";
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

  ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
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

function drawHills() {
  const w = gameWidth();
  const h = gameHeight();

  ctx.save();

  ctx.fillStyle = "rgba(255, 154, 191, 0.25)";
  ctx.beginPath();
  ctx.moveTo(0, h * 0.78);
  ctx.quadraticCurveTo(w * 0.22, h * 0.66, w * 0.48, h * 0.78);
  ctx.quadraticCurveTo(w * 0.75, h * 0.9, w, h * 0.75);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(196, 145, 69, 0.22)";
  ctx.beginPath();
  ctx.moveTo(0, h * 0.84);
  ctx.quadraticCurveTo(w * 0.36, h * 0.7, w * 0.68, h * 0.86);
  ctx.quadraticCurveTo(w * 0.86, h * 0.95, w, h * 0.82);
  ctx.lineTo(w, h);
  ctx.lineTo(0, h);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawTinySparkles() {
  const w = gameWidth();
  const h = gameHeight();

  ctx.save();

  for (let i = 0; i < 28; i++) {
    const x = (i * 129 + 43) % w;
    const y = ((i * 71 + 29) % (h * 0.62)) + 40;

    ctx.fillStyle = i % 2 === 0
      ? "rgba(255, 154, 191, 0.42)"
      : "rgba(255, 255, 255, 0.54)";

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
      x: random(20, Math.max(40, gameWidth() - 20)),
      y: random(60, Math.max(120, gameHeight() - 130)),
      size: random(4, 10),
      speed: random(6, 16),
      type: i % 3
    });
  }
}

function updateDecor(delta) {
  for (const decor of floatingDecor) {
    decor.y += decor.speed * delta;

    if (decor.y > gameHeight() - 90) {
      decor.y = 40;
      decor.x = random(20, gameWidth() - 20);
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
      ctx.fillStyle = "rgba(255, 255, 255, 0.44)";
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
  const w = gameWidth();
  const h = gameHeight();

  ctx.save();
  ctx.fillStyle = "rgba(126, 63, 31, 0.08)";
  ctx.beginPath();
  ctx.ellipse(w / 2, h + 18, w * 0.62, 82, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPreviewItems() {
  const w = gameWidth();
  const h = gameHeight();

  const previewItems = [
    { x: w * 0.17, y: h * 0.26, size: 48, rotation: -0.25, breadType: 0, faceOffset: 0 },
    { x: w * 0.82, y: h * 0.34, size: 46, rotation: 0.38, breadType: 1, faceOffset: 0 },
    { x: w * 0.26, y: h * 0.66, size: 44, rotation: 0.2, breadType: 2, faceOffset: 0 },
    { x: w * 0.74, y: h * 0.67, size: 52, rotation: -0.15, breadType: 3, faceOffset: 0 }
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
  const touchX = touch.clientX - rect.left;

  basket.x = touchX - basket.width / 2;
  basket.x = clamp(basket.x, 14, gameWidth() - basket.width - 14);

  if (!gameRunning && !gameOver) {
    drawStartScreen();
  }
}

window.addEventListener("resize", function() {
  resizeCanvas();
});

startButton.addEventListener("click", startGame);
restartButton.addEventListener("click", startGame);

resizeCanvas();
resetGame();
