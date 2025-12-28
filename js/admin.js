// ================================
// Admin configuratie
// ================================
const ADMIN_PIN = "1234"; // 👈 pas aan indien gewenst
let adminActive = false;

// ================================
// Init admin (wordt aangeroepen vanuit app.js)
// ================================
function initAdmin() {
  const params = new URLSearchParams(window.location.search);

  // Alleen admin-modus als ?admin=1
  if (params.get("admin") !== "1") return;

  const pin = prompt("Admin pincode?");
  if (pin !== ADMIN_PIN) {
    alert("❌ Verkeerde pincode");
    return;
  }

  adminActive = true;

  const panel = document.getElementById("adminPanel");
  panel.classList.remove("hidden");

  panel.innerHTML = `
    <h2>🔧 Admin</h2>
    <p>Admin-modus actief</p>

    <button onclick="prevLevel()">⬅ Vorige vraag</button>
    <button onclick="nextLevel()">➡ Volgende vraag</button>
    <button onclick="forceCorrect()">✅ Forceer goed</button>
    <button onclick="showCurrent()">ℹ Huidige vraag</button>
  `;
}

// ================================
// Admin acties
// ================================
function nextLevel() {
  if (!adminActive) return;

  if (currentLevel < levels.length - 1) {
    currentLevel++;
    questionShown = false;
    alert("➡ Naar level " + currentLevel);
  } else {
    alert("Dit is het laatste level");
  }
}

function prevLevel() {
  if (!adminActive) return;

  if (currentLevel > 0) {
    currentLevel--;
    questionShown = false;
    alert("⬅ Terug naar level " + currentLevel);
  } else {
    alert("Dit is het eerste level");
  }
}

function forceCorrect() {
  if (!adminActive) return;

  alert("✅ Admin: antwoord geforceerd");
  submitAnswer();
}

function showCurrent() {
  if (!adminActive) return;

  const level = levels[currentLevel];
  alert(
    `Level: ${currentLevel + 1}/${levels.length}\n\n` +
    `Type: ${level.type}\n` +
    `Vraag: ${level.question}`
  );
}
