const ADMIN_PIN = "1234";
const GOOGLE_CLIENT_ID = "821755022502-1ljl0f1q5a0bumbqvuafli84tmoksc9j.apps.googleusercontent.com";
let adminActive = false;
let testMode = false;
let driveToken = "";
let tokenClient = null;

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

    <label>Vraag media</label>
    <select id="adminQuestionType">
      <option value="none">Geen</option>
      <option value="photo">Foto</option>
      <option value="video">Video</option>
    </select>

    <label>Google Drive</label>
    <button id="adminDriveLogin" type="button">🔐 Login Google Drive</button>
    <div id="adminDriveStatus">Niet verbonden</div>

    <label>Media upload (Drive)</label>
    <input id="adminMediaFile" type="file">
    <div id="adminMediaInfo"></div>

    <label>Latitude</label>
    <input id="adminLat" type="number" step="any">

    <label>Longitude</label>
    <input id="adminLng" type="number" step="any">

    <button onclick="useCurrentLocation()">📍 Gebruik huidige locatie</button>
    <button onclick="saveLevel()">💾 Opslaan in Firebase</button>
  `;

  const questionTypeSelect = document.getElementById("adminQuestionType");
  questionTypeSelect.addEventListener("change", updateMediaAccept);

  const driveLoginBtn = document.getElementById("adminDriveLogin");
  driveLoginBtn.addEventListener("click", requestDriveAuth);

  initDriveAuth();
  loadAdminFields();
}

function initDriveAuth() {
  if (!window.google || !google.accounts || !google.accounts.oauth2) {
    setTimeout(initDriveAuth, 200);
    return;
  }

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: "https://www.googleapis.com/auth/drive.file",
    callback: resp => {
      driveToken = resp?.access_token || "";
      updateDriveStatus();
    }
  });

  updateDriveStatus();
}

function updateDriveStatus() {
  const statusEl = document.getElementById("adminDriveStatus");
  const loginBtn = document.getElementById("adminDriveLogin");
  if (!statusEl || !loginBtn) return;

  if (driveToken) {
    statusEl.innerText = "Verbonden met Google Drive";
    loginBtn.innerText = "✅ Drive verbonden";
  } else {
    statusEl.innerText = "Niet verbonden";
    loginBtn.innerText = "🔐 Login Google Drive";
  }
}

function requestDriveAuth() {
  if (!tokenClient) {
    alert("Google login is nog niet klaar, probeer zo opnieuw.");
    return;
  }

  tokenClient.requestAccessToken({ prompt: "consent" });
}

function updateMediaAccept() {
  const questionType = document.getElementById("adminQuestionType").value;
  const mediaInput = document.getElementById("adminMediaFile");
  mediaInput.value = "";

  if (questionType === "photo") {
    mediaInput.accept = "image/*";
  } else if (questionType === "video") {
    mediaInput.accept = "video/*";
  } else {
    mediaInput.accept = "";
  }
}

function loadAdminFields() {
  if (!adminActive) return;
  const level = levels[currentLevel];
  if (!level) return;

  document.getElementById("adminQuestion").value = level.questionText || level.question || "";
  document.getElementById("adminAnswer").value = level.answer || "";
  document.getElementById("adminType").value = level.type || "text";
  document.getElementById("adminQuestionType").value = level.questionType || "none";
  document.getElementById("adminLat").value = level.lat || "";
  document.getElementById("adminLng").value = level.lng || "";

  const mediaInfo = document.getElementById("adminMediaInfo");
  mediaInfo.innerText = level.mediaUrl ? `Huidige media: ${level.mediaUrl}` : "Geen media";
  updateMediaAccept();
}

async function uploadToDrive(file) {
  if (!driveToken) {
    throw new Error("Niet ingelogd op Google Drive.");
  }

  const metadata = {
    name: file.name,
    mimeType: file.type || "application/octet-stream"
  };

  const boundary = "-------matti-drive-boundary";
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;

  const fileBuffer = await file.arrayBuffer();
  const multipartBody = new Blob(
    [
      delimiter,
      "Content-Type: application/json; charset=UTF-8\r\n\r\n",
      JSON.stringify(metadata),
      delimiter,
      `Content-Type: ${metadata.mimeType}\r\n\r\n`,
      fileBuffer,
      closeDelim
    ],
    { type: `multipart/related; boundary=${boundary}` }
  );

  const uploadRes = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${driveToken}`
      },
      body: multipartBody
    }
  );

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(errText || "Drive upload mislukt.");
  }

  const { id } = await uploadRes.json();
  if (!id) {
    throw new Error("Drive upload zonder bestand-id.");
  }

  const permRes = await fetch(
    `https://www.googleapis.com/drive/v3/files/${id}/permissions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${driveToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        role: "reader",
        type: "anyone"
      })
    }
  );

  if (!permRes.ok) {
    const errText = await permRes.text();
    throw new Error(errText || "Drive permissions mislukt.");
  }

  return `https://drive.google.com/uc?export=download&id=${id}`;
}

async function saveLevel() {
  const q = document.getElementById("adminQuestion").value.trim();
  const a = document.getElementById("adminAnswer").value.trim();
  const t = document.getElementById("adminType").value;
  const qt = document.getElementById("adminQuestionType").value;
  const mediaInput = document.getElementById("adminMediaFile");
  const lat = parseFloat(document.getElementById("adminLat").value);
  const lng = parseFloat(document.getElementById("adminLng").value);

  if (!q || isNaN(lat) || isNaN(lng)) {
    alert("❌ Vraag + geldige locatie verplicht");
    return;
  }

  let mediaUrl = levels[currentLevel]?.mediaUrl || "";
  if (qt !== "none" && mediaInput.files && mediaInput.files.length > 0) {
    const file = mediaInput.files[0];
    try {
      mediaUrl = await uploadToDrive(file);
    } catch (err) {
      alert(`❌ Upload mislukt: ${err.message || err}`);
      return;
    }
  }

  levels[currentLevel] = {
    ...levels[currentLevel],
    questionText: q,
    answer: a,
    type: t,
    questionType: qt === "none" ? "" : qt,
    mediaUrl: qt === "none" ? "" : mediaUrl,
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
