import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const isProduction = process.env.NODE_ENV === "production";

const jwtSecret = required("JWT_SECRET", isProduction ? undefined : "dev-only-insecure-secret-change-me");
if (isProduction && jwtSecret.length < 32) {
  throw new Error("JWT_SECRET is too short for production (need 32+ random characters). Generate with: openssl rand -hex 32");
}

// Comma-separated list of emails that have platform-admin rights.
// Decided from configuration only — never from the database or the API —
// so nobody can promote themselves to admin.
const adminEmails = (process.env.ADMIN_EMAILS ?? process.env.ADMIN_EMAIL ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const env = {
  isProduction,
  adminEmails,
  port: Number(process.env.PORT ?? 4000),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:5173",
  uploadDir: process.env.UPLOAD_DIR ?? "uploads",
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:5173",
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM ?? "Qisma <no-reply@qisma.app>",
  },
};
