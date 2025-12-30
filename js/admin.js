const ADMIN_PIN = "1234";
const GOOGLE_CLIENT_ID = "821755022502-1ljl0f1q5a0bumbqvuafli84tmoksc9j.apps.googleusercontent.com";
const GOOGLE_DRIVE_FOLDER_ID = "17owb6tmUaG8rCUv9InFYZiPUbIeJ9SCM";
let adminActive = false;
let testMode = false;
let driveToken = "";
let tokenClient = null;
let openLevelIndex = null;
let dragFromIndex = null;
let dragOverIndex = null;
let adminMap = null;
let adminMarkers = [];

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
    <div id="adminLevelIndex"></div>
    <div id="adminOrderStatus"></div>

    <div class="admin-actions">
      <button onclick="toggleTestMode(event)">🧪 Testmodus: UIT</button>
    </div>

    <div class="admin-actions">
      <button onclick="addLevel()">➕ Nieuwe vraag</button>
    </div>

    <h3>Vragen</h3>
    <div id="adminLevelList" class="admin-list"></div>
    <div id="adminMap" class="admin-map"></div>

    <hr>

    <h3>Google Drive</h3>
    <button id="adminDriveLogin" type="button">🔐 Login Google Drive</button>
    <div id="adminDriveStatus">Niet verbonden</div>
  `;

  const driveLoginBtn = document.getElementById("adminDriveLogin");
  driveLoginBtn.addEventListener("click", requestDriveAuth);

  const listEl = document.getElementById("adminLevelList");
  if (listEl) {
    listEl.addEventListener("click", event => {
      const item = event.target.closest(".admin-list-item");
      if (!item) return;
      const idx = parseInt(item.dataset.index, 10);
      if (Number.isNaN(idx)) return;

      if (event.target.closest(".admin-delete-level")) {
        deleteLevelByIndex(idx);
        return;
      }
      if (event.target.closest(".admin-save-level")) {
        saveLevelByIndex(idx);
        return;
      }
      if (event.target.closest(".admin-use-location")) {
        useCurrentLocationForIndex(idx);
        return;
      }
      if (event.target.closest(".admin-accordion-toggle") || event.target.closest(".admin-list-title") || event.target.closest(".admin-list-header")) {
        toggleLevelOpen(idx);
        return;
      }
    });

    listEl.addEventListener("change", event => {
      if (!event.target.matches("[data-field='questionType']")) return;
      const item = event.target.closest(".admin-list-item");
      if (!item) return;
      updateMediaAcceptForItem(item);
    });

    const startDrag = (target, clientX, clientY) => {
      const handle = target.closest(".admin-drag-handle");
      if (!handle) return false;
      const item = handle.closest(".admin-list-item");
      if (!item) return false;
      dragFromIndex = parseInt(item.dataset.index, 10);
      if (Number.isNaN(dragFromIndex)) return false;
      dragOverIndex = dragFromIndex;
      listEl.classList.add("dragging");
      updateDragOver(clientX, clientY);
      return true;
    };

    const updateDragOver = (clientX, clientY) => {
      const el = document.elementFromPoint(clientX, clientY);
      const item = el?.closest(".admin-list-item");
      if (!item) return;
      const idx = parseInt(item.dataset.index, 10);
      if (Number.isNaN(idx)) return;
      if (dragOverIndex !== null && dragOverIndex !== idx) {
        const prev = listEl.querySelector(`.admin-list-item[data-index="${dragOverIndex}"]`);
        prev?.classList.remove("drag-over");
      }
      dragOverIndex = idx;
      item.classList.add("drag-over");
    };

    const endDrag = () => {
      if (dragFromIndex === null) return;
      const from = dragFromIndex;
      const to = dragOverIndex;
      const prev = listEl.querySelector(`.admin-list-item[data-index="${dragOverIndex}"]`);
      prev?.classList.remove("drag-over");
      dragFromIndex = null;
      dragOverIndex = null;
      listEl.classList.remove("dragging");
      if (to !== null && from !== to) {
        reorderLevels(from, to);
      }
    };

    listEl.addEventListener("pointerdown", event => {
      if (startDrag(event.target, event.clientX, event.clientY)) {
        event.preventDefault();
      }
    });

    listEl.addEventListener("pointermove", event => {
      if (dragFromIndex === null) return;
      updateDragOver(event.clientX, event.clientY);
    });

    listEl.addEventListener("pointerup", endDrag);
    listEl.addEventListener("pointercancel", endDrag);

    listEl.addEventListener("touchstart", event => {
      const touch = event.touches[0];
      if (!touch) return;
      if (startDrag(event.target, touch.clientX, touch.clientY)) {
        event.preventDefault();
      }
    }, { passive: false });

    listEl.addEventListener("touchmove", event => {
      if (dragFromIndex === null) return;
      const touch = event.touches[0];
      if (!touch) return;
      updateDragOver(touch.clientX, touch.clientY);
    });

    listEl.addEventListener("touchend", endDrag);
  }

  initDriveAuth();
  loadAdminFields();
  initAdminMap();
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

function loadAdminFields() {
  if (!adminActive) return;

  const levelIndexEl = document.getElementById("adminLevelIndex");
  if (levelIndexEl) {
    levelIndexEl.innerText = `Level ${currentLevel + 1} / ${levels.length}`;
  }

  const orderStatusEl = document.getElementById("adminOrderStatus");
  if (orderStatusEl) {
    orderStatusEl.innerText = "";
  }

  renderLevelList();
  initAdminMap();
  refreshAdminMap();
}

function updateMediaAcceptForItem(item) {
  const questionType = item.querySelector("[data-field='questionType']")?.value;
  const mediaInput = item.querySelector(".admin-media-file");
  if (!mediaInput) return;
  mediaInput.value = "";

  if (questionType === "photo") {
    mediaInput.accept = "image/*";
  } else if (questionType === "video") {
    mediaInput.accept = "video/*";
  } else {
    mediaInput.accept = "";
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderLevelList() {
  const listEl = document.getElementById("adminLevelList");
  if (!listEl || !levels) return;

  listEl.innerHTML = levels.map((level, index) => {
    const title = (level.questionText || level.question || "Onbekende vraag").trim();
    const shortTitle = title.length > 60 ? `${title.slice(0, 60)}…` : title;
    const activeClass = index === currentLevel ? "active" : "";
    const isOpen = index === openLevelIndex;
    const openClass = isOpen ? "open" : "";
    const bodyClass = isOpen ? "" : "hidden";
    const type = level.type || "text";
    const questionType = level.questionType || "none";
    const arriveMessage = level.arriveMessage || "";
    const notifyMessage = level.notifyMessage || "";
    const mediaInfo = level.mediaUrl ? `Huidige media: ${level.mediaUrl}` : "Geen media";
    const mediaAccept = questionType === "photo"
      ? "image/*"
      : questionType === "video"
        ? "video/*"
        : "";
    const notifyBadge = level.notifyOnArrive ? `<span class="admin-badge">🔔</span>` : "";
    return `
      <div class="admin-list-item ${activeClass} ${openClass}" data-index="${index}">
        <div class="admin-list-header">
          <span class="admin-drag-handle" aria-label="Sleep om te verplaatsen">≡</span>
          <button class="admin-accordion-toggle" type="button">#${index + 1}</button>
          <span class="admin-list-title">${escapeHtml(shortTitle)}</span>
          ${notifyBadge}
        </div>
        <div class="admin-accordion-body ${bodyClass}">
          <label>Vraag</label>
          <input data-field="questionText" type="text" value="${escapeHtml(level.questionText || level.question || "")}">

          <label>Aankomst bericht</label>
          <input data-field="arriveMessage" type="text" value="${escapeHtml(arriveMessage)}">

          <label>
            <input data-field="vibrateOnArrive" type="checkbox" ${level.vibrateOnArrive ? "checked" : ""}>
            Trillen bij aankomst
          </label>

          <label>Notificatie bericht</label>
          <input data-field="notifyMessage" type="text" value="${escapeHtml(notifyMessage)}">

          <label>
            <input data-field="notifyOnArrive" type="checkbox" ${level.notifyOnArrive ? "checked" : ""}>
            Stuur notificatie bij aankomst
          </label>

          <label>Juiste antwoord</label>
          <input data-field="answer" type="text" value="${escapeHtml(level.answer || "")}">

          <label>Type</label>
          <select data-field="type">
            <option value="text" ${type === "text" ? "selected" : ""}>Tekst</option>
            <option value="number" ${type === "number" ? "selected" : ""}>Nummer</option>
            <option value="photo" ${type === "photo" ? "selected" : ""}>Foto</option>
          </select>

          <label>Vraag media</label>
          <select data-field="questionType">
            <option value="none" ${questionType === "none" || questionType === "" ? "selected" : ""}>Geen</option>
            <option value="photo" ${questionType === "photo" ? "selected" : ""}>Foto</option>
            <option value="video" ${questionType === "video" ? "selected" : ""}>Video</option>
          </select>

          <label>Media upload (Drive)</label>
          <input class="admin-media-file" type="file" ${mediaAccept ? `accept="${mediaAccept}"` : ""}>
          <div class="admin-media-info">${escapeHtml(mediaInfo)}</div>

          <label>Latitude</label>
          <input data-field="lat" type="number" step="any" value="${escapeHtml(level.lat ?? "")}">

          <label>Longitude</label>
          <input data-field="lng" type="number" step="any" value="${escapeHtml(level.lng ?? "")}">

          <div class="admin-actions">
            <button class="admin-use-location" type="button">📍 Gebruik huidige locatie</button>
            <button class="admin-save-level" type="button">💾 Opslaan</button>
            <button class="admin-delete-level" type="button">🗑️ Verwijder</button>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

