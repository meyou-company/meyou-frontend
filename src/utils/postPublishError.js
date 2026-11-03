/**
 * Upload and POST /posts share one composer catch. Label the toast by phase
 * so a create 500 is not shown as a file-upload failure.
 */
export function getPostPublishFailureToast({
  phase,
  details,
  videoMessage,
  t,
}) {
  if (videoMessage) return videoMessage;
  if (phase === "upload" && details) {
    return `${t("posts.toast.editMediaUploadFileFailed")}: ${details}`;
  }
  return details || t("posts.toast.publishFailed");
}
