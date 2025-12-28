const ADMIN_PIN = "1234";
let adminActive = false;

function initAdmin() {
  const params = new URLSearchParams(window.location.search);
  if (params.get("admin") !== "1") return;

  const pin = prompt("Admin pincode?");
  if (pin !== ADMIN_PIN) {
    alert("Verkeerde pincode");
    return;
  }

  adminActive = true;

  const panel = document.getElementById("adminPanel");
  panel.classList.remove("hidden");

  panel.innerHTML = `
    <h2>🔧 Admin</h2>
    <button onclick="forceCorrect()">Forceer goed</button>
  `;
}

function forceCorrect() {
  submitAnswer(true);
}
