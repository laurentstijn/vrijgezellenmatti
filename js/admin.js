const ADMIN_PIN = "1234";
let adminActive = false;
let testMode = false;

function initAdmin() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("admin") !== "1") return;

  const pin = prompt("Admin pincode?");
  if (pin !== ADMIN_PIN) {
    alert("❌ Verkeerde pincode");
    return;
  }

  adminActive = true;
  // Verberg speler-interface in admin-modus
    const playerUI = document.getElementById("playerUI");
    if (playerUI) {
      playerUI.style.display = "none";
    }

  const panel = document.getElementById("adminPanel");
  panel.classList.remove("hidden");

  panel.innerHTML = `
    <h2>🔧 Admin</h2>

    <button onclick="prevLevel()">⬅ Vorige</button>
    <button onclick="nextLevel()">➡ Volgende</button>
    <button onclick="forceCorrect()">✅ Forceer goed</button>

    <button onclick="toggleTestMode(event)">🧪 Testmodus: UIT</button>

    <hr>
    
    <button onclick="addLevel()">➕ Nieuw level</button>
    <button onclick="deleteLevel()">🗑️ Verwijder level</button>


    <label>Vraag</label>
    <input id="adminQuestion" type="text">

    <label>Juiste antwoord</label>
    <input id="adminAnswer" type="text">

    <label>Type</label>
    <select id="adminType">
      <option value="text">Tekst</option>
      <option value="number">Nummer</option>
      <option value="photo">Foto</option>
    </select>

    <label>Latitude</label>
    <input id="adminLat" type="number" step="any">

    <label>Longitude</label>
    <input id="adminLng" type="number" step="any">

    <button onclick="useCurrentLocation()">📍 Gebruik huidige locatie</button>
    <button onclick="saveLevel()">💾 Opslaan in Firebase</button>
  `;

  loadAdminFields();
}

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
  const q = document.getElementById("adminQuestion").value.trim();
  const a = document.getElementById("adminAnswer").value.trim();
  const t = document.getElementById("adminType").value;
  const lat = parseFloat(document.getElementById("adminLat").value);
  const lng = parseFloat(document.getElementById("adminLng").value);

  if (!q || isNaN(lat) || isNaN(lng)) {
    alert("❌ Vraag + geldige locatie verplicht");
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

  alert("✅ Level opgeslagen");
}

function nextLevel() {
  if (currentLevel < levels.length - 1) {
    currentLevel++;
    questionShown = false;
    loadAdminFields();
  }
}

function prevLevel() {
  if (currentLevel > 0) {
    currentLevel--;
    questionShown = false;
    loadAdminFields();
  }
}

function forceCorrect() {
  submitAnswer(true);
}

function useCurrentLocation() {
  if (!navigator.geolocation) {
    alert("❌ GPS niet ondersteund");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    pos => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      document.getElementById("adminLat").value = lat.toFixed(6);
      document.getElementById("adminLng").value = lng.toFixed(6);

      alert("📍 Huidige locatie ingevuld");
    },
    err => {
      alert("❌ Kon locatie niet ophalen: " + err.message);
    },
    {
      enableHighAccuracy: true
    }
  );
}

async function addLevel() {
  if (!adminActive) return;

  const base = levels[currentLevel] || {
    lat: 0,
    lng: 0,
    type: "text",
    question: "Nieuwe vraag",
    answer: "",
    edit: true
  };

  const newLevel = {
    ...base,
    question: "Nieuwe vraag",
    answer: "",
    edit: true
  };

  levels.splice(currentLevel + 1, 0, newLevel);
  currentLevel++;

  await db.collection("games").doc("default").set(
    { levels },
    { merge: true }
  );

  questionShown = false;
  loadAdminFields();

  alert("➕ Nieuw level toegevoegd");
}

async function deleteLevel() {
  if (!adminActive) return;

  if (levels.length <= 1) {
    alert("❌ Minstens 1 level vereist");
    return;
  }

  if (!confirm("Dit level definitief verwijderen?")) return;

  levels.splice(currentLevel, 1);

  if (currentLevel >= levels.length) {
    currentLevel = levels.length - 1;
  }

  await db.collection("games").doc("default").set(
    { levels },
    { merge: true }
  );

  questionShown = false;
  loadAdminFields();

  alert("🗑️ Level verwijderd");
}

function toggleTestMode(ev) {
  testMode = !testMode;

  const btn = ev?.currentTarget || ev?.target;
  btn.innerText = testMode
    ? "🧪 Testmodus: AAN"
    : "🧪 Testmodus: UIT";

  if (testMode) {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
    statusEl.innerText = "🧪 Testmodus actief (GPS uit)";
    questionShown = false;
    showQuestion(levels[currentLevel]);
  } else {
    statusEl.innerText = "➡️ GPS weer actief";
    startGPS();
  }
}
