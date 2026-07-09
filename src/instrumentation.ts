import * as Sentry from "@sentry/nextjs";

export async function register() {
  // No-op until SENTRY_DSN is provided (human task H1.8).
  if (!process.env.SENTRY_DSN) return;

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 0.1,
    enableLogs: true,
  });
}

export const onRequestError = Sentry.captureRequestError;
