const required = [
  "DATABASE_URL",
  "BETTER_AUTH_URL",
  "BETTER_AUTH_SECRET",
  "MEDIA_S3_BUCKET",
  "MEDIA_S3_REGION",
  "MEDIA_PROCESSING_QUEUE_URL",
  "MEDIA_PROCESSING_QUEUE_TOKEN",
  "MEDIA_WORKER_TOKEN",
  "CLAMAV_HOST",
];

const errors = [];

function value(name) {
  return process.env[name]?.trim() ?? "";
}

for (const name of required) {
  if (!value(name)) errors.push(`${name} is required.`);
}

const deploymentEnvironment = value("SARTORIA_DEPLOYMENT_ENV");
if (!["staging", "production"].includes(deploymentEnvironment)) {
  errors.push("SARTORIA_DEPLOYMENT_ENV must be staging or production.");
}

if (value("SARTORIA_AUTH_MODE") !== "better-auth") {
  errors.push("SARTORIA_AUTH_MODE must be better-auth.");
}
if (value("SARTORIA_PERSISTENCE_MODE") !== "postgres") {
  errors.push("SARTORIA_PERSISTENCE_MODE must be postgres.");
}
if (value("SARTORIA_MEDIA_MODE") !== "production") {
  errors.push("SARTORIA_MEDIA_MODE must be production.");
}

for (const name of ["BETTER_AUTH_SECRET", "MEDIA_PROCESSING_QUEUE_TOKEN", "MEDIA_WORKER_TOKEN"]) {
  if (value(name) && value(name).length < 32) {
    errors.push(`${name} must contain at least 32 characters.`);
  }
}

for (const name of ["BETTER_AUTH_URL", "MEDIA_PROCESSING_QUEUE_URL"]) {
  const raw = value(name);
  if (!raw) continue;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") errors.push(`${name} must use HTTPS.`);
  } catch {
    errors.push(`${name} must be an absolute URL.`);
  }
}

if (value("DATABASE_SSL_MODE") === "disable") {
  const stagingOverride = value("SARTORIA_STAGING_ALLOW_INTERNAL_DB_PLAINTEXT") === "true";
  if (deploymentEnvironment !== "staging" || !stagingOverride) {
    errors.push(
      "DATABASE_SSL_MODE=disable is allowed only for an explicitly approved isolated staging network.",
    );
  }
}
if (
  deploymentEnvironment === "production" &&
  value("SARTORIA_STAGING_ALLOW_INTERNAL_DB_PLAINTEXT") === "true"
) {
  errors.push("SARTORIA_STAGING_ALLOW_INTERNAL_DB_PLAINTEXT cannot be enabled in production.");
}

const bootstrapEnabledValue = value("SARTORIA_OWNER_BOOTSTRAP_ENABLED");
if (bootstrapEnabledValue && !["true", "false"].includes(bootstrapEnabledValue)) {
  errors.push("SARTORIA_OWNER_BOOTSTRAP_ENABLED must be true or false when configured.");
}
const bootstrapEnabled = bootstrapEnabledValue === "true";
const bootstrapToken = value("SARTORIA_OWNER_BOOTSTRAP_TOKEN");
if (bootstrapEnabled) {
  if (deploymentEnvironment !== "staging") {
    errors.push("Owner bootstrap can only be enabled in staging.");
  }
  if (bootstrapToken.length < 64) {
    errors.push("SARTORIA_OWNER_BOOTSTRAP_TOKEN must contain at least 64 characters.");
  }
} else if (bootstrapToken) {
  errors.push("Remove SARTORIA_OWNER_BOOTSTRAP_TOKEN when owner bootstrap is disabled.");
}

const recommendationMode = value("SARTORIA_RECOMMENDATION_MODE") || "fallback";
if (!["fallback", "provider"].includes(recommendationMode)) {
  errors.push("SARTORIA_RECOMMENDATION_MODE must be fallback or provider.");
}
if (recommendationMode === "provider") {
  for (const name of ["RECOMMENDATION_PROVIDER_URL", "RECOMMENDATION_PROVIDER_SECRET"]) {
    if (!value(name)) errors.push(`${name} is required in provider mode.`);
  }
  if (value("RECOMMENDATION_PROVIDER_SECRET") && value("RECOMMENDATION_PROVIDER_SECRET").length < 32) {
    errors.push("RECOMMENDATION_PROVIDER_SECRET must contain at least 32 characters.");
  }
  try {
    if (value("RECOMMENDATION_PROVIDER_URL") && new URL(value("RECOMMENDATION_PROVIDER_URL")).protocol !== "https:") {
      errors.push("RECOMMENDATION_PROVIDER_URL must use HTTPS.");
    }
  } catch {
    errors.push("RECOMMENDATION_PROVIDER_URL must be an absolute URL.");
  }
}

if (errors.length > 0) {
  console.error("Sartoria production environment verification failed:\n");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Sartoria production environment contract is valid.");
