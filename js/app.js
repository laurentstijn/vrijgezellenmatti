let currentLevel = 0;
let questionShown = false;
let watchId = null;

const questionMedia = document.getElementById("questionMedia");
const statusEl = document.getElementById("status");
const questionBox = document.getElementById("questionBox");
const questionEl = document.getElementById("question");
const answerInput = document.getElementById("answer");
const photoInput = document.getElementById("photoInput");
const submitBtn = document.getElementById("submitBtn");

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

  const d = distanceInMeters(
    pos.coords.latitude,
    pos.coords.longitude,
    level.lat,
    level.lng
  );

  if (d <= RADIUS_METERS || testMode) {
    statusEl.innerText = "📍 Locatie bereikt!";
    showQuestion(level);
  } else {
    questionShown = false;
    statusEl.innerText = `Nog ${Math.round(d)} meter…`;
  }
}

/* ================= Vragen ================= */
function normalizeMediaUrl(url, mediaType) {
  if (!url) return "";

  if (url.includes("drive.google.com")) {
    const fileMatch = url.match(/\/file\/d\/([^/]+)/);
    const idMatch = url.match(/[?&]id=([^&]+)/);
    const id = (fileMatch && fileMatch[1]) || (idMatch && idMatch[1]);
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
    questionMedia.innerHTML = `
      <video src="${mediaUrl}" controls playsinline style="max-width:100%; border-radius:8px;"></video>
    `;
    questionMedia.classList.remove("hidden");
  }

  answerInput.value = "";
  answerInput.type = level.type === "number" ? "number" : "text";
}

function submitAnswer(force = false) {
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
  await loadLevels();
  initAdmin();
  startGPS();
}

init();
