let currentLevel = 0;

const statusEl = document.getElementById("status");
const questionBox = document.getElementById("questionBox");
const questionEl = document.getElementById("question");
const answerInput = document.getElementById("answer");

document.getElementById("submitBtn").onclick = submitAnswer;

navigator.geolocation.watchPosition(pos => {
  const level = levels[currentLevel];
  const d = distanceInMeters(
    pos.coords.latitude,
    pos.coords.longitude,
    level.lat,
    level.lng
  );

  updateMap(
    pos.coords.latitude,
    pos.coords.longitude,
    level.lat,
    level.lng
  );

  if (d < radius) {
    statusEl.innerText = "📍 Locatie bereikt!";
    showQuestion();
  } else {
    statusEl.innerText = `Nog ${Math.round(d)} meter…`;
  }
}, null, { enableHighAccuracy: true });

function showQuestion() {
  questionEl.innerText = levels[currentLevel].question;
  questionBox.classList.remove("hidden");
}

function submitAnswer() {
  questionBox.classList.add("hidden");
  currentLevel++;

  if (currentLevel >= levels.length) {
    statusEl.innerText = "🎉 Finale bereikt!";
    navigator.vibrate(300);
  }
}
