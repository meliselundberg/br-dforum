function switchProfileTab(tabName) {
  document.querySelectorAll(".profile-tab").forEach(function(tab) {
    tab.classList.remove("active");
  });

  document.querySelectorAll(".tab-panel").forEach(function(panel) {
    panel.classList.remove("active");
  });

  const tabMap = {
    overview: "Översikt",
    orders: "Beställningar",
    activity: "Aktivitet",
    settings: "Inställningar"
  };

  document.querySelectorAll(".profile-tab").forEach(function(button) {
    if (button.textContent.trim() === tabMap[tabName]) {
      button.classList.add("active");
    }
  });

  document.getElementById("tab-" + tabName).classList.add("active");
}

function makeProfileAvatar() {
  const pattern = "111100";
  const color = "#8b5cf6";

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

  document.getElementById("profileAvatar").src =
    "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

function loadProfilePage() {
  const orderText = sessionStorage.getItem("brodnyttOrderText");

  if (!orderText) {
    document.getElementById("orderText").textContent =
      "Ingen aktiv beställning hittades. Logga in från forumet igen.";
  } else {
    document.getElementById("orderText").textContent = orderText;
  }

  makeProfileAvatar();
}

loadProfilePage();
