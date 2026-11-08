import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const profileSrc = readFileSync(join(root, "Profile.jsx"), "utf8");
const publicSrc = readFileSync(
  join(root, "../../components/Users/Profile/ProfileVisitorPublic/ProfileVisitorPublic.jsx"),
  "utf8",
);
const subscribedSrc = readFileSync(
  join(root, "../../components/Users/Profile/ProfileVisitorSubscribed/ProfileVisitorSubscribed.jsx"),
  "utf8",
);
const vipSrc = readFileSync(
  join(root, "../../components/Users/Profile/ProfileVisitorVip/ProfileVisitorVip.jsx"),
  "utf8",
);

test("visitor report and block are not empty Profile callbacks", () => {
  assert.equal(profileSrc.includes("const onReport = useCallback(() => { }, []);"), false);
  assert.equal(profileSrc.includes("const onBlock = useCallback(() => { }, []);"), false);
  assert.match(profileSrc, /setReportModalOpen\(true\)/);
  assert.match(profileSrc, /usersApi\.blockUser\(userId\)/);
  assert.match(profileSrc, /<ReportUserModal/);
});

test("public, subscribed, and VIP profiles wire the report click", () => {
  assert.match(publicSrc, /onClick=\{onReport\}/);
  assert.match(subscribedSrc, /onClick=\{onReport\}/);
  assert.match(vipSrc, /onClick: onReport/);
});

test("public profile wires block on desktop and in the mobile menu", () => {
  assert.match(publicSrc, /onClick=\{onBlock\}/);
  assert.match(publicSrc, /onBlock\?\.\(\)/);
});
