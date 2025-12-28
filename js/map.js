let map, playerMarker, targetCircle;

function initMap(lat, lng) {
  map = L.map("map").setView([lat, lng], 16);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png")
    .addTo(map);

  playerMarker = L.marker([lat, lng]).addTo(map);
  targetCircle = L.circle([lat, lng], {
    radius,
    color: "green",
    fillOpacity: 0.2
  }).addTo(map);
}

function updateMap(playerLat, playerLng, targetLat, targetLng) {
  if (!map) initMap(playerLat, playerLng);

  playerMarker.setLatLng([playerLat, playerLng]);
  targetCircle.setLatLng([targetLat, targetLng]);
}
