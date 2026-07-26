import { writeFile } from "node:fs/promises";

function required(name) {
  const result = process.env[name]?.trim();
  if (!result) throw new Error(`${name} is required.`);
  return result;
}

function httpsUrl(name) {
  const url = new URL(required(name));
  if (url.protocol !== "https:") throw new Error(`${name} must use HTTPS.`);
  return url;
}

async function request(url, init = {}) {
  return fetch(url, {
    ...init,
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
}

async function expectJsonStatus(baseUrl, path, expectedStatus, expectedBodyStatus) {
  const response = await request(new URL(path, baseUrl));
  if (response.status !== expectedStatus) {
    throw new Error(`${path} returned HTTP ${response.status}; expected ${expectedStatus}.`);
  }
  const body = await response.json();
  if (body?.status !== expectedBodyStatus) {
    throw new Error(`${path} returned an unexpected status body.`);
  }
  return { path, httpStatus: response.status, status: body.status };
}

const applicationUrl = httpsUrl("STAGING_BASE_URL");
const storageUrl = httpsUrl("STAGING_STORAGE_URL");
const bucket = required("STAGING_MEDIA_BUCKET");
const bootstrapExpectation = process.env.STAGING_EXPECT_BOOTSTRAP?.trim() || "disabled";
if (!["enabled", "disabled"].includes(bootstrapExpectation)) {
  throw new Error("STAGING_EXPECT_BOOTSTRAP must be enabled or disabled.");
}

const evidence = {
  checkedAt: new Date().toISOString(),
  commit: process.env.STAGING_COMMIT_SHA?.trim() || null,
  applicationOrigin: applicationUrl.origin,
  storageOrigin: storageUrl.origin,
  checks: [],
};

evidence.checks.push(await expectJsonStatus(applicationUrl, "/api/health/live", 200, "live"));
evidence.checks.push(await expectJsonStatus(applicationUrl, "/api/health/ready", 200, "ready"));

const home = await request(applicationUrl);
if (home.status !== 200) throw new Error(`Application root returned HTTP ${home.status}.`);
if (!home.headers.get("strict-transport-security")?.includes("max-age=")) {
  throw new Error("Application response is missing Strict-Transport-Security.");
}
if (home.headers.get("x-content-type-options") !== "nosniff") {
  throw new Error("Application response is missing X-Content-Type-Options: nosniff.");
}
if (home.headers.get("server")) {
  throw new Error("Application response exposes a Server header.");
}
evidence.checks.push({
  path: "/",
  httpStatus: home.status,
  hsts: true,
  nosniff: true,
  serverHeaderHidden: true,
});

const bootstrap = await request(new URL("/api/internal/bootstrap-owner", applicationUrl), {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: "{}",
});
const expectedBootstrapStatus = bootstrapExpectation === "enabled" ? 401 : 404;
if (bootstrap.status !== expectedBootstrapStatus) {
  throw new Error(
    `Owner bootstrap returned HTTP ${bootstrap.status}; expected ${expectedBootstrapStatus}.`,
  );
}
evidence.checks.push({
  path: "/api/internal/bootstrap-owner",
  httpStatus: bootstrap.status,
  expectedState: bootstrapExpectation,
});

const publicBucket = await request(new URL(`${encodeURIComponent(bucket)}/`, storageUrl));
if (![403, 404].includes(publicBucket.status)) {
  throw new Error(`Anonymous bucket request returned HTTP ${publicBucket.status}; expected 403 or 404.`);
}
evidence.checks.push({
  path: `storage/${bucket}`,
  httpStatus: publicBucket.status,
  anonymousReadBlocked: true,
});

const evidencePath = process.env.STAGING_EVIDENCE_FILE?.trim();
if (evidencePath) {
  await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
}

console.log(JSON.stringify(evidence, null, 2));
