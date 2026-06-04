/**
 * Browser geolocation + reverse geocoding for post location (frontend only).
 */

function pickAddressPart(address, keys) {
  if (!address || typeof address !== "object") return "";
  for (const key of keys) {
    const v = address[key];
    if (v && typeof v === "string") return v.trim();
  }
  return "";
}

/** "Prague, Czech Republic" from Photon / Nominatim payloads. */
export function formatReverseGeocodeResult(data) {
  if (!data || typeof data !== "object") return "";

  const props = data.properties ?? data.address ?? data;
  if (props && typeof props === "object") {
    const city = pickAddressPart(props, [
      "city",
      "town",
      "village",
      "municipality",
      "locality",
      "county",
      "state",
      "name",
    ]);
    const country = pickAddressPart(props, ["country"]);
    const label = [city, country].filter(Boolean).join(", ");
    if (label) return label;
  }

  const display = data.display_name ?? data.name;
  if (typeof display === "string" && display.trim()) {
    const parts = display.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length >= 2) return `${parts[0]}, ${parts[parts.length - 1]}`;
    return parts[0] ?? "";
  }

  return "";
}

export function getCurrentCoordinates() {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(Object.assign(new Error("Geolocation unsupported"), { code: 0 }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      (err) => reject(err),
      {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 120000,
      }
    );
  });
}

async function reverseGeocodePhoton(lat, lon) {
  const url = new URL("https://photon.komoot.io/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error("Photon reverse geocode failed");

  const data = await res.json();
  const feature = Array.isArray(data?.features) ? data.features[0] : null;
  return formatReverseGeocodeResult(feature ?? data);
}

async function reverseGeocodeNominatim(lat, lon) {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lon));
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");

  const res = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "Accept-Language": "en",
    },
  });
  if (!res.ok) throw new Error("Nominatim reverse geocode failed");

  const data = await res.json();
  return formatReverseGeocodeResult(data);
}

/** Coordinates → readable "City, Country". */
export async function reverseGeocodeCoordinates({ latitude, longitude }) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return "";

  try {
    const fromPhoton = await reverseGeocodePhoton(lat, lon);
    if (fromPhoton) return fromPhoton;
  } catch {
    /* try fallback */
  }

  try {
    return (await reverseGeocodeNominatim(lat, lon)) || "";
  } catch {
    return "";
  }
}

/** Silent on permission denied; returns label or empty string. */
export async function detectCurrentLocationLabel() {
  try {
    const coords = await getCurrentCoordinates();
    return (await reverseGeocodeCoordinates(coords)) || "";
  } catch (err) {
    if (err?.code === 1) return "";
    return "";
  }
}
