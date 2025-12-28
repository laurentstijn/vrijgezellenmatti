function initAdmin() {
  const params = new URLSearchParams(window.location.search);
  const isAdmin = params.get("admin") === "1";

  if (!isAdmin) return;

  const panel = document.getElementById("adminPanel");
  panel.classList.remove("hidden");

  panel.innerHTML = `
    <h2>🔧 Admin</h2>
    <p>Admin-modus actief</p>
    <button onclick="forceCorrect()">Forceer juiste antwoord</button>
  `;
}

function forceCorrect() {
  alert("Admin: antwoord geforceerd");
  submitAnswer();
}
