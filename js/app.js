let currentLevel = 0;
let questionShown = false;
let watchId = null;
let lastDistance = Infinity;
let lastPosition = null;
const notifiedLevels = new Set();
const notifiedNotificationLevels = new Set();
let pendingLevelIndex = null;
let pendingNotificationLevelIndex = null;

const questionMedia = document.getElementById("questionMedia");
const statusEl = document.getElementById("status");
const questionBox = document.getElementById("questionBox");
const questionEl = document.getElementById("question");
const answerInput = document.getElementById("answer");
const photoInput = document.getElementById("photoInput");
const submitBtn = document.getElementById("submitBtn");
const enableNotificationsBtn = document.getElementById("enableNotifications");

statusEl.addEventListener("click", () => {
  if (pendingLevelIndex === null) return;
  if (!lastPosition) return;
  const level = levels[pendingLevelIndex];
  if (!level) return;
  const d = distanceInMeters(
    lastPosition.coords.latitude,
    lastPosition.coords.longitude,
    level.lat,
    level.lng
  );
  if (d > RADIUS_METERS) {
    alert("Je bent nog niet op de locatie");
    return;
  }
  currentLevel = pendingLevelIndex;
  pendingLevelIndex = null;
  showQuestion(levels[currentLevel]);
  statusEl.classList.remove("actionable");
});

if (enableNotificationsBtn) {
  enableNotificationsBtn.addEventListener("click", async () => {
    if (!("Notification" in window)) return;
    try {
      const result = await Notification.requestPermission();
      if (result === "granted") {
        enableNotificationsBtn.classList.add("hidden");
      }
    } catch (_) {
      // Ignore permission errors
    }
  });
}

submitBtn.addEventListener("click", () => submitAnswer(false));
photoInput.addEventListener("change", () => submitAnswer(false));

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(err => {
      console.warn("Service worker registratie mislukt:", err);
    });
  });
}

function updateNotificationUI() {
  if (!enableNotificationsBtn) return;
  if (!("Notification" in window)) {
    enableNotificationsBtn.classList.add("hidden");
    return;
  }
  if (Notification.permission === "granted") {
    enableNotificationsBtn.classList.add("hidden");
  } else {
    enableNotificationsBtn.classList.remove("hidden");
  }
}

async function sendArrivalNotification(level, levelIndex) {
  if (!("Notification" in window)) return false;
  if (Notification.permission !== "granted") return false;
  if (!("serviceWorker" in navigator)) return false;

  const body = level.notifyMessage?.trim() || "Tijd voor een vraagje";
  const reg = await navigator.serviceWorker.ready;
  await reg.showNotification("Vrijgezellen Matti", {
    body,
    tag: `level-${levelIndex}`,
    data: { levelIndex }
  });
  return true;
}

function checkLocationNotifications(pos) {
  if (!levels || !Array.isArray(levels)) return;
  for (let i = 0; i < levels.length; i++) {
    const level = levels[i];
    if (!level || !level.notifyOnArrive) continue;
    if (notifiedNotificationLevels.has(i)) continue;
    if (typeof level.lat !== "number" || typeof level.lng !== "number") continue;

    const d = distanceInMeters(
      pos.coords.latitude,
      pos.coords.longitude,
      level.lat,
      level.lng
    );

    if (d <= RADIUS_METERS) {
      sendArrivalNotification(level, i).catch(() => {});
      notifiedNotificationLevels.add(i);
    }
  }
}

function handleNotificationArrival(levelIndex) {
  if (typeof levelIndex !== "number" || !levels || !levels[levelIndex]) return;
  pendingNotificationLevelIndex = levelIndex;
  statusEl.innerText = "➡️ Ga naar de locatie uit je melding";
}

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.addEventListener("message", event => {
    if (event?.data?.type === "arrival") {
      handleNotificationArrival(event.data.levelIndex);
    }
  });
}

async function loadLevels() {
  const doc = await db.collection("games").doc("default").get();

  if (doc.exists) {
    levels = doc.data().levels;
    console.log("✅ Levels geladen uit Firebase");
  } else {
    await db.collection("games").doc("default").set({ levels });
    console.log("🆕 Levels opgeslagen in Firebase");
  }
}

/* ================= GPS ================= */
function startGPS() {
  if (typeof testMode !== "undefined" && testMode) return;
  watchId = navigator.geolocation.watchPosition(
    onLocation,
    err => statusEl.innerText = "❌ GPS fout",
    { enableHighAccuracy: true }
  );
}

