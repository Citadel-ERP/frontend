import { AssetFormData } from '../types/asset.types';

export interface ValidationResult {
  field: string;
  message: string;
}

export const validateAssetForm = (data: Partial<AssetFormData>): ValidationResult[] => {
  const errors: ValidationResult[] = [];

  // Validate asset_name (must include location)
  if (data.asset_name !== undefined) {
    if (!data.asset_name) {
      errors.push({ field: 'asset_name', message: 'Asset name is required' });
    } 
  }

  // Validate asset_type
  if (data.asset_type !== undefined) {
    if (!data.asset_type) {
      errors.push({ field: 'asset_type', message: 'Asset type is required' });
    }
  }

  // Validate asset_count
  if (data.asset_count !== undefined) {
    const count = Number(data.asset_count);
    if (isNaN(count) || count < 0) {
      errors.push({ field: 'asset_count', message: 'Asset count must be a positive number' });
    }
  }

  return errors;
};

export const extractLocation = (assetName: string): string => {
  const parts = assetName.split('-');
  return parts.length > 1 ? parts[1] : 'Unknown';
};

export const extractAssetBaseName = (assetName: string): string => {
  const parts = assetName.split('-');
  return parts[0];
};