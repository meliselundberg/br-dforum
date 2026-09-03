let currentProfileTab = "overview";

function getSortedThreads() {
  return [...threads].sort(function(a, b) {
    return new Date(b.latestDate) - new Date(a.latestDate);
  });
}

function renderThreadList() {
  const sortedThreads = getSortedThreads();
  const threadList = document.getElementById("threadList");

  threadList.innerHTML = sortedThreads.map(function(thread) {
    const replies = Math.max(thread.posts.length - 1, 0);
    const latestPost = thread.posts[thread.posts.length - 1];

    const iconHtml = `<div class="icon">${thread.icon}</div>`;

    return `
      <div class="forum-row" onclick="openThread('${thread.id}')">
        ${iconHtml}

        <div>
          <div class="thread-title">${thread.title}</div>
        </div>

        <div class="stat">
          ${replies} svar<br>
          ${thread.views.toLocaleString("sv-SE")} visningar
        </div>

        <div class="latest">
          Senaste: <b>${thread.latestLabel}</b><br>
          av ${latestPost.user}
        </div>
      </div>
    `;
  }).join("");
}

function renderLatestNews() {
  const latestNews = document.getElementById("latestNews");
  const sortedThreads = getSortedThreads().slice(0, 4);

  latestNews.innerHTML = sortedThreads.map(function(thread) {
    const latestPost = thread.posts[thread.posts.length - 1];
    return `${thread.latestLabel} ${latestPost.user} svarade i “${thread.title}”`;
  }).join("<br><br>");
}

function openThread(id) {
  const thread = threads.find(function(item) {
    return item.id === id;
  });

  const threadView = document.getElementById("threadView");
  const profileView = document.getElementById("profileView");

  profileView.style.display = "none";
  profileView.innerHTML = "";

  threadView.innerHTML = `
    <div class="back" onclick="goBack()">← Tillbaka till trådlistan</div>

    ${thread.posts.map(function(post) {
      return `
        <article class="post">
          <div class="user">
            <img
              class="avatar"
              ${post.avatarPattern ? `data-pattern="${post.avatarPattern}"` : ""}
              ${post.avatarSeed ? `data-seed="${post.avatarSeed}"` : ""}
              ${post.avatarColor ? `data-color="${post.avatarColor}"` : ""}
              alt=""
            >

            <div>
              <div class="username">${post.user}</div>
              <div class="role">${post.role}</div>
            </div>
          </div>

          <div class="post-main">
            <div class="post-time">${post.time}</div>
            <div class="post-text">${post.text}</div>
          </div>
        </article>
      `;
    }).join("")}

    <div class="locked-note">Tråden är låst. Nya kommentarer kan inte publiceras.</div>
  `;

  document.getElementById("front").style.display = "none";
  threadView.style.display = "block";

  initAvatars();
  window.scrollTo(0, 0);
}

function goBack() {
  document.getElementById("threadView").style.display = "none";
  document.getElementById("threadView").innerHTML = "";

  document.getElementById("profileView").style.display = "none";
  document.getElementById("profileView").innerHTML = "";

  document.getElementById("front").style.display = "block";
  window.scrollTo(0, 0);
}

/* AVATARER */

function hashString(str) {
  let hash = 0;

  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash);
}

function colorFromSeed(seed) {
  const palette = [
    "#22c55e",
    "#c026d3",
    "#ec4899",
    "#8b5cf6",
    "#3b82f6",
    "#06b6d4",
    "#eab308",
    "#f97316",
    "#ef4444"
  ];

  return palette[hashString(seed) % palette.length];
}

function patternFromSeed(seed) {
  const hash = hashString(seed);
  let pattern = "";

  for (let i = 0; i < 6; i++) {
    pattern += ((hash >> i) & 1) ? "1" : "0";
  }

  if (pattern === "000000") pattern = "100000";
  if (pattern === "111111") pattern = "111100";

  return pattern;
}

