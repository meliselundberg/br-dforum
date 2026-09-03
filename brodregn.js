const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const missesEl = document.getElementById("misses");
const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const modal = document.getElementById("gameModal");
const modalTitle = document.getElementById("modalTitle");
const modalText = document.getElementById("modalText");

const GAME_WIDTH = 900;
const GAME_HEIGHT = 640;

const winningScore = 100;
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

const breadImages = [
  loadImage("./brod1.png"),
  loadImage("./brod2.png"),
  loadImage("./brod3.png"),
  loadImage("./brod4.png")
];

const ratImage = loadImage("./ratta.png");
const basketImage = loadImage("./korg.png");

const basket = {
  x: GAME_WIDTH / 2 - 90,
  y: GAME_HEIGHT - 100,
  width: 180,
  height: 78,
  speed: 920
};

function loadImage(src) {
  const img = new Image();
  img.src = src;
  return img;
}

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;

  canvas.width = GAME_WIDTH * dpr;
  canvas.height = GAME_HEIGHT * dpr;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  basket.y = GAME_HEIGHT - basket.height - 28;
  basket.x = clamp(basket.x, 14, GAME_WIDTH - basket.width - 14);

  if (!gameRunning) {
    drawStartScreen();
  }
}

function resetGame() {
  score = 0;
  misses = 0;
  gameRunning = false;
  gameOver = false;
  fallingItems = [];
  spawnTimer = 0;
  lastTime = 0;

  basket.x = GAME_WIDTH / 2 - basket.width / 2;

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

  basket.x = GAME_WIDTH / 2 - basket.width / 2;

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

  basket.x = clamp(basket.x, 14, GAME_WIDTH - basket.width - 14);
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
  if (score >= 40) return random(300, 390);
  if (score >= 25) return random(245, 330);
  if (score >= 10) return random(200, 280);
  return random(160, 235);
}

function getRatChance() {
  if (score >= 40) return 0.23;
  if (score >= 25) return 0.19;
  if (score >= 10) return 0.15;
  return 0.1;
}

