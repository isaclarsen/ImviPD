import { STORAGE_KEY } from "../constants";
import type { SavedReading } from "../types";

export function loadReadings(): SavedReading[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as SavedReading[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveReading(reading: SavedReading): SavedReading[] {
  const current = loadReadings();
  const next = [reading, ...current].slice(0, 25);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    return current;
  }
  return next;
}

export function clearReadings(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage failures in restricted contexts.
  }
}
