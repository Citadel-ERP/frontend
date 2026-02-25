
import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import { Asset, AssetFormData, AssetFilters } from '../types/asset.types';
import { AssetService } from '../services/assetService';
import { validateAssetForm } from '../utils/validators';

export const useAssets = (city: string = '') => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<AssetFilters>({});

  const lastFetchedCityRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);

  const fetchAssets = useCallback(async (showLoading = true) => {
    if (!city || isFetchingRef.current) return;
    isFetchingRef.current = true;
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const response = await AssetService.getAssets(city);
      if (response.data && Array.isArray(response.data)) {
        setAssets(response.data);
        lastFetchedCityRef.current = city;
      }
    } catch (err: any) {
      setError(err.message);
      Alert.alert('Error', err.message || 'Failed to fetch assets');
    } finally {
      if (showLoading) setLoading(false);
      isFetchingRef.current = false;
    }
  }, [city]);

  const refreshAssets = useCallback(async () => {
    if (!city) return;
    setRefreshing(true);
    await fetchAssets(false);
    setRefreshing(false);
  }, [fetchAssets, city]);

  const createAsset = useCallback(async (data: AssetFormData) => {
    const errors = validateAssetForm(data);
    if (errors.length > 0) { Alert.alert('Validation Error', errors[0].message); return false; }
    setLoading(true);
    try {
      const response = await AssetService.createAsset(data);
      Alert.alert('Success', response.message || 'Asset created');
      await fetchAssets(false);
      return true;
    } catch (err: any) {
      Alert.alert('Error', err.message);
      return false;
    } finally { setLoading(false); }
  }, [fetchAssets]);

  const updateAsset = useCallback(async (id: number, data: Partial<AssetFormData>) => {
    setLoading(true);
    try {
      const response = await AssetService.updateAsset(id, data);
      Alert.alert('Success', response.message || 'Asset updated');
      await fetchAssets(false);
      return true;
    } catch (err: any) {
      Alert.alert('Error', err.message);
      return false;
    } finally { setLoading(false); }
  }, [fetchAssets]);

  const deleteAsset = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const response = await AssetService.deleteAsset(id);
      Alert.alert('Success', response.message || 'Asset deleted');
      await fetchAssets(false);
      return true;
    } catch (err: any) {
      Alert.alert('Error', err.message);
      return false;
    } finally { setLoading(false); }
  }, [fetchAssets]);

  // ── Serial operations ────────────────────────────────────────────────────

  const addSerialIds = useCallback(async (assetId: number, serialIds: string[]) => {
    try {
      const response = await AssetService.addSerialIds(assetId, serialIds);
      await fetchAssets(false);
      return { success: true, message: response.message };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }, [fetchAssets]);

  const deleteSerialId = useCallback(async (serialIdPk: number) => {
    try {
      const response = await AssetService.deleteSerialId(serialIdPk);
      await fetchAssets(false);
      return { success: true, message: response.message };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }, [fetchAssets]);

  const filterAssets = useCallback((rawAssets: Asset[]): Asset[] => {
    return rawAssets.filter((asset) => {
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const serialMatch = asset.asset_serial_id?.some(s =>
          s.serial_id.toLowerCase().includes(q)
        );
        const matches =
          asset.asset_name.toLowerCase().includes(q) ||
          asset.asset_type.toLowerCase().includes(q) ||
          (asset.asset_description ?? '').toLowerCase().includes(q) ||
          serialMatch;
        if (!matches) return false;
      }
      if (filters.asset_type && asset.asset_type !== filters.asset_type) return false;
      return true;
    });
  }, [filters]);

  useEffect(() => {
    if (!city) { setAssets([]); lastFetchedCityRef.current = null; return; }
    if (lastFetchedCityRef.current === city) return;
    fetchAssets();
  }, [city, fetchAssets]);

  return {
    assets,
    filteredAssets: filterAssets(assets),
    loading, refreshing, error, filters, setFilters,
    fetchAssets, refreshAssets,
    createAsset, updateAsset, deleteAsset,
    addSerialIds, deleteSerialId,
  };
};
