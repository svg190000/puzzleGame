import React, { createContext, useContext, useState, useMemo } from 'react';

const CalendarContext = createContext(null);

export function CalendarProvider({ children }) {
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());

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
    }),
    [
      viewDate,
      selectedDate,
      pickerVisible,
      pickerYear,
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
