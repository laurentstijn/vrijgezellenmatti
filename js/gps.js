const radius = 60;

function distanceInMeters(lat1, lon1, lat2, lon2) {
  return Math.sqrt(
    Math.pow(lat1 - lat2, 2) + Math.pow(lon1 - lon2, 2)
  ) * 111000;
}
