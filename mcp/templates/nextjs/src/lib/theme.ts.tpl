export const THEME_KEY = "__ID__-theme";
export const RAIL_KEY = "__ID__-rail";

export function readStore(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStore(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable: the module still works */
  }
}
