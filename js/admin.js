const ADMIN_PIN = "1234";

function initAdmin() {
  const pin = prompt("Admin pincode?");
  if (pin !== ADMIN_PIN) return;

  const panel = document.getElementById("adminPanel");
  panel.classList.remove("hidden");
  panel.innerHTML = "<h2>🔧 Admin actief</h2>";
}