function initAdminMap() {
  const mapEl = document.getElementById("adminMap");
  if (!mapEl || adminMap) return;
  if (!window.L) {
    setTimeout(initAdminMap, 200);
    return;
  }

  adminMap = L.map(mapEl).setView([0, 0], 2);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap"
  }).addTo(adminMap);
}

function refreshAdminMap() {
  if (!adminMap || !levels) return;

  adminMarkers.forEach(marker => marker.remove());
  adminMarkers = [];

  const bounds = [];

  levels.forEach((level, index) => {
    if (typeof level.lat !== "number" || typeof level.lng !== "number") return;
    const color = index === currentLevel ? "#d33" : "#2c7";
    const marker = L.circleMarker([level.lat, level.lng], {
      radius: index === currentLevel ? 8 : 6,
      color,
      weight: 2,
      fillOpacity: 0.6
    }).addTo(adminMap);

    marker.on("click", () => {
      currentLevel = index;
      openLevelIndex = index;
      loadAdminFields();
    });

    adminMarkers.push(marker);
    bounds.push([level.lat, level.lng]);
  });

  if (bounds.length) {
    adminMap.fitBounds(bounds, { padding: [20, 20] });
  }
}

function driveMediaUrl(id, isImage) {
  if (isImage) {
    return `https://drive.google.com/thumbnail?id=${id}&sz=w1200`;
  }
  return `https://drive.google.com/uc?export=download&id=${id}`;
}

