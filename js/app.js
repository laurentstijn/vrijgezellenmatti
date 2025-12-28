async function loadLevels() {
  const doc = await db.collection("games").doc("default").get();

  if (doc.exists) {
    levels = doc.data().levels;
    console.log("Levels geladen uit Firebase");
  } else {
    // Eerste keer: initieel opslaan
    await db.collection("games").doc("default").set({ levels });
    console.log("Levels opgeslagen in Firebase");
  }
}

// ================================
// App state
// ================================
let currentLevel = 0;
let questionShown = false;

// ================================
// DOM elementen
// ================================
const statusEl = document.getElementById("status");
const questionBox = document.getElementById("questionBox");
const questionEl = document.getElementById("question");
const answerInput = document.getElementById("answer");
const photoInput = document.getElementById("photoInput");
const submitBtn = document.getElementById("submitBtn");

// ================================
// Init
// ================================
statusEl.innerText = "Zoek de startlocatie…";

submitBtn.addEventListener("click", submitAnswer);

// ================================
// GPS tracking
// ================================
navigator.geolocation.watchPosition(
  onLocationUpdate,
  onLocationError,
  {
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 10000
  }
);

// ================================
// GPS callback
// ================================
function onLocationUpdate(pos) {
  const level = levels[currentLevel];
  if (!level) return;

  const playerLat = pos.coords.latitude;
  const playerLng = pos.coords.longitude;

  const d = distanceInMeters(
    playerLat,
    playerLng,
    level.lat,
    level.lng
  );

  // Update kaart
  updateMap(playerLat, playerLng, level.lat, level.lng);

  // DEBUG (mag je laten staan of later verwijderen)
  console.log(
    `Afstand: ${Math.round(d)} m | Jij: ${playerLat},${playerLng} | Doel: ${level.lat},${level.lng}`
  );

  if (d <= radius) {
    statusEl.innerText = "📍 Locatie bereikt!";
    showQuestion(level);
  } else {
    questionShown = false;
    statusEl.innerText = `Nog ${Math.round(d)} meter…`;
  }
}

// ================================
// GPS error
// ================================
function onLocationError(err) {
  statusEl.innerText = "❌ GPS-fout: " + err.message;
}

// ================================
// Vraag tonen
// ================================
function showQuestion(level) {
  if (questionShown) return;

  questionShown = true;
  questionEl.innerText = level.question;
  questionBox.classList.remove("hidden");

  // Reset
  answerInput.value = "";

  // FOTO-opdracht
  if (level.type === "photo") {
    answerInput.classList.add("hidden");
    photoInput.classList.remove("hidden");
    photoInput.click();
    return;
  }

  // TEKST-vraag
  if (level.type === "text") {
    answerInput.type = "text";
    answerInput.placeholder = "Typ je antwoord";
    answerInput.classList.remove("hidden");
    photoInput.classList.add("hidden");
    return;
  }

  // CIJFER-vraag (default)
  if (level.type === "number") {
    answerInput.type = "number";
    answerInput.placeholder = "Antwoord (cijfer)";
    answerInput.classList.remove("hidden");
    photoInput.classList.add("hidden");
    return;
  }
}

// ================================
// Antwoord verwerken
// ================================
function submitAnswer(force = false) {
  const level = levels[currentLevel];
  let userAnswer = "";

  // FOTO → altijd goed
  if (level.type === "photo") {
    userAnswer = "photo";
  } 
  else {
    userAnswer = answerInput.value.trim().toLowerCase();

    // ❌ Alleen blokkeren als NIET geforceerd
    if (!force && userAnswer === "") {
      alert("Vul een antwoord in");
      return;
    }

    // ❌ Alleen controleren als NIET geforceerd
    if (
      !force &&
      level.answer &&
      userAnswer !== level.answer.toString().toLowerCase()
    ) {
      alert("❌ Dat is niet juist, probeer opnieuw");
      return;
    }
  }

  // ✅ CORRECT (of geforceerd)
  questionBox.classList.add("hidden");
  questionShown = false;

  navigator.vibrate?.(200);

  currentLevel++;

  if (currentLevel >= levels.length) {
    statusEl.innerText = "🎉 Finale bereikt!";
    return;
  }

  statusEl.innerText = "➡️ Ga naar de volgende locatie…";
}


// ================================
// Foto-opdracht afronden
// ================================
photoInput.addEventListener("change", () => {
  alert("📸 Foto opgeslagen!");
  submitAnswer();
});

initAdmin();

