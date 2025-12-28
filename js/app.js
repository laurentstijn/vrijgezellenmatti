let currentLevel = 0;
let questionShown = false;

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

  if (level.type !== "photo") {
    userAnswer = answerInput.value.trim().toLowerCase();

    if (!force && !userAnswer) {
      alert("Vul een antwoord in");
      return;
    }

    if (
      !force &&
      level.answer &&
      userAnswer !== level.answer.toLowerCase()
    ) {
      alert("Fout antwoord");
      return;
    }
  }

  questionBox.classList.add("hidden");
  questionShown = false;
  currentLevel++;

  if (currentLevel >= levels.length) {
    statusEl.innerText = "🎉 Klaar!";
    return;
  }

  statusEl.innerText = "➡️ Ga naar de volgende locatie…";
}

photoInput.addEventListener("change", () => submitAnswer(false));

async function init() {
  await loadLevels();
  initAdmin();
  statusEl.innerText = "📍 Klaar om te starten";
}

init();
