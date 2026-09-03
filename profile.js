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

function loadProfilePage() {
  const orderText = sessionStorage.getItem("brodnyttOrderText");

  if (!orderText) {
    document.getElementById("orderText").textContent =
      "Ingen aktiv beställning hittades. Logga in från forumet igen.";
  } else {
    document.getElementById("orderText").textContent = orderText;
  }

  const avatar = document.getElementById("profileAvatar");
  avatar.src = "yeastpb.png?v=1";
  avatar.alt = "Bröder Yeast Mode";
}

loadProfilePage();
