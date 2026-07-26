const imageVariables = [
  "NODE_IMAGE",
  "POSTGRES_IMAGE",
  "MINIO_IMAGE",
  "MINIO_CLIENT_IMAGE",
  "CLAMAV_IMAGE",
  "CADDY_IMAGE",
];

const immutableDigestPattern = /@sha256:[a-f0-9]{64}$/iu;
const errors = [];

for (const name of imageVariables) {
  const reference = process.env[name]?.trim() ?? "";
  if (!reference) {
    errors.push(`${name} is required.`);
    continue;
  }
  if (!immutableDigestPattern.test(reference)) {
    errors.push(`${name} must end with an immutable @sha256 digest.`);
  }
}

if (errors.length > 0) {
  console.error("Sartoria staging image verification failed:\n");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Sartoria staging image references are digest-pinned.");