function makeGridAvatar(pattern, color) {
  const positions = [
    { x: 6,  y: 6  },
    { x: 52, y: 6  },
    { x: 6,  y: 37 },
    { x: 52, y: 37 },
    { x: 6,  y: 68 },
    { x: 52, y: 68 }
  ];

  let rects = `<rect width="100" height="100" rx="12" ry="12" fill="#000000"/>`;

  for (let i = 0; i < 6; i++) {
    const fill = pattern[i] === "1" ? color : "#000000";

    rects += `
      <rect
        x="${positions[i].x}"
        y="${positions[i].y}"
        width="42"
        height="24"
        rx="7"
        ry="7"
        fill="${fill}"
      />
    `;
  }

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
      ${rects}
    </svg>
  `;

  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

function initAvatars() {
  document.querySelectorAll("img.avatar, img.profile-avatar").forEach(function(img) {
    if (img.classList.contains("profile-photo")) {
      return;
    }

    const pattern = img.dataset.pattern;
    const seed = img.dataset.seed;
    const color = img.dataset.color || colorFromSeed(seed || "default");

    if (pattern) {
      img.src = makeGridAvatar(pattern, color);
    } else if (seed) {
      img.src = makeGridAvatar(patternFromSeed(seed), color);
    }
  });
}

/* LOGIN */

function openLogin() {
  document.getElementById("loginPopup").style.display = "block";
  document.getElementById("loginError").textContent = "";
  document.getElementById("loginUsername").value = "";
  document.getElementById("loginPassword").value = "";

  document.querySelectorAll(".code-digit").forEach(function(input) {
    input.value = "";
  });

  document.getElementById("loginUsername").focus();
}

function closeLogin() {
  document.getElementById("loginPopup").style.display = "none";
}

async function sha256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);

  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

  return hashArray
    .map(function(byte) {
      return byte.toString(16).padStart(2, "0");
    })
    .join("");
}

async function tryLogin() {
  try {
    const username = document.getElementById("loginUsername").value.trim().toLowerCase();
    const password = document.getElementById("loginPassword").value.trim().toLowerCase();

    const code = Array.from(document.querySelectorAll(".code-digit"))
      .map(function(input) {
        return input.value.trim();
      })
      .join("");

    const wrongParts = [];

    if (await sha256(username) !== "f51b3450bc1fa0d4fa4a20f23451b0da7e40e6c4f0c9f6c31913a5d7096ca99a") {
      wrongParts.push("användarnamn");
    }

    if (await sha256(password) !== "b427c3dec9045990213ccc3dbffbdf189e75c7ce18e1a86ed7c4fe9a2db5d627") {
      wrongParts.push("lösenord");
    }

    if (await sha256(code) !== "9d73bfb92adaebaa346e5c12db11ce0bf0dc5ae059677dcec5198d7302d32493") {
      wrongParts.push("säkerhetskod");
    }

    if (wrongParts.length > 0) {
      document.getElementById("loginError").textContent = makeLoginErrorMessage(wrongParts);
      return;
    }

    const loginString = username + "|" + password + "|" + code;

    const encryptedMessage = "V4NASR3dH8MelmQkHnuDi5Lc66LKN6D+oa+2gyYVZ5HVKyssJyKVdDCUqNW2iQbratwEun9i9EQGAov4qvCo";
    const ivString = "PpYX98LYVMhuzJdD";

    const decodedMessage = await decryptMessage(loginString, encryptedMessage, ivString);

    sessionStorage.setItem("brodnyttOrderText", decodedMessage);
    window.location.href = "profile.html";
  } catch (error) {
    document.getElementById("loginError").textContent =
      "Inloggningen kunde inte kontrolleras. Testa att öppna sidan via GitHub Pages, inte som lokal fil.";
  }
}

function makeLoginErrorMessage(wrongParts) {
  if (wrongParts.length === 1) {
    return "Fel " + wrongParts[0] + ".";
  }

  if (wrongParts.length === 2) {
    return "Fel " + wrongParts[0] + " och " + wrongParts[1] + ".";
  }

  return "Fel användarnamn, lösenord och säkerhetskod.";
}

async function decryptMessage(loginString, encryptedMessage, ivString) {
  const encoder = new TextEncoder();

  const keyMaterial = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(loginString)
  );

  const key = await crypto.subtle.importKey(
    "raw",
    keyMaterial,
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  const encryptedBytes = Uint8Array.from(atob(encryptedMessage), function(c) {
    return c.charCodeAt(0);
  });

  const iv = Uint8Array.from(atob(ivString), function(c) {
    return c.charCodeAt(0);
  });

  const decryptedBytes = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encryptedBytes
  );

  return new TextDecoder().decode(decryptedBytes);
}

function initCodeInputs() {
  const inputs = Array.from(document.querySelectorAll(".code-digit"));

  inputs.forEach(function(input, index) {
    input.addEventListener("input", function() {
      input.value = input.value.replace(/\D/g, "").slice(0, 1);

      if (input.value && inputs[index + 1]) {
        inputs[index + 1].focus();
      }
    });

    input.addEventListener("keydown", function(event) {
      if (event.key === "Backspace" && !input.value && inputs[index - 1]) {
        inputs[index - 1].focus();
      }
    });

    input.addEventListener("paste", function(event) {
      event.preventDefault();

      const pasted = event.clipboardData
        .getData("text")
        .replace(/\D/g, "")
        .slice(0, 4);

      pasted.split("").forEach(function(char, pasteIndex) {
        if (inputs[pasteIndex]) {
          inputs[pasteIndex].value = char;
        }
      });

      const nextEmpty = inputs.find(function(item) {
        return !item.value;
      });

      if (nextEmpty) {
        nextEmpty.focus();
      } else {
        inputs[inputs.length - 1].focus();
      }
    });
  });
}

/* PROFILSIDA EFTER LOGIN */

function renderProfilePage(orderText) {
  const profileView = document.getElementById("profileView");

  document.getElementById("front").style.display = "none";
  document.getElementById("threadView").style.display = "none";
  document.getElementById("threadView").innerHTML = "";

  profileView.style.display = "block";

  profileView.innerHTML = `
    <div class="back" onclick="goBack()">← Tillbaka till forumet</div>

    <section class="profile-card">
      <div class="profile-hero">
        <div class="profile-hero-inner">
          <img
            id="profileAvatar"
            class="profile-avatar profile-photo"
            alt=""
            src="yeastpb.png?v=2"
          >
          <div>
            <h2 class="profile-name">broderanneli</h2>
            <div class="profile-meta">Medlem sedan 2024 · Bullbeställare · Gillar croissanter</div>
          </div>
        </div>
      </div>

      <div class="profile-tabs">
        <button class="profile-tab active" onclick="switchProfileTab('overview')">Översikt</button>
        <button class="profile-tab" onclick="switchProfileTab('orders')">Beställningar</button>
        <button class="profile-tab" onclick="switchProfileTab('activity')">Aktivitet</button>
        <button class="profile-tab" onclick="switchProfileTab('settings')">Inställningar</button>
      </div>

      <div class="profile-body">
        <div id="tab-overview" class="tab-panel active">
          <div class="info-grid">
            <div class="info-box">
              <div class="info-label">Användarnamn</div>
              <div class="info-value">broderanneli</div>
            </div>

            <div class="info-box">
              <div class="info-label">Favorit</div>
              <div class="info-value">Croissant</div>
            </div>

            <div class="info-box">
              <div class="info-label">Senaste inlägg</div>
              <div class="info-value">Tips på tårta till pappa</div>
            </div>

            <div class="info-box">
              <div class="info-label">Status</div>
              <div class="info-value">Inloggad</div>
            </div>
          </div>

          <div class="profile-note">
            Välkommen tillbaka. Kontrollera gärna dina beställningar innan du loggar ut.
          </div>
        </div>

        <div id="tab-orders" class="tab-panel">
          <div class="order-card">
            <div class="order-title">Dina beställningar</div>
            <div class="order-text">${orderText}</div>
          </div>
        </div>

        <div id="tab-activity" class="tab-panel">
          <ul class="fake-list">
            <li>Skrev i tråden “Tips på tårta till pappa på namnsdagen?”</li>
            <li>Markerade en croissant som favorit</li>
            <li>Kommenterade en tidigare bullbeställning</li>
            <li>Loggade in från en okänd degig enhet</li>
          </ul>
        </div>

        <div id="tab-settings" class="tab-panel">
          <div class="info-grid">
            <div class="info-box">
              <div class="info-label">E-postnotiser</div>
              <div class="info-value">Avstängda</div>
            </div>

            <div class="info-box">
              <div class="info-label">Beställningspåminnelser</div>
              <div class="info-value">På</div>
            </div>

            <div class="info-box">
              <div class="info-label">Profilbild</div>
              <div class="info-value">Rutnätsavatar</div>
            </div>

            <div class="info-box">
              <div class="info-label">Kontosäkerhet</div>
              <div class="info-value">4-siffrig kod</div>
            </div>
          </div>

          <div class="profile-note">
            Inställningar kan inte ändras just nu eftersom forumet är låst.
          </div>
        </div>
      </div>
    </section>
  `;

  initAvatars();
  window.scrollTo(0, 0);
}

function switchProfileTab(tabName) {
  currentProfileTab = tabName;

  document.querySelectorAll(".profile-tab").forEach(function(tab) {
    tab.classList.remove("active");
  });

  document.querySelectorAll(".tab-panel").forEach(function(panel) {
    panel.classList.remove("active");
  });

  const tabButtons = Array.from(document.querySelectorAll(".profile-tab"));

  tabButtons.forEach(function(button) {
    const buttonText = button.textContent.trim().toLowerCase();

    if (
      (tabName === "overview" && buttonText === "översikt") ||
      (tabName === "orders" && buttonText === "beställningar") ||
      (tabName === "activity" && buttonText === "aktivitet") ||
      (tabName === "settings" && buttonText === "inställningar")
    ) {
      button.classList.add("active");
    }
  });

  document.getElementById("tab-" + tabName).classList.add("active");
}

/* START */

renderThreadList();
renderLatestNews();
initAvatars();
initCodeInputs();
