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

    const iconHtml = thread.id === "thread1"
      ? `<div class="icon secret-icon" onclick="showCroissantPopup(event)">${thread.icon}</div>`
      : `<div class="icon">${thread.icon}</div>`;

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
  }).join("<br>");
}

function openThread(id) {
  const thread = threads.find(function(item) {
    return item.id === id;
  });

  const threadView = document.getElementById("threadView");

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
  document.getElementById("front").style.display = "block";
  window.scrollTo(0, 0);
}

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
    { x: 0,  y: 0  },
    { x: 50, y: 0  },
    { x: 0,  y: 34 },
    { x: 50, y: 34 },
    { x: 0,  y: 68 },
    { x: 50, y: 68 }
  ];

  let rects = `<rect width="100" height="100" fill="#000000"/>`;

  for (let i = 0; i < 6; i++) {
    const fill = pattern[i] === "1" ? color : "#000000";

    rects += `
      <rect
        x="${positions[i].x}"
        y="${positions[i].y}"
        width="49"
        height="32"
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
  document.querySelectorAll("img.avatar").forEach(function(img) {
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

function showCroissantPopup(event) {
  event.stopPropagation();
  document.getElementById("croissantPopup").style.display = "block";
}

function closeCroissantPopup() {
  document.getElementById("croissantPopup").style.display = "none";
}

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

async function tryLogin() {
  const username = document.getElementById("loginUsername").value.trim().toLowerCase();
  const password = document.getElementById("loginPassword").value.trim().toLowerCase();
  const code = Array.from(document.querySelectorAll(".code-digit"))
    .map(function(input) {
      return input.value.trim();
    })
    .join("");

  const loginString = username + "|" + password + "|" + code;

  const encryptedMessage = "zqE8SXy+ZncWoJZLmWx/4/YflIolMvmsT9ulbeHchk1t0+gP0H6Q2dVKLGBP2k9Px4wzukMo1dFH+o7E";
  const ivString = "7LgjcKysBNV3MSTp";

  try {
    const decodedMessage = await decryptMessage(loginString, encryptedMessage, ivString);

    document.getElementById("loginPopup").style.display = "none";
    document.getElementById("successText").innerText = decodedMessage;
    document.getElementById("successPopup").style.display = "block";
  } catch (error) {
    document.getElementById("loginError").textContent = "Fel inloggning. Kontrollera användarnamn, lösenord och säkerhetskod.";
  }
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

function closeSuccess() {
  document.getElementById("successPopup").style.display = "none";
}

renderThreadList();
renderLatestNews();
initAvatars();
initCodeInputs();
