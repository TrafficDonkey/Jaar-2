export const THEME_STORAGE_KEY = "theme";

export function getSystemTheme() {
  if (typeof window === "undefined") return "light";
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
}

export function getStoredTheme() {
  if (typeof window === "undefined") return null;
  const value = window.localStorage?.getItem(THEME_STORAGE_KEY);
  return value === "dark" || value === "light" ? value : null;
}

export function getInitialTheme() {
  return getStoredTheme() ?? getSystemTheme();
}

export function applyTheme(theme) {
  const resolvedTheme = theme === "dark" ? "dark" : "light";
  document.documentElement.dataset.theme = resolvedTheme;
  document.documentElement.style.colorScheme = resolvedTheme;
}

export function persistTheme(theme) {
  const resolvedTheme = theme === "dark" ? "dark" : "light";
  window.localStorage?.setItem(THEME_STORAGE_KEY, resolvedTheme);
}

