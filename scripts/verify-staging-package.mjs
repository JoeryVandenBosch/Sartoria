import { readFile } from "node:fs/promises";

const files = Object.fromEntries(
  await Promise.all(
    [
      "Dockerfile",
      ".gitignore",
      ".dockerignore",
      "deploy/staging/compose.yml",
      "deploy/staging/.env.example",
      "deploy/staging/staging.env.example",
    ].map(async (path) => [path, await readFile(path, "utf8")]),
  ),
);

const errors = [];

function requireText(path, text, reason) {
  if (!files[path]?.includes(text)) errors.push(`${path}: ${reason}`);
}

function rejectPattern(path, pattern, reason) {
  if (pattern.test(files[path] ?? "")) errors.push(`${path}: ${reason}`);
}

requireText("Dockerfile", "ARG NODE_IMAGE", "NODE_IMAGE must be an explicit build input.");
requireText("Dockerfile", "FROM ${NODE_IMAGE} AS base", "the build base must use NODE_IMAGE.");
requireText("Dockerfile", "FROM ${NODE_IMAGE} AS runtime", "the runtime base must use NODE_IMAGE.");
rejectPattern("Dockerfile", /^FROM\s+node:/imu, "floating hard-coded Node base images are forbidden.");

requireText(
  "deploy/staging/compose.yml",
  "NODE_IMAGE: ${NODE_IMAGE:?Set NODE_IMAGE to an approved immutable image reference}",
  "all application builds must receive NODE_IMAGE.",
);
requireText("deploy/staging/compose.yml", "networks: [data]", "data-only services require the internal data network.");
requireText("deploy/staging/compose.yml", "networks: [edge, data]", "application-facing services require segmented networks.");
requireText("deploy/staging/compose.yml", "internal: true", "the data network must be internal.");

for (const path of [".gitignore", ".dockerignore"]) {
  requireText(path, "deploy/staging/staging.env", "staging.env must be excluded.");
  requireText(path, "deploy/staging/minio-cors.xml", "operator-generated CORS policy must be excluded.");
  requireText(path, "staging-evidence-*.json", "staging evidence must be excluded.");
}

requireText("deploy/staging/.env.example", "NODE_IMAGE=", "the Node image input must be documented.");
requireText(
  "deploy/staging/staging.env.example",
  "SARTORIA_OWNER_BOOTSTRAP_ENABLED=false",
  "identity bootstrap must default to disabled.",
);
rejectPattern(
  "deploy/staging/staging.env.example",
  /^SARTORIA_OWNER_BOOTSTRAP_TOKEN=.+$/imu,
  "the bootstrap token must not have a template value.",
);

if (errors.length > 0) {
  console.error("Sartoria staging package verification failed:\n");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Sartoria staging package repository contract is valid.");