async function uploadToDrive(file, questionType) {
  if (!driveToken) {
    throw new Error("Niet ingelogd op Google Drive.");
  }

  const metadata = {
    name: file.name,
    mimeType: file.type || "application/octet-stream",
    parents: [GOOGLE_DRIVE_FOLDER_ID]
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

  const isImage = questionType === "photo" || file.type.startsWith("image/");
  return driveMediaUrl(id, isImage);
}

function setCurrentLevel(index) {
  currentLevel = index;
  loadAdminFields();
}

function toggleLevelOpen(index) {
  openLevelIndex = openLevelIndex === index ? null : index;
  setCurrentLevel(index);
}

async function saveLevelByIndex(index) {
  const listEl = document.getElementById("adminLevelList");
  const item = listEl?.querySelector(`.admin-list-item[data-index="${index}"]`);
  if (!item) return;

  const q = item.querySelector("[data-field='questionText']")?.value.trim() || "";
  const arriveMessage = item.querySelector("[data-field='arriveMessage']")?.value.trim() || "";
  const vibrateOnArrive = !!item.querySelector("[data-field='vibrateOnArrive']")?.checked;
  const notifyMessage = item.querySelector("[data-field='notifyMessage']")?.value.trim() || "";
  const notifyOnArrive = !!item.querySelector("[data-field='notifyOnArrive']")?.checked;
  const a = item.querySelector("[data-field='answer']")?.value.trim() || "";
  const t = item.querySelector("[data-field='type']")?.value || "text";
  const qt = item.querySelector("[data-field='questionType']")?.value || "none";
  const mediaInput = item.querySelector(".admin-media-file");
  const lat = parseFloat(item.querySelector("[data-field='lat']")?.value || "");
  const lng = parseFloat(item.querySelector("[data-field='lng']")?.value || "");

  if (!q || Number.isNaN(lat) || Number.isNaN(lng)) {
    alert("❌ Vraag + geldige locatie verplicht");
    return;
  }

  let mediaUrl = levels[index]?.mediaUrl || "";
  if (qt !== "none" && mediaInput?.files && mediaInput.files.length > 0) {
    const file = mediaInput.files[0];
    try {
      mediaUrl = await uploadToDrive(file, qt);
    } catch (err) {
      alert(`❌ Upload mislukt: ${err.message || err}`);
      return;
    }
  }

  levels[index] = {
    ...levels[index],
    questionText: q,
    arriveMessage,
    vibrateOnArrive,
    notifyMessage,
    notifyOnArrive,
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

  renderLevelList();
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

function useCurrentLocationForIndex(index) {
  if (!navigator.geolocation) {
    alert("❌ GPS niet ondersteund");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    pos => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      const listEl = document.getElementById("adminLevelList");
      const item = listEl?.querySelector(`.admin-list-item[data-index="${index}"]`);
      if (!item) return;
      const latEl = item.querySelector("[data-field='lat']");
      const lngEl = item.querySelector("[data-field='lng']");
      if (latEl) latEl.value = lat.toFixed(6);
      if (lngEl) lngEl.value = lng.toFixed(6);

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
  openLevelIndex = currentLevel;

  await db.collection("games").doc("default").set(
    { levels },
    { merge: true }
  );

  questionShown = false;
  loadAdminFields();
  renderLevelList();

  alert("➕ Nieuw level toegevoegd");
}

async function deleteLevelByIndex(index) {
  if (!adminActive) return;

  if (levels.length <= 1) {
    alert("❌ Minstens 1 level vereist");
    return;
  }

  if (!confirm("Dit level definitief verwijderen?")) return;

  levels.splice(index, 1);

  if (currentLevel >= levels.length) currentLevel = levels.length - 1;
  if (openLevelIndex === index) {
    openLevelIndex = null;
  } else if (openLevelIndex !== null && openLevelIndex > index) {
    openLevelIndex -= 1;
  }

  await db.collection("games").doc("default").set(
    { levels },
    { merge: true }
  );

  questionShown = false;
  loadAdminFields();
  renderLevelList();

  alert("🗑️ Level verwijderd");
}

async function reorderLevels(from, to) {
  const moved = levels.splice(from, 1)[0];
  levels.splice(to, 0, moved);

  if (currentLevel === from) {
    currentLevel = to;
  } else if (from < currentLevel && to >= currentLevel) {
    currentLevel -= 1;
  } else if (from > currentLevel && to <= currentLevel) {
    currentLevel += 1;
  }

  if (openLevelIndex !== null) {
    if (openLevelIndex === from) {
      openLevelIndex = to;
    } else if (from < openLevelIndex && to >= openLevelIndex) {
      openLevelIndex -= 1;
    } else if (from > openLevelIndex && to <= openLevelIndex) {
      openLevelIndex += 1;
    }
  }

  await db.collection("games").doc("default").set(
    { levels },
    { merge: true }
  );

  questionShown = false;
  loadAdminFields();

  const orderStatusEl = document.getElementById("adminOrderStatus");
  if (orderStatusEl) {
    orderStatusEl.innerText = "✅ Volgorde opgeslagen";
  }
}

async function moveLevelUp() {
  if (!adminActive) return;
  if (currentLevel <= 0) return;

  await reorderLevels(currentLevel, currentLevel - 1);
}

async function moveLevelDown() {
  if (!adminActive) return;
  if (currentLevel >= levels.length - 1) return;

  await reorderLevels(currentLevel, currentLevel + 1);
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
