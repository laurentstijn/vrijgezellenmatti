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

/* ================================
   GPS
================================ */
function startGPS() {
  if (!navigator.geolocation) {
    statusEl.innerText = "❌ GPS niet ondersteund";
    return;
  }

  watchId = navigator.geolocation.watchPosition(
    onLocation,
    onLocationError,
    { enableHighAccuracy: true }
  );
}

function onLocation(pos) {
  const level = levels[currentLevel];
  if (!level) return;

  const lat = pos.coords.latitude;
  const lng = pos.coords.longitude;

  const d = distanceInMeters(lat, lng, level.lat, level.lng);

  if (d <= RADIUS_METERS) {
    statusEl.innerText = "📍 Locatie bereikt!";
    showQuestion(level);
  } else {
    questionShown = false;
    statusEl.innerText = `Nog ${Math.round(d)} meter…`;
  }
}

function onLocationError(err) {
  statusEl.innerText = "❌ GPS-fout: " + err.message;
}

/* ================================
   Vragen
================================ */
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
  let userAnswer = "";

  // ================================
  // FOTO-level → altijd goed
  // ================================
  if (level.type === "photo") {
    userAnswer = "photo";
  } else {
    userAnswer = answerInput.value.trim().toLowerCase();

    // Leeg antwoord (alleen blokkeren als niet geforceerd)
    if (!force && userAnswer === "") {
      alert("Vul een antwoord in");
      return;
    }

    // Fout antwoord (alleen blokkeren als niet geforceerd)
    if (
      !force &&
      level.answer &&
      userAnswer !== level.answer.toString().toLowerCase()
    ) {
      alert("❌ Fout antwoord, probeer opnieuw");
      return;
    }
  }

  // ================================
  // Correct of geforceerd → verder
  // ================================
  questionBox.classList.add("hidden");
  questionShown = false;

  navigator.vibrate?.(200);

  currentLevel++;

  // Admin-form syncen (als admin actief is)
  if (typeof loadAdminFields === "function") {
    loadAdminFields();
  }

  // ================================
  // Einde spel?
  // ================================
  if (currentLevel >= levels.length) {
    statusEl.innerText = "🎉 Klaar!";
    return;
  }

  statusEl.innerText = "➡️ Ga naar de volgende locatie…";
}


photoInput.addEventListener("change", () => submitAnswer(false));

/* ================================
   INIT
================================ */
async function init() {
  await loadLevels();
  initAdmin();
  startGPS();
}

init();
