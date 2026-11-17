// The light / dark choice. It lives on the device (localStorage) and is applied by a tiny script in the
// page head before the first paint, so there is no flash.
export type ThemeChoice = "system" | "light" | "dark";
export const THEME_KEY = "milim-theme";
export const THEME_EVENT = "milim-theme-change";

export function readTheme(): ThemeChoice {
  const t = typeof document === "undefined" ? "dark" : document.documentElement.dataset.theme;
  return t === "light" || t === "system" ? t : "dark";
}

export function applyTheme(choice: ThemeChoice) {
  document.documentElement.dataset.theme = choice;
  try {
    localStorage.setItem(THEME_KEY, choice);
  } catch {
    // Private mode etc.: the choice still applies until the page is closed.
  }
  window.dispatchEvent(new Event(THEME_EVENT));
}
