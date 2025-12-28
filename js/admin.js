const ADMIN_PIN = "1234";
let adminActive = false;

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
    <input id="adminQuestion" type="text" />

    <label>Juiste antwoord</label>
    <input id="adminAnswer" type="text" />

    <label>Type</label>
    <select id="adminType">
      <option value="text">Tekst</option>
      <option value="number">Nummer</option>
      <option value="photo">Foto</option>
    </select>

    <label>Latitude</label>
    <input id="adminLat" type="number" step="any" />

    <label>Longitude</label>
    <input id="adminLng" type="number" step="any" />

    <button onclick="saveLevel()">💾 Opslaan in Firebase</button>
  `;

  loadAdminFields();
}

/* ================================
   Admin helpers
================================ */
function loadAdminFields() {
  if (!adminActive) return;

  const level = levels[currentLevel];
  if (!level) return;

  document.getElementById("adminQuestion").value = level.question || "";
  document.getElementById("adminAnswer").value = level.answer || "";
  document.getElementById("adminType").value = level.type || "text";
  document.getElementById("adminLat").value = level.lat || "";
  document.getElementById("adminLng").value = level.lng || "";
}

async function saveLevel() {
  if (!adminActive) return;

  const q = document.getElementById("adminQuestion").value.trim();
  const a = document.getElementById("adminAnswer").value.trim();
  const t = document.getElementById("adminType").value;
  const lat = parseFloat(document.getElementById("adminLat").value);
  const lng = parseFloat(document.getElementById("adminLng").value);

  if (!q || isNaN(lat) || isNaN(lng)) {
    alert("❌ Vraag + geldige locatie zijn verplicht");
    return;
  }

  levels[currentLevel] = {
    ...levels[currentLevel],
    question: q,
    answer: a,
    type: t,
    lat,
    lng
  };

  await db.collection("games").doc("default").set(
    { levels },
    { merge: true }
  );

  questionShown = false;
  alert("✅ Level opgeslagen in Firebase");
}

/* ================================
   Navigatie
================================ */
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
  submitAnswer(true);
}
