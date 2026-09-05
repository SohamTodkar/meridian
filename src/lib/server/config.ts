export function serverConfig() {
  const databaseUrl = process.env.DATABASE_URL;
  // A development database is never allowed on a Vercel deployment.
  const development =
    !process.env.VERCEL &&
    (process.env.NODE_ENV === "development" ||
      process.env.MERIDIAN_DEV_STORAGE === "true");
  const passwordHash = process.env.MERIDIAN_PASSWORD_HASH;
  const sessionSecret = process.env.MERIDIAN_SESSION_SECRET;
  const authConfigured = Boolean(
    passwordHash &&
    /^[a-f0-9]{32}:[a-f0-9]{128}$/.test(passwordHash) &&
    sessionSecret &&
    sessionSecret.length >= 32
  );
  return {
    databaseUrl,
    development,
    passwordHash,
    sessionSecret,
    authConfigured,
    ready: Boolean((databaseUrl && authConfigured) || development),
    storage: databaseUrl
      ? ("postgres" as const)
      : development
        ? ("development" as const)
        : ("unconfigured" as const),
  };
}
