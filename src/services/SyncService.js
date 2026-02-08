import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys
const STORAGE_KEYS = {
  IMAGES_BY_DATE: '@puzzle_images_by_date',
  LABELS: '@puzzle_labels',
};

// Default labels
const DEFAULT_LABELS = [
  { id: '1', color: '#E53935', name: 'Important' },
  { id: '2', color: '#43A047', name: 'Family' },
  { id: '3', color: '#1E88E5', name: 'Travel' },
  { id: '4', color: '#FF9800', name: 'Work' },
];

class SyncService {
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

  async saveLocalLabels(labels) {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LABELS, JSON.stringify(labels));
    } catch (error) {
      console.error('Error saving local labels:', error);
    }
  }
}

export const syncService = new SyncService();
export default syncService;
