import React, { createContext, useContext, useState, useMemo, useCallback, useEffect, useRef } from 'react';
import syncService from '../services/SyncService';
import { useAuth } from './AuthContext';

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

// Default labels
const DEFAULT_LABELS = [
  { id: '1', color: '#E53935', name: 'Important' },
  { id: '2', color: '#43A047', name: 'Family' },
  { id: '3', color: '#1E88E5', name: 'Travel' },
  { id: '4', color: '#FF9800', name: 'Work' },
];

export function CalendarProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  
  const [viewDate, setViewDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());
  const [imagesByDate, setImagesByDate] = useState({});
  const [pendingNavigation, setPendingNavigation] = useState(null);
  
  // Labels state (moved from CalendarScreen)
  const [labels, setLabels] = useState(DEFAULT_LABELS);
  
  // Sync status: 'idle' | 'syncing' | 'synced' | 'error'
  const [syncStatus, setSyncStatus] = useState('idle');
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  
  // Ref to track if initial load is done
  const initialLoadDone = useRef(false);

  // Load local data on mount
  useEffect(() => {
    const loadData = async () => {
      const { imagesByDate: loadedImages, labels: loadedLabels } = await syncService.loadLocalData();
      setImagesByDate(loadedImages);
      setLabels(loadedLabels);
      setIsDataLoaded(true);
      initialLoadDone.current = true;
    };
    loadData();
  }, []);

  // Listen to sync status changes
  useEffect(() => {
    const unsubscribe = syncService.addSyncListener(setSyncStatus);
    return unsubscribe;
  }, []);

  // Sync with remote when authenticated and data is loaded
  useEffect(() => {
    if (isAuthenticated && isDataLoaded && user?.id) {
      syncWithRemote();
    }
  }, [isAuthenticated, isDataLoaded, user?.id]);

  // Save to local storage whenever data changes (after initial load)
  useEffect(() => {
    if (initialLoadDone.current) {
      syncService.saveLocalImages(imagesByDate);
    }
  }, [imagesByDate]);

  useEffect(() => {
    if (initialLoadDone.current) {
      syncService.saveLocalLabels(labels);
    }
  }, [labels]);

  const syncWithRemote = useCallback(async () => {
    if (!user?.id) return;
    
    const result = await syncService.syncWithRemote(imagesByDate, labels, user.id);
    if (result.success) {
      setImagesByDate(result.imagesByDate);
      setLabels(result.labels);
    }
  }, [user?.id, imagesByDate, labels]);

  const triggerSync = useCallback(() => {
    if (isAuthenticated && user?.id) {
      syncWithRemote();
    }
  }, [isAuthenticated, user?.id, syncWithRemote]);

  const addImagesToDate = useCallback((key, images) => {
    if (!images.length) return;
    const ddmmyyyy = keyToDDMMYYYY(key);
    const timestamp = Date.now();
    
    setImagesByDate((prev) => {
      const list = prev[key] ?? [];
      const next = images.map((img, i) => {
        const newImage = {
          id: `${ddmmyyyy}#${timestamp}_${i}`,
          uri: img.uri,
          assetId: img.assetId,
          fileName: img.fileName,
          labelId: img.labelId || null,
          updatedAt: new Date().toISOString(),
        };
        
        // Push to remote in background
        if (user?.id) {
          syncService.pushImageChange('add', { ...newImage, dateKey: key }, user.id);
        }
        
        return newImage;
      });
      return { ...prev, [key]: [...list, ...next] };
    });
  }, [user?.id]);

  const removeImageFromDate = useCallback((key, imageId) => {
    setImagesByDate((prev) => {
      const list = prev[key] ?? [];
      const filtered = list.filter((img) => img.id !== imageId);
      
      // Push to remote in background
      if (user?.id) {
        syncService.pushImageChange('remove', { id: imageId }, user.id);
      }
      
      if (filtered.length === 0) {
        const { [key]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [key]: filtered };
    });
  }, [user?.id]);

  const moveImageToDate = useCallback((fromKey, toKey, imageId) => {
    if (fromKey === toKey) return;
    setImagesByDate((prev) => {
      const fromList = prev[fromKey] ?? [];
      const imageToMove = fromList.find((img) => img.id === imageId);
      if (!imageToMove) return prev;

      const newFromList = fromList.filter((img) => img.id !== imageId);
      
      const toList = prev[toKey] ?? [];
      const ddmmyyyy = keyToDDMMYYYY(toKey);
      const uniqueSuffix = `${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const newImage = {
        id: `${ddmmyyyy}#${uniqueSuffix}`,
        uri: imageToMove.uri,
        assetId: imageToMove.assetId,
        fileName: imageToMove.fileName,
        labelId: imageToMove.labelId,
        updatedAt: new Date().toISOString(),
      };

      // Push to remote in background
      if (user?.id) {
        syncService.pushImageChange('move', {
          oldId: imageId,
          newId: newImage.id,
          toDateKey: toKey,
        }, user.id);
      }

      const result = { ...prev, [toKey]: [...toList, newImage] };
      
      if (newFromList.length === 0) {
        delete result[fromKey];
      } else {
        result[fromKey] = newFromList;
      }
      
      return result;
    });
  }, [user?.id]);

  const setImageLabel = useCallback((imageId, labelId) => {
    setImagesByDate((prev) => {
      const newState = { ...prev };
      for (const key of Object.keys(newState)) {
        const list = newState[key];
        const index = list.findIndex((img) => img.id === imageId);
        if (index !== -1) {
          newState[key] = [...list];
          newState[key][index] = { 
            ...list[index], 
            labelId,
            updatedAt: new Date().toISOString(),
          };
          
          // Push to remote in background
          if (user?.id) {
            syncService.pushImageChange('update', {
              id: imageId,
              dateKey: key,
              labelId,
            }, user.id);
          }
          
          break;
        }
      }
      return newState;
    });
  }, [user?.id]);

  const removeImageLabel = useCallback((imageId) => {
    setImageLabel(imageId, null);
  }, [setImageLabel]);

  // Label management functions
  const updateLabelName = useCallback((labelId, newName) => {
    setLabels((prev) => {
      const updated = prev.map((label) =>
        label.id === labelId ? { ...label, name: newName } : label
      );
      
      // Push to remote in background
      const label = updated.find((l) => l.id === labelId);
      if (user?.id && label) {
        syncService.pushLabelChange('update', label, user.id);
      }
      
      return updated;
    });
  }, [user?.id]);

  const deleteLabel = useCallback((labelId) => {
    setLabels((prev) => {
      // Push to remote in background
      if (user?.id) {
        syncService.pushLabelChange('remove', { id: labelId }, user.id);
      }
      
      return prev.filter((label) => label.id !== labelId);
    });
    
    // Also remove this label from any images that have it
    setImagesByDate((prev) => {
      const newState = { ...prev };
      for (const key of Object.keys(newState)) {
        newState[key] = newState[key].map((img) =>
          img.labelId === labelId ? { ...img, labelId: null, updatedAt: new Date().toISOString() } : img
        );
      }
      return newState;
    });
  }, [user?.id]);

  const addNewLabel = useCallback(async () => {
    // Max 7 labels
    if (labels.length >= 7) return null;
    
    const colors = ['#9C27B0', '#00BCD4', '#795548', '#607D8B', '#F44336', '#4CAF50'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const newId = Date.now().toString();
    const newLabel = { id: newId, color: randomColor, name: 'New Label' };
    
    // Push to remote and get actual ID if authenticated
    if (user?.id) {
      const remoteId = await syncService.pushLabelChange('add', newLabel, user.id);
      if (remoteId) {
        newLabel.id = remoteId;
      }
    }
    
    setLabels((prev) => [...prev, newLabel]);
    return newLabel.id;
  }, [user?.id, labels.length]);

  const clearLocalData = useCallback(async () => {
    await syncService.clearAllLocalData();
    setImagesByDate({});
    setLabels(DEFAULT_LABELS);
    setSyncStatus('idle');
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
      setImageLabel,
      removeImageLabel,
      pendingNavigation,
      setPendingNavigation,
      dateKey,
      // Labels
      labels,
      setLabels,
      updateLabelName,
      deleteLabel,
      addNewLabel,
      // Sync
      syncStatus,
      triggerSync,
      isDataLoaded,
      clearLocalData,
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
      setImageLabel,
      removeImageLabel,
      pendingNavigation,
      labels,
      updateLabelName,
      deleteLabel,
      addNewLabel,
      syncStatus,
      triggerSync,
      isDataLoaded,
      clearLocalData,
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
