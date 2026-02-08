import React, { createContext, useContext, useState, useMemo, useCallback, useEffect, useRef } from 'react';
import syncService from '../services/SyncService';
import * as calendarStorage from '../services/calendarStorage';

const CalendarContext = createContext(null);

export function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const DEFAULT_LABELS = [
  { id: '1', color: '#E53935', name: 'Important' },
  { id: '2', color: '#43A047', name: 'Family' },
  { id: '3', color: '#1E88E5', name: 'Travel' },
  { id: '4', color: '#FF9800', name: 'Work' },
];

function entriesToImagesByDate(entries) {
  const byDate = {};
  entries.forEach((e) => {
    if (!byDate[e.date]) byDate[e.date] = [];
    byDate[e.date].push({
      id: e.id,
      assetId: e.assetId || null,
      uri: e.uri || null,
      labelId: e.labels && e.labels[0] ? e.labels[0] : null,
      labels: e.labels || [],
    });
  });
  return byDate;
}

export function CalendarProvider({ children }) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());
  const [calendarEntries, setCalendarEntries] = useState([]);
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [labels, setLabels] = useState(DEFAULT_LABELS);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const initialLoadDone = useRef(false);

  const imagesByDate = useMemo(() => entriesToImagesByDate(calendarEntries), [calendarEntries]);

  useEffect(() => {
    const load = async () => {
      const [entries, localData] = await Promise.all([
        calendarStorage.getAllCalendarImages(),
        syncService.loadLocalData(),
      ]);
      let finalEntries = entries;
      const oldImages = localData.imagesByDate || {};
      const hasOldData = Object.keys(oldImages).length > 0;
      if (hasOldData && entries.length === 0) {
        const migrated = [];
        for (const [date, images] of Object.entries(oldImages)) {
          for (const img of images) {
            const assetId = img.assetId || null;
            const uri = img.uri || null;
            if (assetId || uri) {
              const entry = await calendarStorage.addCalendarImage({
                assetId: assetId || undefined,
                uri: uri || undefined,
                labels: img.labelId ? [img.labelId] : (img.labels || []),
                date,
              });
              if (entry) migrated.push(entry);
            }
          }
        }
        finalEntries = migrated;
        if (migrated.length > 0) {
          await syncService.saveLocalData({}, localData.labels || DEFAULT_LABELS);
        }
      }
      setCalendarEntries(finalEntries);
      setLabels(localData.labels || DEFAULT_LABELS);
      setIsDataLoaded(true);
      initialLoadDone.current = true;
    };
    load();
  }, []);

  useEffect(() => {
    if (initialLoadDone.current) {
      syncService.saveLocalLabels(labels);
    }
  }, [labels]);

  const addImagesToDate = useCallback((key, items) => {
    if (!items.length) return;
    const toAdd = items
      .map((item) => ({
        assetId: item.assetId || item.id || null,
        uri: item.uri || null,
        labels: item.labelId ? [item.labelId] : item.labels || [],
      }))
      .filter((item) => item.assetId || item.uri);
    if (!toAdd.length) return;
    (async () => {
      const added = [];
      for (const item of toAdd) {
        const entry = await calendarStorage.addCalendarImage({
          assetId: item.assetId,
          uri: item.uri,
          labels: item.labels,
          date: key,
        });
        if (entry) added.push(entry);
      }
      if (added.length) setCalendarEntries((prev) => [...prev, ...added]);
    })();
  }, []);

  const removeImageFromDate = useCallback((key, imageId) => {
    calendarStorage.deleteCalendarImage(imageId).then(() => {
      setCalendarEntries((prev) => prev.filter((e) => e.id !== imageId));
    });
  }, []);

  /** Batch delete; use for multi-select so all removals persist in one sync. */
  const removeImagesFromDate = useCallback((key, imageIds) => {
    const ids = Array.isArray(imageIds) ? imageIds : Array.from(imageIds);
    if (!ids.length) return;
    calendarStorage.deleteCalendarImages(ids).then(() => {
      setCalendarEntries((prev) => prev.filter((e) => !ids.includes(e.id)));
    });
  }, []);

  const moveImageToDate = useCallback((fromKey, toKey, imageId) => {
    calendarStorage.updateCalendarImage(imageId, { date: toKey }).then(() => {
      setCalendarEntries((prev) =>
        prev.map((e) => (e.id === imageId ? { ...e, date: toKey } : e))
      );
    });
  }, []);

  /** Batch move; use for multi-select so all moves persist in one sync. */
  const moveImagesToDate = useCallback((fromKey, toKey, imageIds) => {
    const ids = Array.isArray(imageIds) ? imageIds : Array.from(imageIds);
    if (!ids.length) return;
    const updates = ids.map((id) => ({ id, date: toKey }));
    calendarStorage.updateCalendarImages(updates).then(() => {
      setCalendarEntries((prev) =>
        prev.map((e) => (e.id && ids.includes(e.id) ? { ...e, date: toKey } : e))
      );
    });
  }, []);

  const setImageLabel = useCallback((imageId, labelId) => {
    const labelsArr = labelId ? [labelId] : [];
    calendarStorage.updateCalendarImage(imageId, { labels: labelsArr }).then(() => {
      setCalendarEntries((prev) =>
        prev.map((e) => (e.id === imageId ? { ...e, labels: labelsArr } : e))
      );
    });
  }, []);

  /** Batch set label; use for multi-select so all label changes persist in one sync. */
  const setImageLabels = useCallback((imageIds, labelId) => {
    const ids = Array.isArray(imageIds) ? imageIds : Array.from(imageIds);
    if (!ids.length) return;
    const labelsArr = labelId ? [labelId] : [];
    const updates = ids.map((id) => ({ id, labels: labelsArr }));
    calendarStorage.updateCalendarImages(updates).then(() => {
      setCalendarEntries((prev) =>
        prev.map((e) => (e.id && ids.includes(e.id) ? { ...e, labels: labelsArr } : e))
      );
    });
  }, []);

  const removeImageLabel = useCallback((imageId) => {
    setImageLabel(imageId, null);
  }, [setImageLabel]);

  const updateLabelName = useCallback((labelId, newName) => {
    setLabels((prev) =>
      prev.map((l) => (l.id === labelId ? { ...l, name: newName } : l))
    );
  }, []);

  const deleteLabel = useCallback((labelId) => {
    setLabels((prev) => prev.filter((l) => l.id !== labelId));
    syncService.saveLocalLabels(labels.filter((l) => l.id !== labelId));
    const toUpdate = calendarEntries.filter((e) => (e.labels || []).includes(labelId));
    Promise.all(
      toUpdate.map((e) => {
        const nextLabels = (e.labels || []).filter((id) => id !== labelId);
        return calendarStorage.updateCalendarImage(e.id, { labels: nextLabels });
      })
    ).then(() => {
      setCalendarEntries((prev) =>
        prev.map((e) => ({ ...e, labels: (e.labels || []).filter((id) => id !== labelId) }))
      );
    });
    if (toUpdate.length === 0) {
      setCalendarEntries((prev) =>
        prev.map((e) => ({ ...e, labels: (e.labels || []).filter((id) => id !== labelId) }))
      );
    }
  }, [labels, calendarEntries]);

  const addNewLabel = useCallback(() => {
    if (labels.length >= 7) return null;
    const colors = ['#9C27B0', '#00BCD4', '#795548', '#607D8B', '#F44336', '#4CAF50'];
    const newId = Date.now().toString();
    const newLabel = { id: newId, color: colors[Math.floor(Math.random() * colors.length)], name: 'New Label' };
    setLabels((prev) => [...prev, newLabel]);
    return newLabel.id;
  }, [labels.length]);

  const value = useMemo(
    () => ({
      viewDate,
      setViewDate,
      selectedDate,
      setSelectedDate,
      pickerVisible,
      setPickerVisible,
      pickerYear,
      setPickerYear,
      imagesByDate,
      addImagesToDate,
      removeImageFromDate,
      removeImagesFromDate,
      moveImageToDate,
      moveImagesToDate,
      setImageLabel,
      setImageLabels,
      removeImageLabel,
      pendingNavigation,
      setPendingNavigation,
      dateKey,
      labels,
      setLabels,
      updateLabelName,
      deleteLabel,
      addNewLabel,
      isDataLoaded,
    }),
    [
      viewDate,
      selectedDate,
      pickerVisible,
      pickerYear,
      imagesByDate,
      addImagesToDate,
      removeImageFromDate,
      removeImagesFromDate,
      moveImageToDate,
      moveImagesToDate,
      setImageLabel,
      setImageLabels,
      removeImageLabel,
      pendingNavigation,
      labels,
      updateLabelName,
      deleteLabel,
      addNewLabel,
      isDataLoaded,
    ]
  );

  return (
    <CalendarContext.Provider value={value}>
      {children}
    </CalendarContext.Provider>
  );
}

export function useCalendar() {
  const ctx = useContext(CalendarContext);
  if (!ctx) throw new Error('useCalendar must be used within CalendarProvider');
  return ctx;
}
