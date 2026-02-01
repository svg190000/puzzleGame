import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';

const CalendarContext = createContext(null);

function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function keyToDDMMYYYY(key) {
  const [y, m, d] = key.split('-');
  return `${d}${m}${y}`;
}

export function CalendarProvider({ children }) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());
  const [imagesByDate, setImagesByDate] = useState({});

  const addImagesToDate = useCallback((key, uris) => {
    if (!uris.length) return;
    const ddmmyyyy = keyToDDMMYYYY(key);
    const timestamp = Date.now();
    setImagesByDate((prev) => {
      const list = prev[key] ?? [];
      const next = uris.map((uri, i) => ({
        id: `${ddmmyyyy}#${timestamp}_${i}`,
        uri,
      }));
      return { ...prev, [key]: [...list, ...next] };
    });
  }, []);

  const removeImageFromDate = useCallback((key, imageId) => {
    setImagesByDate((prev) => {
      const list = prev[key] ?? [];
      const filtered = list.filter((img) => img.id !== imageId);
      if (filtered.length === 0) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: filtered };
    });
  }, []);

  const moveImageToDate = useCallback((fromKey, toKey, imageId) => {
    if (fromKey === toKey) return;
    setImagesByDate((prev) => {
      const fromList = prev[fromKey] ?? [];
      const imageToMove = fromList.find((img) => img.id === imageId);
      if (!imageToMove) return prev;

      // Remove from source
      const newFromList = fromList.filter((img) => img.id !== imageId);
      
      // Add to destination with unique id (using timestamp + random to avoid collisions)
      const toList = prev[toKey] ?? [];
      const ddmmyyyy = keyToDDMMYYYY(toKey);
      const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const newImage = {
        id: `${ddmmyyyy}#${uniqueSuffix}`,
        uri: imageToMove.uri,
      };

      const result = { ...prev, [toKey]: [...toList, newImage] };
      
      // Remove source key if empty
      if (newFromList.length === 0) {
        delete result[fromKey];
      } else {
        result[fromKey] = newFromList;
      }
      
      return result;
    });
  }, []);

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
      moveImageToDate,
      dateKey,
    }),
    [
      viewDate,
      selectedDate,
      pickerVisible,
      pickerYear,
      imagesByDate,
      addImagesToDate,
      removeImageFromDate,
      moveImageToDate,
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
