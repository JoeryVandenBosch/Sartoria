const developmentUserId = "sartoria-development-user";

export function getDevelopmentCurrentUserId(): string {
  return developmentUserId;
}

export function assertDevelopmentIdentityEnabled(): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "The development identity adapter is disabled in production. Configure an approved authentication adapter.",
    );
  }
}
