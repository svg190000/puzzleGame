import { useState, useEffect } from 'react';
import * as MediaLibrary from 'expo-media-library';

const CACHE_MAX_SIZE = 100;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const uriCache = new Map(); // assetId -> { uri, timestamp }

function pruneCache() {
  if (uriCache.size <= CACHE_MAX_SIZE) return;
  const entries = Array.from(uriCache.entries())
    .sort((a, b) => a[1].timestamp - b[1].timestamp);
  const toDelete = entries.slice(0, uriCache.size - CACHE_MAX_SIZE);
  toDelete.forEach(([id]) => uriCache.delete(id));
}

/**
 * Get the asset ID for a given image URI.
 * Best used with assetId from ImagePicker result; for arbitrary URIs may return null
 * if the platform doesn't allow lookup.
 * @param {string} imageUri - URI (e.g. from picker or file)
 * @returns {Promise<string|null>} - Asset ID or null
 */
export async function getAssetId(imageUri) {
  if (!imageUri) return null;
  try {
    const info = await MediaLibrary.getAssetInfoAsync(imageUri);
    if (info && (info.localUri || info.uri)) {
      return info.id || imageUri;
    }
  } catch (_) {
    // URI may not be an asset id; caller should use picker's assetId when available
  }
  return null;
}

/**
 * Resolve an asset ID to a displayable local URI.
 * Caches results briefly to avoid repeated lookups.
 * @param {string} assetId - MediaLibrary asset ID
 * @returns {Promise<string|null>} - localUri or null if asset missing/deleted
 */
export async function getImageUriFromAssetId(assetId) {
  if (!assetId) return null;
  const cached = uriCache.get(assetId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.uri;
  }
  try {
    const info = await MediaLibrary.getAssetInfoAsync(assetId);
    const uri = (info && (info.localUri || info.uri)) || null;
    if (uri) {
      uriCache.set(assetId, { uri, timestamp: Date.now() });
      pruneCache();
    }
    return uri;
  } catch (_) {
    return null;
  }
}

/**
 * Request media library permissions. Call on first use (e.g. before picker or album list).
 * @returns {Promise<boolean>} - true if granted
 */
export async function requestMediaLibraryPermissions() {
  const { status } = await MediaLibrary.requestPermissionsAsync(false);
  return status === 'granted';
}

/**
 * React hook: resolve assetId to display URI with loading and error state.
 * @param {string|null|undefined} assetId
 * @returns {{ uri: string|null, loading: boolean, error: boolean }}
 */
export function useResolvedUri(assetId) {
  const [uri, setUri] = useState(null);
  const [loading, setLoading] = useState(!!assetId);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!assetId) {
      setUri(null);
      setLoading(false);
      setError(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(false);
    getImageUriFromAssetId(assetId)
      .then((resolved) => {
        if (cancelled) return;
        setLoading(false);
        setUri(resolved);
        setError(!resolved);
      })
      .catch(() => {
        if (cancelled) return;
        setLoading(false);
        setError(true);
      });
    return () => { cancelled = true; };
  }, [assetId]);

  return { uri, loading, error };
}
