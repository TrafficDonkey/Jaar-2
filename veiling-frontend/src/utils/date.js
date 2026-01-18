const TIMEZONE_SUFFIX_REGEX = /(Z|[+-]\d{2}:?\d{2})$/i;
const HAS_TIME_REGEX = /T\d{2}:\d{2}/;
const DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export function parseApiDate(value) {
  if (value == null) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const text = String(value).trim();
  if (!text) return null;

  const hasTime = HAS_TIME_REGEX.test(text);
  const hasTimezone = TIMEZONE_SUFFIX_REGEX.test(text);

  let normalized = text;
  if (hasTime && !hasTimezone) {
    // Backend returns UTC without timezone info: assume UTC for correct DST handling.
    normalized = `${text}Z`;
  } else if (!hasTime && DATE_ONLY_REGEX.test(text)) {
    normalized = `${text}T00:00:00`;
  }

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function toTimeMs(value) {
  const date = parseApiDate(value);
  return date ? date.getTime() : Number.NaN;
}

export function formatDateTime(value, locale = "nl-NL") {
  const date = parseApiDate(value);
  if (!date) return "-";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatDate(value, locale = "nl-NL") {
  const date = parseApiDate(value);
  if (!date) return "-";
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
  }).format(date);
}
