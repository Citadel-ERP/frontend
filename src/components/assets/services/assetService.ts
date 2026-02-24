import { AssetFormData, AssetApiResponse } from '../types/asset.types';
import { getToken } from '../utils/tokenUtils';
import { BACKEND_URL } from '../../../config/config';

export class AssetService {
  private static async getHeaders() {
    const token = await getToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  static async createAsset(data: AssetFormData): Promise<AssetApiResponse> {
    const token = await getToken();
    const response = await fetch(`${BACKEND_URL}/citadel_admin/createAsset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        asset_name: data.asset_name,
        asset_type: data.asset_type,
        asset_description: data.asset_description ?? '',
        asset_count: Number(data.asset_count),
        asset_serial: data.asset_serial ?? '',
        // Backend model field is asset_city
        asset_city: (data.city ?? '').toLowerCase(),
      }),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Failed to create asset');
    return result;
  }

  // city is passed so backend returns only that city's assets
  static async getAssets(city?: string): Promise<AssetApiResponse> {
    const token = await getToken();
    const response = await fetch(`${BACKEND_URL}/citadel_admin/getAssets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        // Send lowercase to match backend icontains filter
        city: city ? city.toLowerCase() : '',
      }),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Failed to fetch assets');

    return {
      ...result,
      data: result.assets ?? result.data ?? [],
    };
  }

  static async updateAsset(id: number, data: Partial<AssetFormData>): Promise<AssetApiResponse> {
    const token = await getToken();
    const response = await fetch(`${BACKEND_URL}/citadel_admin/updateAsset`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        asset_id: id,
        ...(data.asset_name !== undefined && { asset_name: data.asset_name }),
        ...(data.asset_type !== undefined && { asset_type: data.asset_type }),
        ...(data.asset_description !== undefined && { asset_description: data.asset_description }),
        ...(data.asset_count !== undefined && { asset_count: Number(data.asset_count) }),
        ...(data.asset_serial !== undefined && { asset_serial: data.asset_serial }),
        // Map city → asset_city for backend
        ...(data.city !== undefined && { asset_city: data.city.toLowerCase() }),
      }),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Failed to update asset');
    return result;
  }

  static async deleteAsset(id: number): Promise<AssetApiResponse> {
    const token = await getToken();
    const response = await fetch(`${BACKEND_URL}/citadel_admin/deleteAsset`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, asset_id: id }),
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.message || 'Failed to delete asset');
    return result;
  }
}