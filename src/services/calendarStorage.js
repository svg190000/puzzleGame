import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@puzzle_calendar_images';

/**
 * @typedef {Object} CalendarImage
 * @property {string} id
 * @property {string|null} assetId
 * @property {string|null} uri - fallback when assetId not available (e.g. Android)
 * @property {string[]} labels - label IDs
 * @property {string} date - YYYY-MM-DD
 */

function generateId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

async function getAllEntries() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('calendarStorage getAllEntries:', e);
    return [];
  }
}

async function setAllEntries(entries) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {
    console.error('calendarStorage setAllEntries:', e);
  }
}

/**
 * @param {{ assetId?: string, uri?: string, labels?: string[], date: string }} params - at least one of assetId or uri
 * @returns {Promise<CalendarImage>}
 */
export async function addCalendarImage({ assetId, uri, labels = [], date }) {
  if (!assetId && !uri) return null;
  const id = generateId();
  const entry = { id, assetId: assetId || null, uri: uri || null, labels, date };
  const entries = await getAllEntries();
  entries.push(entry);
  await setAllEntries(entries);
  return entry;
}

/**
 * @param {string} startDate - YYYY-MM-DD
 * @param {string} endDate - YYYY-MM-DD
 * @returns {Promise<CalendarImage[]>}
 */
export async function getCalendarImages(startDate, endDate) {
  const entries = await getAllEntries();
  return entries.filter((e) => e.date >= startDate && e.date <= endDate);
}

/**
 * Get all calendar images (no date filter).
 * @returns {Promise<CalendarImage[]>}
 */
export async function getAllCalendarImages() {
  return getAllEntries();
}

/**
 * @param {string} id
 */
export async function deleteCalendarImage(id) {
  const entries = await getAllEntries();
  const next = entries.filter((e) => e.id !== id);
  await setAllEntries(next);
}

/**
 * Batch delete by ids. Single read/write so multi-select stays in sync.
 * @param {string[]} ids
 */
export async function deleteCalendarImages(ids) {
  if (!ids.length) return;
  const idSet = new Set(ids);
  const entries = await getAllEntries();
  const next = entries.filter((e) => !idSet.has(e.id));
  await setAllEntries(next);
}

/**
 * @param {string} id
 * @param {{ labels?: string[], date?: string }} updates
 */
export async function updateCalendarImage(id, { labels, date }) {
  const entries = await getAllEntries();
  const idx = entries.findIndex((e) => e.id === id);
  if (idx === -1) return;
  if (labels !== undefined) entries[idx].labels = labels;
  if (date !== undefined) entries[idx].date = date;
  await setAllEntries(entries);
}

/**
 * Batch update multiple entries (e.g. move many to same date, or set label on many). Single read/write.
 * @param {{ id: string, date?: string, labels?: string[] }[]} updates
 */
export async function updateCalendarImages(updates) {
  if (!updates.length) return;
  const entries = await getAllEntries();
  const byId = new Map(entries.map((e) => [e.id, e]));
  for (const { id, date, labels } of updates) {
    const entry = byId.get(id);
    if (!entry) continue;
    if (date !== undefined) entry.date = date;
    if (labels !== undefined) entry.labels = labels;
  }
  await setAllEntries(entries);
}
