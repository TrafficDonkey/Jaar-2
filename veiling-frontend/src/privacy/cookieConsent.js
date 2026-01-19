export const CONSENT_STORAGE_KEY = "floraflow.cookieConsent";
export const CONSENT_VERSION = 1;

function isBoolean(value) {
  return value === true || value === false;
}

export function normalizeConsent(raw) {
  if (!raw || typeof raw !== "object") return null;
  const version = Number(raw.version);
  if (!Number.isFinite(version) || version !== CONSENT_VERSION) return null;

  const analytics = raw.analytics;
  const marketing = raw.marketing;
  if (!isBoolean(analytics) || !isBoolean(marketing)) return null;

  return {
    version: CONSENT_VERSION,
    necessary: true,
    analytics,
    marketing,
    updatedAt:
      typeof raw.updatedAt === "string" && raw.updatedAt ? raw.updatedAt : new Date().toISOString(),
  };
}

export function readConsent() {
  try {
    const text = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!text) return null;
    const parsed = JSON.parse(text);
    return normalizeConsent(parsed);
  } catch {
    return null;
  }
}

export function writeConsent(consent) {
  const normalized = normalizeConsent(consent) ?? null;
  if (!normalized) return;
  window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent("floraflow:consent:update", { detail: normalized }));
}

export function getDefaultConsent() {
  return {
    version: CONSENT_VERSION,
    necessary: true,
    analytics: false,
    marketing: false,
    updatedAt: new Date().toISOString(),
  };
}

export function setConsent({ analytics, marketing }) {
  writeConsent({
    version: CONSENT_VERSION,
    necessary: true,
    analytics: Boolean(analytics),
    marketing: Boolean(marketing),
    updatedAt: new Date().toISOString(),
  });
}

export function acceptAll() {
  setConsent({ analytics: true, marketing: true });
}

export function rejectAll() {
  setConsent({ analytics: false, marketing: false });
}

export function hasConsentChoice() {
  return Boolean(readConsent());
}

