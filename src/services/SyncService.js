import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured } from '../config/supabase';

// Storage keys
const STORAGE_KEYS = {
  IMAGES_BY_DATE: '@puzzle_images_by_date',
  LABELS: '@puzzle_labels',
  LAST_SYNC: '@puzzle_last_sync',
  PENDING_CHANGES: '@puzzle_pending_changes',
};

// Default labels
const DEFAULT_LABELS = [
  { id: '1', color: '#E53935', name: 'Important' },
  { id: '2', color: '#43A047', name: 'Family' },
  { id: '3', color: '#1E88E5', name: 'Travel' },
  { id: '4', color: '#FF9800', name: 'Work' },
];

class SyncService {
  constructor() {
    this.isSyncing = false;
    this.syncListeners = new Set();
  }

  // Subscribe to sync status changes
  addSyncListener(callback) {
    this.syncListeners.add(callback);
    return () => this.syncListeners.delete(callback);
  }

  notifySyncStatus(status) {
    this.syncListeners.forEach((cb) => cb(status));
  }

  // ==================== LOCAL STORAGE ====================

  async loadLocalData() {
    try {
      const [imagesJson, labelsJson] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.IMAGES_BY_DATE),
        AsyncStorage.getItem(STORAGE_KEYS.LABELS),
      ]);

      const imagesByDate = imagesJson ? JSON.parse(imagesJson) : {};
      const labels = labelsJson ? JSON.parse(labelsJson) : DEFAULT_LABELS;

      return { imagesByDate, labels };
    } catch (error) {
      console.error('Error loading local data:', error);
      return { imagesByDate: {}, labels: DEFAULT_LABELS };
    }
  }

  async saveLocalData(imagesByDate, labels) {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.IMAGES_BY_DATE, JSON.stringify(imagesByDate)),
        AsyncStorage.setItem(STORAGE_KEYS.LABELS, JSON.stringify(labels)),
      ]);
    } catch (error) {
      console.error('Error saving local data:', error);
    }
  }

  async saveLocalImages(imagesByDate) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.IMAGES_BY_DATE, JSON.stringify(imagesByDate));
    } catch (error) {
      console.error('Error saving local images:', error);
    }
  }

  async saveLocalLabels(labels) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LABELS, JSON.stringify(labels));
    } catch (error) {
      console.error('Error saving local labels:', error);
    }
  }

  async getLastSyncTime() {
    try {
      const time = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
      return time ? new Date(time) : null;
    } catch (error) {
      return null;
    }
  }

  async setLastSyncTime(time = new Date()) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, time.toISOString());
    } catch (error) {
      console.error('Error saving last sync time:', error);
    }
  }

  async clearAllLocalData() {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.IMAGES_BY_DATE),
        AsyncStorage.removeItem(STORAGE_KEYS.LABELS),
        AsyncStorage.removeItem(STORAGE_KEYS.LAST_SYNC),
        AsyncStorage.removeItem(STORAGE_KEYS.PENDING_CHANGES),
      ]);
    } catch (error) {
      console.error('Error clearing local data:', error);
    }
  }

  // ==================== REMOTE SYNC ====================

  async syncWithRemote(localImagesByDate, localLabels, userId) {
    if (!isSupabaseConfigured() || !userId) {
      return { imagesByDate: localImagesByDate, labels: localLabels, success: false };
    }

    if (this.isSyncing) {
      return { imagesByDate: localImagesByDate, labels: localLabels, success: false };
    }

    this.isSyncing = true;
    this.notifySyncStatus('syncing');

    try {
      // Sync labels first (images reference labels)
      const mergedLabels = await this.syncLabels(localLabels, userId);
      
      // Create label ID mapping (local -> remote)
      const labelIdMap = this.createLabelIdMap(localLabels, mergedLabels);
      
      // Sync images
      const mergedImages = await this.syncImages(localImagesByDate, userId, labelIdMap);

      // Save merged data locally
      await this.saveLocalData(mergedImages, mergedLabels);
      await this.setLastSyncTime();

      this.notifySyncStatus('synced');
      return { imagesByDate: mergedImages, labels: mergedLabels, success: true };
    } catch (error) {
      console.error('Sync error:', error);
      this.notifySyncStatus('error');
      return { imagesByDate: localImagesByDate, labels: localLabels, success: false };
    } finally {
      this.isSyncing = false;
    }
  }

  createLabelIdMap(localLabels, mergedLabels) {
    const map = {};
    localLabels.forEach((local) => {
      const merged = mergedLabels.find(
        (m) => m.name === local.name && m.color === local.color
      );
      if (merged && merged.id !== local.id) {
        map[local.id] = merged.id;
      }
    });
    return map;
  }

  // ==================== LABELS SYNC ====================

  async syncLabels(localLabels, userId) {
    // Fetch remote labels
    const { data: remoteLabels, error } = await supabase
      .from('labels')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    const merged = [...localLabels];
    const toInsert = [];
    const toUpdate = [];

    // Process local labels - push to remote if not exists
    for (const local of localLabels) {
      const remote = remoteLabels?.find((r) => r.name === local.name && r.color === local.color);
      
      if (!remote) {
        // Local label doesn't exist remotely - push it
        toInsert.push({
          user_id: userId,
          name: local.name,
          color: local.color,
          updated_at: new Date().toISOString(),
        });
      }
    }

    // Process remote labels - pull if not exists locally or updated more recently
    for (const remote of remoteLabels || []) {
      const localIndex = merged.findIndex(
        (l) => l.name === remote.name && l.color === remote.color
      );

      if (localIndex === -1) {
        // Remote label doesn't exist locally - add it
        merged.push({
          id: remote.id,
          name: remote.name,
          color: remote.color,
        });
      } else {
        // Update local with remote ID for consistency
        merged[localIndex] = {
          ...merged[localIndex],
          id: remote.id,
        };
      }
    }

    // Insert new labels to remote
    if (toInsert.length > 0) {
      const { data: inserted, error: insertError } = await supabase
        .from('labels')
        .insert(toInsert)
        .select();

      if (insertError) throw insertError;

      // Update merged with new IDs
      inserted?.forEach((newLabel) => {
        const idx = merged.findIndex(
          (m) => m.name === newLabel.name && m.color === newLabel.color
        );
        if (idx !== -1) {
          merged[idx].id = newLabel.id;
        }
      });
    }

    return merged;
  }

  // ==================== IMAGES SYNC ====================

  async syncImages(localImagesByDate, userId, labelIdMap) {
    // Fetch remote images
    const { data: remoteImages, error } = await supabase
      .from('calendar_images')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    const merged = { ...localImagesByDate };
    const toInsert = [];
    const remoteByLocalId = new Map(
      (remoteImages || []).map((r) => [r.local_id, r])
    );

    // Process local images
    for (const [dateKey, images] of Object.entries(localImagesByDate)) {
      for (const img of images) {
        const remote = remoteByLocalId.get(img.id);
        
        // Map label ID if needed
        const mappedLabelId = labelIdMap[img.labelId] || img.labelId;

        if (!remote) {
          // Local image doesn't exist remotely - push it
          toInsert.push({
            user_id: userId,
            local_id: img.id,
            date_key: dateKey,
            uri: img.uri,
            asset_id: img.assetId || null,
            file_name: img.fileName || null,
            label_id: mappedLabelId || null,
            updated_at: new Date().toISOString(),
          });
        } else {
          // Remote exists - check for updates (last-write-wins)
          const remoteUpdated = new Date(remote.updated_at);
          const localUpdated = img.updatedAt ? new Date(img.updatedAt) : new Date(0);

          if (remoteUpdated > localUpdated) {
            // Remote wins - update local
            if (!merged[remote.date_key]) {
              merged[remote.date_key] = [];
            }
            
            // Remove from old date if moved
            if (remote.date_key !== dateKey) {
              merged[dateKey] = merged[dateKey].filter((i) => i.id !== img.id);
              if (merged[dateKey].length === 0) delete merged[dateKey];
            }

            // Update in merged
            const targetList = merged[remote.date_key] || [];
            const idx = targetList.findIndex((i) => i.id === img.id);
            const updatedImg = {
              id: img.id,
              uri: remote.uri,
              assetId: remote.asset_id,
              fileName: remote.file_name,
              labelId: remote.label_id,
              updatedAt: remote.updated_at,
            };

            if (idx !== -1) {
              targetList[idx] = updatedImg;
            } else {
              targetList.push(updatedImg);
            }
            merged[remote.date_key] = targetList;
          } else if (localUpdated > remoteUpdated) {
            // Local wins - update remote
            await supabase
              .from('calendar_images')
              .update({
                date_key: dateKey,
                uri: img.uri,
                asset_id: img.assetId || null,
                file_name: img.fileName || null,
                label_id: mappedLabelId || null,
                updated_at: new Date().toISOString(),
              })
              .eq('id', remote.id);
          }
        }
      }
    }

    // Add remote-only images to local
    for (const remote of remoteImages || []) {
      if (!this.findImageInLocal(localImagesByDate, remote.local_id)) {
        if (!merged[remote.date_key]) {
          merged[remote.date_key] = [];
        }
        merged[remote.date_key].push({
          id: remote.local_id,
          uri: remote.uri,
          assetId: remote.asset_id,
          fileName: remote.file_name,
          labelId: remote.label_id,
          updatedAt: remote.updated_at,
        });
      }
    }

    // Insert new images to remote
    if (toInsert.length > 0) {
      const { error: insertError } = await supabase
        .from('calendar_images')
        .insert(toInsert);

      if (insertError) throw insertError;
    }

    return merged;
  }

  findImageInLocal(imagesByDate, localId) {
    for (const images of Object.values(imagesByDate)) {
      if (images.some((img) => img.id === localId)) {
        return true;
      }
    }
    return false;
  }

  // ==================== PUSH CHANGES ====================

  async pushImageChange(action, imageData, userId) {
    if (!isSupabaseConfigured() || !userId) return;

    try {
      switch (action) {
        case 'add':
          await supabase.from('calendar_images').insert({
            user_id: userId,
            local_id: imageData.id,
            date_key: imageData.dateKey,
            uri: imageData.uri,
            asset_id: imageData.assetId || null,
            file_name: imageData.fileName || null,
            label_id: imageData.labelId || null,
            updated_at: new Date().toISOString(),
          });
          break;

        case 'remove':
          await supabase
            .from('calendar_images')
            .delete()
            .eq('user_id', userId)
            .eq('local_id', imageData.id);
          break;

        case 'update':
          await supabase
            .from('calendar_images')
            .update({
              date_key: imageData.dateKey,
              label_id: imageData.labelId || null,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId)
            .eq('local_id', imageData.id);
          break;

        case 'move':
          await supabase
            .from('calendar_images')
            .update({
              date_key: imageData.toDateKey,
              local_id: imageData.newId,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId)
            .eq('local_id', imageData.oldId);
          break;
      }
    } catch (error) {
      console.error(`Error pushing ${action} change:`, error);
      // Queue for later sync
      await this.queuePendingChange(action, imageData);
    }
  }

  async pushLabelChange(action, labelData, userId) {
    if (!isSupabaseConfigured() || !userId) return;

    try {
      switch (action) {
        case 'add':
          const { data } = await supabase
            .from('labels')
            .insert({
              user_id: userId,
              name: labelData.name,
              color: labelData.color,
              updated_at: new Date().toISOString(),
            })
            .select()
            .single();
          return data?.id;

        case 'remove':
          await supabase
            .from('labels')
            .delete()
            .eq('user_id', userId)
            .eq('id', labelData.id);
          break;

        case 'update':
          await supabase
            .from('labels')
            .update({
              name: labelData.name,
              color: labelData.color,
              updated_at: new Date().toISOString(),
            })
            .eq('user_id', userId)
            .eq('id', labelData.id);
          break;
      }
    } catch (error) {
      console.error(`Error pushing label ${action} change:`, error);
    }
  }

  async queuePendingChange(action, data) {
    try {
      const pendingJson = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_CHANGES);
      const pending = pendingJson ? JSON.parse(pendingJson) : [];
      pending.push({ action, data, timestamp: Date.now() });
      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_CHANGES, JSON.stringify(pending));
    } catch (error) {
      console.error('Error queuing pending change:', error);
    }
  }

  async processPendingChanges(userId) {
    if (!userId) return;

    try {
      const pendingJson = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_CHANGES);
      if (!pendingJson) return;

      const pending = JSON.parse(pendingJson);
      const failed = [];

      for (const change of pending) {
        try {
          await this.pushImageChange(change.action, change.data, userId);
        } catch (error) {
          failed.push(change);
        }
      }

      if (failed.length > 0) {
        await AsyncStorage.setItem(STORAGE_KEYS.PENDING_CHANGES, JSON.stringify(failed));
      } else {
        await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_CHANGES);
      }
    } catch (error) {
      console.error('Error processing pending changes:', error);
    }
  }
}

export const syncService = new SyncService();
export default syncService;
