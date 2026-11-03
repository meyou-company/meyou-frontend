// Coordinates remain in source-video space, before preview mirroring.
export function getStoryFaceRegions(landmarks) {
  if (!landmarks?.[454]) return null;
  const point = (index) => [landmarks[index].x, 1 - landmarks[index].y];
  const left = point(234);
  const right = point(454);
  const top = point(10);
  const bottom = point(152);
  const width = Math.max(0.02, Math.hypot(right[0] - left[0], right[1] - left[1]));
  const height = Math.max(0.02, Math.hypot(top[0] - bottom[0], top[1] - bottom[1]));
  return {
    face: [(left[0] + right[0]) / 2, (top[1] + bottom[1]) / 2, width * 0.52, height * 0.5],
    leftEye: point(159),
    rightEye: point(386),
    mouth: point(13),
  };
}
