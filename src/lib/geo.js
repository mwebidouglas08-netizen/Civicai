// Geolocation + reverse geocoding.
// Uses the browser Geolocation API plus OpenStreetMap's free Nominatim
// reverse-geocoding service (no API key required) to turn coordinates
// into a human-readable locality + country. Falls back gracefully if
// either is unavailable (offline, permission denied, etc.).

export function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Geolocation not supported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  });
}

/**
 * Reverse geocode coordinates to a locality/country pair using Nominatim.
 * Returns { locality, country, raw } or null on failure.
 */
export async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=14&addressdetails=1`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address || {};
    const locality =
      addr.suburb || addr.neighbourhood || addr.quarter || addr.city_district ||
      addr.town || addr.village || addr.city || addr.county || "";
    const country = addr.country || "";
    return { locality, country, raw: data };
  } catch {
    return null;
  }
}

/** Convert a lat/lng pair into normalized 0-100 x/y for the demo SVG map (Mercator-ish). */
export function coordsToMapXY(lat, lng) {
  const x = ((lng + 180) / 360) * 100;
  const y = ((90 - lat) / 180) * 100;
  return { x: Math.max(1, Math.min(99, x)), y: Math.max(1, Math.min(99, y)) };
}
