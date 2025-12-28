// ================================
// Admin configuratie
// ================================
const ADMIN_PIN = "1234"; // ← pas aan indien gewenst
let adminActive = false;

// ================================
// Init admin
// ================================
function initAdmin() {
  const params = new URLSearchParams(window.location.search);
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

    <button onclick="prevLevel()">⬅ Vorige</button>
    <button onclick="nextLevel()">➡ Volgende</button>
    <button onclick="forceCorrect()">✅ Forceer goed</button>

    <hr>

    <label>Vraag</label>
    <input id="adminQuestion" type="text">

    <label>Juiste antwoord</label>
    <input id="adminAnswer" type="text">

    <button onclick="saveQuestion()">💾 Opslaan</button>
  `;

  loadAdminFields();
}

// ================================
// Admin helpers
// ================================
function loadAdminFields() {
  if (!adminActive) return;

  const level = levels[currentLevel];
  document.getElementById("adminQuestion").value = level.question || "";
  document.getElementById("adminAnswer").value = level.answer || "";
}

function saveQuestion() {
  if (!adminActive) return;

  const q = document.getElementById("adminQuestion").value.trim();
  const a = document.getElementById("adminAnswer").value.trim();

  if (!q) {
    alert("Vraag mag niet leeg zijn");
    return;
  }

  levels[currentLevel].question = q;
  levels[currentLevel].answer = a;

  questionShown = false;
  alert("✅ Vraag opgeslagen");
}

// ================================
// Navigatie
// ================================
function nextLevel() {
  if (!adminActive) return;

  if (currentLevel < levels.length - 1) {
    currentLevel++;
    questionShown = false;
    loadAdminFields();
  }
}

function prevLevel() {
  if (!adminActive) return;

  if (currentLevel > 0) {
    currentLevel--;
    questionShown = false;
    loadAdminFields();
  }
}

function forceCorrect() {
  if (!adminActive) return;
  submitAnswer();
}