function spawnItem() {
  const isRat = Math.random() < getRatChance();
  const size = isRat ? random(58, 74) : random(68, 88);

  fallingItems.push({
    type: isRat ? "rat" : "bread",
    x: random(size, GAME_WIDTH - size),
    y: -70,
    size: size,
    speed: getFallSpeed(),
    rotation: random(-0.25, 0.25),
    rotationSpeed: random(-0.65, 0.65),
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
    if (item.y - item.size > GAME_HEIGHT) {
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
      if (item.type === "rat") {
        loseGame("FÖRLUST!", "Du fångade en råtta.\nDet där hör inte hemma i brödkorgen.");
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
  let itemLeft;
  let itemRight;
  let itemTop;
  let itemBottom;

  if (item.type === "rat") {
    itemLeft = item.x - item.size * 0.28;
    itemRight = item.x + item.size * 0.28;
    itemTop = item.y - item.size * 0.26;
    itemBottom = item.y + item.size * 0.26;
  } else {
    itemLeft = item.x - item.size * 0.42;
    itemRight = item.x + item.size * 0.42;
    itemTop = item.y - item.size * 0.42;
    itemBottom = item.y + item.size * 0.42;
  }

  const basketLeft = basket.x + basket.width * 0.14;
  const basketRight = basket.x + basket.width * 0.86;
  const basketTop = basket.y + basket.height * 0.2;
  const basketBottom = basket.y + basket.height * 0.92;

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
    "-10 prickar\nVisa för läggarlaget på rallydagen*\n\n*gäller bara en gång per lag"
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

  drawRoundedPanel(
    GAME_WIDTH / 2 - 305,
    195,
    610,
    170,
    38,
    "rgba(255, 255, 255, 0.72)",
    "rgba(116, 53, 31, 0.12)"
  );

  ctx.fillStyle = "#7f2f1d";
  ctx.font = "800 86px 'Baloo 2', Arial";
  ctx.fillText("BRÖDREGN", GAME_WIDTH / 2, 265);

  ctx.fillStyle = "#6b3b22";
  ctx.font = "900 25px Nunito, Arial";
  ctx.fillText("Fånga 100 bröd. Undvik råttorna.", GAME_WIDTH / 2, 310);

  ctx.font = "800 18px Nunito, Arial";
  ctx.fillText("Tryck på startknappen för att börja.", GAME_WIDTH / 2, 340);

  ctx.restore();
}

function clearCanvas() {
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
  sky.addColorStop(0, "#9eeeff");
  sky.addColorStop(0.36, "#c9f5ff");
  sky.addColorStop(0.62, "#fff1ba");
  sky.addColorStop(1, "#ffbd78");

  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  drawSun(785, 96, 1);
  drawCloud(125, 118, 1.12);
  drawCloud(710, 158, 0.9);
  drawCloud(430, 78, 0.72);

  drawRainbow();
  drawHills();
  drawTinySparkles();
}

function drawRainbow() {
  ctx.save();
  ctx.globalAlpha = 0.42;
  ctx.lineWidth = 13;
  ctx.lineCap = "round";

  const colors = ["#ff9ec5", "#ffd16f", "#fff4a8", "#8ee7be", "#8fd8ff"];

  colors.forEach(function(color, index) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(110, 405, 240 + index * 18, Math.PI * 1.08, Math.PI * 1.72);
    ctx.stroke();
  });

  ctx.restore();
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

  ctx.fillStyle = "#7f2f1d";
  ctx.beginPath();
  ctx.arc(-13, -6, 4, 0, Math.PI * 2);
  ctx.arc(13, -6, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#7f2f1d";
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

  ctx.fillStyle = "rgba(255, 255, 255, 0.82)";
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
  ctx.save();

  ctx.fillStyle = "rgba(255, 154, 191, 0.28)";
  ctx.beginPath();
  ctx.moveTo(0, GAME_HEIGHT * 0.78);
  ctx.quadraticCurveTo(GAME_WIDTH * 0.22, GAME_HEIGHT * 0.66, GAME_WIDTH * 0.48, GAME_HEIGHT * 0.78);
  ctx.quadraticCurveTo(GAME_WIDTH * 0.75, GAME_HEIGHT * 0.9, GAME_WIDTH, GAME_HEIGHT * 0.75);
  ctx.lineTo(GAME_WIDTH, GAME_HEIGHT);
  ctx.lineTo(0, GAME_HEIGHT);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(196, 145, 69, 0.22)";
  ctx.beginPath();
  ctx.moveTo(0, GAME_HEIGHT * 0.84);
  ctx.quadraticCurveTo(GAME_WIDTH * 0.36, GAME_HEIGHT * 0.7, GAME_WIDTH * 0.68, GAME_HEIGHT * 0.86);
  ctx.quadraticCurveTo(GAME_WIDTH * 0.86, GAME_HEIGHT * 0.95, GAME_WIDTH, GAME_HEIGHT * 0.82);
  ctx.lineTo(GAME_WIDTH, GAME_HEIGHT);
  ctx.lineTo(0, GAME_HEIGHT);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawTinySparkles() {
  ctx.save();

  for (let i = 0; i < 34; i++) {
    const x = (i * 129 + 43) % GAME_WIDTH;
    const y = ((i * 71 + 29) % 410) + 38;

    ctx.fillStyle = i % 2 === 0
      ? "rgba(255, 112, 173, 0.42)"
      : "rgba(255, 255, 255, 0.58)";

    ctx.beginPath();
    ctx.moveTo(x, y - 6);
    ctx.lineTo(x + 5, y);
    ctx.lineTo(x, y + 6);
    ctx.lineTo(x - 5, y);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore();
}

function createFloatingDecor() {
  floatingDecor = [];

  for (let i = 0; i < 22; i++) {
    floatingDecor.push({
      x: random(28, GAME_WIDTH - 28),
      y: random(70, GAME_HEIGHT - 130),
      size: random(4, 11),
      speed: random(7, 17),
      type: i % 4
    });
  }
}

function updateDecor(delta) {
  for (const decor of floatingDecor) {
    decor.y += decor.speed * delta;

    if (decor.y > GAME_HEIGHT - 88) {
      decor.y = 42;
      decor.x = random(28, GAME_WIDTH - 28);
    }
  }
}

function drawFloatingDecor() {
  ctx.save();

  for (const decor of floatingDecor) {
    if (decor.type === 0) {
      ctx.fillStyle = "rgba(127, 47, 29, 0.14)";
      ctx.beginPath();
      ctx.arc(decor.x, decor.y, decor.size, 0, Math.PI * 2);
      ctx.fill();
    } else if (decor.type === 1) {
      ctx.fillStyle = "rgba(255, 112, 173, 0.34)";
      drawHeart(decor.x, decor.y, decor.size);
    } else if (decor.type === 2) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.48)";
      ctx.beginPath();
      ctx.moveTo(decor.x, decor.y - decor.size);
      ctx.lineTo(decor.x + decor.size, decor.y);
      ctx.lineTo(decor.x, decor.y + decor.size);
      ctx.lineTo(decor.x - decor.size, decor.y);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = "rgba(255, 213, 95, 0.34)";
      ctx.beginPath();
      ctx.arc(decor.x, decor.y, decor.size * 0.8, 0, Math.PI * 2);
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
  ctx.ellipse(GAME_WIDTH / 2, GAME_HEIGHT + 18, GAME_WIDTH * 0.62, 82, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawPreviewItems() {
  const previewItems = [
    { x: 155, y: 205, size: 48, rotation: -0.15, breadType: 0 },
    { x: 740, y: 265, size: 48, rotation: 0.18, breadType: 1 },
    { x: 245, y: 420, size: 48, rotation: 0.14, breadType: 2 },
    { x: 665, y: 425, size: 50, rotation: -0.12, breadType: 3 }
  ];

  previewItems.forEach(drawBread);
}

function drawFallingItems() {
  for (const item of fallingItems) {
    if (item.type === "bread") {
      drawBread(item);
    } else {
      drawRat(item);
    }
  }
}

function drawBread(item) {
  const img = breadImages[item.breadType] || breadImages[0];

  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.rotate(item.rotation);

  drawShadow(0, item.size * 0.45, item.size * 0.5, item.size * 0.14);

  if (img.complete && img.naturalWidth > 0) {
    drawImageKeepRatio(img, item.size);
  } else {
    drawFallbackBread(item.size);
  }

  ctx.restore();
}

function drawFallbackBread(size) {
  ctx.fillStyle = "#d99545";
  ctx.strokeStyle = "#6c3f1d";
  ctx.lineWidth = 3;

  ctx.beginPath();
  ctx.arc(0, 0, size * 0.42, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawRat(item) {
  ctx.save();
  ctx.translate(item.x, item.y);
  ctx.rotate(item.rotation);

  drawShadow(0, item.size * 0.44, item.size * 0.46, item.size * 0.13);

  if (ratImage.complete && ratImage.naturalWidth > 0) {
    drawImageKeepRatio(ratImage, item.size);
  } else {
    ctx.font = item.size + "px serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🐀", 0, 0);
  }

  ctx.restore();
}

function drawImageKeepRatio(img, maxSize) {
  const ratio = img.naturalWidth / img.naturalHeight;

  let width;
  let height;

  if (ratio >= 1) {
    width = maxSize;
    height = maxSize / ratio;
  } else {
    height = maxSize;
    width = maxSize * ratio;
  }

  ctx.drawImage(
    img,
    -width / 2,
    -height / 2,
    width,
    height
  );
}

function drawBasket() {
  ctx.save();

  const x = basket.x;
  const y = basket.y;
  const w = basket.width;
  const h = basket.height;

  drawShadow(x + w / 2, y + h + 8, w * 0.52, 12);

  if (basketImage.complete && basketImage.naturalWidth > 0) {
    const ratio = basketImage.naturalWidth / basketImage.naturalHeight;

    let drawWidth = w;
    let drawHeight = w / ratio;

    if (drawHeight > h * 1.35) {
      drawHeight = h * 1.35;
      drawWidth = drawHeight * ratio;
    }

    ctx.drawImage(
      basketImage,
      x + w / 2 - drawWidth / 2,
      y + h / 2 - drawHeight / 2,
      drawWidth,
      drawHeight
    );
  } else {
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
  }

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
  ctx.lineWidth = 4;
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

  const scaleX = GAME_WIDTH / rect.width;
  const touchX = (touch.clientX - rect.left) * scaleX;

  basket.x = touchX - basket.width / 2;
  basket.x = clamp(basket.x, 14, GAME_WIDTH - basket.width - 14);

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
