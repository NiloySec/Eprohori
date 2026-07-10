import * as Sentry from '@sentry/react-native';

// Paste your Sentry DSN here (Settings → Client Keys (DSN) in your sentry.io
// project). Leaving this empty keeps the SDK disabled — Sentry.init() is a
// safe no-op without a DSN, so the app behaves exactly as before until a
// real DSN is added here.
const SENTRY_DSN = '';

export function initSentry() {
  Sentry.init({
    dsn: SENTRY_DSN,
    enabled: !__DEV__ && SENTRY_DSN.length > 0,
    tracesSampleRate: 0.2,
  });
}

export { Sentry };
