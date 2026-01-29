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
    setImagesByDate((prev) => {
      const list = prev[key] ?? [];
      const next = uris.map((uri, i) => ({
        id: `${ddmmyyyy}#${list.length + i + 1}`,
        uri,
      }));
      return { ...prev, [key]: [...list, ...next] };
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
      dateKey,
    }),
    [
      viewDate,
      selectedDate,
      pickerVisible,
      pickerYear,
      imagesByDate,
      addImagesToDate,
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
