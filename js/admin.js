function initAdmin() {
  const pin = prompt("Admin pincode?");
  if (pin !== "1234") return;

  const panel = document.getElementById("adminPanel");
  panel.classList.remove("hidden");
  panel.innerHTML = "<h2>🔧 Admin actief</h2>";
}
