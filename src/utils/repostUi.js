import { REPOST_UI_VARIANT } from "../config/repostUiVariant";
import { sharedPastTense } from "./postShareContext";

export function isRepostVariantA() {
  return REPOST_UI_VARIANT === "A";
}

export function isRepostVariantB() {
  return REPOST_UI_VARIANT === "B";
}

export function isRepostVariantC() {
  return REPOST_UI_VARIANT === "C";
}

export function showRepostHeaderIcon() {
  return isRepostVariantA();
}

export function showRepostEmbedLabel() {
  return isRepostVariantB() || isRepostVariantC();
}

/** Variant B: «Поділилася» / «Поділився»; C: «✨ У стрічку» */
export function getRepostEmbedLabelText(author) {
  if (isRepostVariantB()) {
    return sharedPastTense(author) === "поділилася" ? "Поділилася" : "Поділився";
  }
  if (isRepostVariantC()) return "✨ У стрічку";
  return null;
}