function onLocation(pos) {
  const level = levels[currentLevel];
  if (!level) return;
  lastPosition = pos;

  const d = distanceInMeters(
    pos.coords.latitude,
    pos.coords.longitude,
    level.lat,
    level.lng
  );
  lastDistance = d;

  if (d <= RADIUS_METERS || testMode) {
    if (testMode) {
      statusEl.innerText = "🧪 Testmodus actief (GPS uit)";
      showQuestion(level);
      return;
    }

    if (
      pendingNotificationLevelIndex !== null &&
      pendingNotificationLevelIndex === currentLevel
    ) {
      pendingNotificationLevelIndex = null;
      showQuestion(level);
      return;
    }

    const arriveMessage = level.arriveMessage ? level.arriveMessage.trim() : "";
    if (!notifiedLevels.has(currentLevel)) {
      statusEl.innerText = arriveMessage
        ? `📍 ${arriveMessage} (tik om verder te gaan)`
        : "📍 Locatie bereikt! (tik om verder te gaan)";
      if (level.vibrateOnArrive && navigator.vibrate) {
        navigator.vibrate([200, 100, 200]);
      }
      notifiedLevels.add(currentLevel);
    } else {
      statusEl.innerText = "📍 Locatie bereikt! (tik om verder te gaan)";
    }
    pendingLevelIndex = currentLevel;
    statusEl.classList.add("actionable");
  } else {
    questionShown = false;
    pendingLevelIndex = null;
    statusEl.classList.remove("actionable");
    statusEl.innerText = `Nog ${Math.round(d)} meter…`;
    questionBox.classList.add("hidden");
    questionMedia.classList.add("hidden");
    questionMedia.innerHTML = "";
  }

  checkLocationNotifications(pos);

  if (
    pendingNotificationLevelIndex !== null &&
    levels[pendingNotificationLevelIndex]
  ) {
    const target = levels[pendingNotificationLevelIndex];
    const nd = distanceInMeters(
      pos.coords.latitude,
      pos.coords.longitude,
      target.lat,
      target.lng
    );
    if (nd <= RADIUS_METERS) {
      currentLevel = pendingNotificationLevelIndex;
      pendingNotificationLevelIndex = null;
      showQuestion(target);
    }
  }
}

/* ================= Vragen ================= */
function extractDriveId(url) {
  const fileMatch = url.match(/\/file\/d\/([^/]+)/);
  const idMatch = url.match(/[?&]id=([^&]+)/);
  return (fileMatch && fileMatch[1]) || (idMatch && idMatch[1]) || "";
}

function normalizeMediaUrl(url, mediaType) {
  if (!url) return "";

  if (url.includes("drive.google.com")) {
    const id = extractDriveId(url);
    if (id) {
      if (mediaType === "photo") {
        return `https://drive.google.com/thumbnail?id=${id}&sz=w1200`;
      }
      return `https://drive.google.com/uc?export=download&id=${id}`;
    }
  }

  return url;
}

function showQuestion(level) {
  if (questionShown) return;
  questionShown = true;

  questionBox.classList.remove("hidden");
  questionMedia.classList.add("hidden");
  questionMedia.innerHTML = "";

  const requiresPhoto = level.type === "photo";
  answerInput.classList.toggle("hidden", requiresPhoto);
  submitBtn.classList.toggle("hidden", requiresPhoto);
  photoInput.classList.toggle("hidden", !requiresPhoto);
  photoInput.value = "";

  // Vraagtekst
  questionEl.innerText = level.questionText || level.question || "";

  const mediaUrl = normalizeMediaUrl(level.mediaUrl || "", level.questionType);

  // Media als vraag
  if (level.questionType === "photo" && mediaUrl) {
    questionMedia.innerHTML = `
      <img src="${mediaUrl}" style="max-width:100%; border-radius:8px;">
    `;
    questionMedia.classList.remove("hidden");
  }

  if (level.questionType === "video" && mediaUrl) {
    if (mediaUrl.includes("drive.google.com")) {
      const id = extractDriveId(mediaUrl);
      const previewUrl = id
        ? `https://drive.google.com/file/d/${id}/preview`
        : mediaUrl;
      questionMedia.innerHTML = `
        <iframe src="${previewUrl}" style="width:100%; height:240px; border:0; border-radius:8px;" allow="autoplay"></iframe>
      `;
    } else {
      questionMedia.innerHTML = `
        <video src="${mediaUrl}" controls playsinline style="max-width:100%; border-radius:8px;"></video>
      `;
    }
    questionMedia.classList.remove("hidden");
  }

  answerInput.value = "";
  answerInput.type = level.type === "number" ? "number" : "text";
}

function submitAnswer(force = false) {
  if (!force && !(typeof testMode !== "undefined" && testMode)) {
    if (lastDistance > RADIUS_METERS) {
      alert("Je bent nog niet op de locatie");
      return;
    }
  }

  const level = levels[currentLevel];

  if (level.type === "photo" && !force) {
    if (!photoInput.files || photoInput.files.length === 0) {
      return alert("Neem een foto om verder te gaan");
    }
  }

  if (level.type !== "photo" && !force) {
    const v = answerInput.value.trim().toLowerCase();
    if (!v) return alert("Vul een antwoord in");
    if (level.answer && v !== level.answer.toLowerCase())
      return alert("❌ Fout antwoord");
  }

  questionBox.classList.add("hidden");
  photoInput.classList.add("hidden");
  questionShown = false;
  currentLevel++;

  if (typeof loadAdminFields === "function") loadAdminFields();

  if (currentLevel >= levels.length) {
    statusEl.innerText = "🎉 Klaar!";
    navigator.geolocation.clearWatch(watchId);
    return;
  }

  statusEl.innerText = "➡️ Ga naar de volgende locatie…";
}

/* ================= INIT ================= */
async function init() {
  registerServiceWorker();
  updateNotificationUI();
  await loadLevels();
  initAdmin();
  startGPS();

  const params = new URLSearchParams(window.location.search);
  if (params.get("notify") === "1") {
    const levelIndex = parseInt(params.get("level") || "", 10);
    if (!Number.isNaN(levelIndex)) {
      pendingNotificationLevelIndex = levelIndex;
    }
  }
}

init();
