import { api, apiPath } from "./api";

const STATUS_TTL_MS = 60_000;
const PREVIEW_BUFFER_MS = 15_000;

let statusCache = null;
const previewCache = new Map();

function unwrap(payload) {
  return payload?.data ?? payload;
}

function isDevPointingAtProduction() {
  const url = String(import.meta.env.VITE_API_URL ?? "");
  return Boolean(import.meta.env.DEV && /onrender\.com/i.test(url));
}

function localApiRequiredError() {
  const error = new Error("EPIDEMIC_SOUND_LOCAL_API_REQUIRED");
  error.code = "EPIDEMIC_SOUND_LOCAL_API_REQUIRED";
  return error;
}

export const epidemicSoundApi = {
  async getStatus() {
    if (isDevPointingAtProduction()) {
      throw localApiRequiredError();
    }

    if (statusCache && statusCache.expiresAt > Date.now()) {
      return statusCache.value;
    }

    const { data } = await api.get(apiPath("/epidemic-sound/status"));
    const status = unwrap(data) || { enabled: false, allowPublish: false };
    statusCache = {
      value: {
        enabled: Boolean(status.enabled),
        allowPublish: Boolean(status.allowPublish),
      },
      expiresAt: Date.now() + STATUS_TTL_MS,
    };
    return statusCache.value;
  },

  async searchTracks(term, { limit = 10, offset = 0 } = {}) {
    if (isDevPointingAtProduction()) {
      throw localApiRequiredError();
    }

    const query = String(term ?? "").trim();
    if (query.length < 2) return [];

    const { data } = await api.get(apiPath("/epidemic-sound/tracks/search"), {
      params: { term: query, limit, offset },
    });
    const payload = unwrap(data);
    return Array.isArray(payload?.tracks) ? payload.tracks : [];
  },

  async getPreview(trackId) {
    const id = String(trackId ?? "").trim();
    if (!id) throw new Error("Missing track id");

    const cached = previewCache.get(id);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const { data } = await api.get(
      apiPath(`/epidemic-sound/tracks/${encodeURIComponent(id)}/preview`),
    );
    const payload = unwrap(data);
    const url = String(payload?.url ?? "").trim();
    if (!url) throw new Error("Preview is unavailable");

    const expiresAt = payload?.expiresAt
      ? Date.parse(payload.expiresAt)
      : Date.now() + 45_000;
    const value = { url, expiresAt: payload?.expiresAt ?? null };
    previewCache.set(id, {
      value,
      expiresAt: Number.isFinite(expiresAt)
        ? expiresAt - PREVIEW_BUFFER_MS
        : Date.now() + 30_000,
    });
    return value;
  },

  clearCaches() {
    statusCache = null;
    previewCache.clear();
  },
};
