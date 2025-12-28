let currentLevel = 0;
let questionShown = false;
let watchId = null;

const statusEl = document.getElementById("status");
const questionBox = document.getElementById("questionBox");
const questionEl = document.getElementById("question");
const answerInput = document.getElementById("answer");
const photoInput = document.getElementById("photoInput");
const submitBtn = document.getElementById("submitBtn");

submitBtn.addEventListener("click", () => submitAnswer(false));
photoInput.addEventListener("change", () => submitAnswer(false));

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

  if (d <= RADIUS_METERS) {
    statusEl.innerText = "📍 Locatie bereikt!";
    showQuestion(level);
  } else {
    questionShown = false;
    statusEl.innerText = `Nog ${Math.round(d)} meter…`;
  }
}

/* ================= Vragen ================= */
function showQuestion(level) {
  if (questionShown) return;
  questionShown = true;

  questionEl.innerText = level.question;
  questionBox.classList.remove("hidden");
  answerInput.value = "";

  if (level.type === "photo") {
    answerInput.classList.add("hidden");
    photoInput.classList.remove("hidden");
    photoInput.click();
  } else {
    photoInput.classList.add("hidden");
    answerInput.classList.remove("hidden");
    answerInput.type = level.type === "number" ? "number" : "text";
  }
}

function submitAnswer(force = false) {
  const level = levels[currentLevel];

  if (level.type !== "photo" && !force) {
    const v = answerInput.value.trim().toLowerCase();
    if (!v) return alert("Vul een antwoord in");
    if (level.answer && v !== level.answer.toLowerCase())
      return alert("❌ Fout antwoord");
  }

  questionBox.classList.add("hidden");
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
  await loadLevels();
  initAdmin();
  startGPS();
}

init();
