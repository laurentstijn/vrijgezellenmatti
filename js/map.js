let map, playerMarker, targetCircle;

function initMap(lat, lng, radiusMeters) {
  const effectiveRadius =
    typeof radiusMeters === "number"
      ? radiusMeters
      : (typeof RADIUS_METERS === "number" ? RADIUS_METERS : 50);

  map = L.map("map").setView([lat, lng], 16);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png")
    .addTo(map);

  playerMarker = L.marker([lat, lng]).addTo(map);
  targetCircle = L.circle([lat, lng], {
    radius: effectiveRadius,
    color: "green",
    fillOpacity: 0.2
  }).addTo(map);
}

function updateMap(playerLat, playerLng, targetLat, targetLng) {
  if (!map) initMap(playerLat, playerLng);

  playerMarker.setLatLng([playerLat, playerLng]);
  targetCircle.setLatLng([targetLat, targetLng]);
}
