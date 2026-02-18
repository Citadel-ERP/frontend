import { Asset, AssetFormData, AssetApiResponse } from '../types/asset.types';
import { getToken } from '../utils/tokenUtils';

import { BACKEND_URL } from '../../../config/config';

export class AssetService {
  private static async getHeaders() {
    const token = await getToken(); 
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }

  static async createAsset(data: AssetFormData): Promise<AssetApiResponse> {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/citadel_admin/createAsset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          asset_name: data.asset_name,
          asset_type: data.asset_type,
          asset_description: data.asset_description,
          asset_count: Number(data.asset_count),
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || 'Failed to create asset');
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  static async getAssets(): Promise<AssetApiResponse> {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/citadel_admin/getAssets?token=${token}`, {
        method: 'GET',
        headers: await this.getHeaders(),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch assets');
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  static async updateAsset(id: number, data: Partial<AssetFormData>): Promise<AssetApiResponse> {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/citadel_admin/updateAsset`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          asset_id: id,
          ...(data.asset_name && { asset_name: data.asset_name }),
          ...(data.asset_type && { asset_type: data.asset_type }),
          ...(data.asset_description && { asset_description: data.asset_description }),
          ...(data.asset_count && { asset_count: Number(data.asset_count) }),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to update asset');
      }

      return result;
    } catch (error) {
      throw error;
    }
  }

  static async deleteAsset(id: number): Promise<AssetApiResponse> {
    try {
      const token = await getToken();
      const response = await fetch(`${BACKEND_URL}/citadel_admin/deleteAsset`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          asset_id: id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to delete asset');
      }

      return result;
    } catch (error) {
      throw error;
    }
  }
}