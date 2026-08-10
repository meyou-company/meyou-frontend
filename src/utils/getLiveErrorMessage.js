import { i18n } from "../i18n";
import { getApiErrorCode } from "./getApiErrorMessage";

const LIVE_ERROR_HINTS = [
  {
    key: "liveErrors.ended",
    codes: ["LIVE_STREAM_ENDED", "STREAM_ENDED", "LIVE_ENDED"],
    pattern: /(stream|live|эфир|ефір).*(ended|finished|closed|заверш|законч|закінч)/i,
  },
  {
    key: "liveErrors.notStarted",
    codes: ["LIVE_STREAM_NOT_STARTED", "STREAM_NOT_STARTED", "LIVE_NOT_STARTED"],
    pattern: /(not started|hasn't started|has not started|ещ[её] не нач|не начался|ще не поч|не розпоч)/i,
  },
  {
    key: "liveErrors.alreadyLive",
    codes: ["LIVE_STREAM_ALREADY_LIVE", "STREAM_ALREADY_LIVE", "ALREADY_LIVE"],
    pattern: /(already live|already started|уже.*(ид[её]т|запущ)|вже.*(трива|запущ))/i,
  },
  {
    key: "liveErrors.noConnection",
    codes: ["LIVE_CONNECTION_ERROR", "LIVEKIT_CONNECTION_ERROR"],
    pattern: /(no connection|not connected|connect.*(stream|live)|подключ.*эфир|підключ.*ефір|livekit)/i,
  },
];

function errorText(error) {
  const payload = error?.response?.data ?? error?.data ?? error;
  const values = [
    payload?.message,
    payload?.error,
    error?.message,
  ].flat().filter((value) => typeof value === "string");
  return values.join(" ");
}

export function getLiveErrorMessage(error, fallbackKey = "liveErrors.generic") {
  const code = getApiErrorCode(error);
  const text = errorText(error);
  const status = Number(error?.response?.status ?? error?.status ?? error?.statusCode);

  if (status === 410) return i18n.t("liveErrors.ended");

  const hint = LIVE_ERROR_HINTS.find(
    (item) => item.codes.includes(code) || item.pattern.test(text),
  );
  if (hint) return i18n.t(hint.key);

  if (code === "NETWORK_ERROR") return i18n.t("errors.NETWORK_ERROR");
  if (code && i18n.exists(`errors.${code}`) && code !== "VALIDATION_ERROR") {
    return i18n.t(`errors.${code}`);
  }

  return i18n.t(fallbackKey);
}
