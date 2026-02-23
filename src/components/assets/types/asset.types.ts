export interface Asset {
  id: number;
  asset_name: string;
  asset_type: string;
  asset_description?: string;
  asset_count: number;
  asset_serial?: string;
  // Backend serializer returns asset_city (not city)
  asset_city?: string;
  city?: string;
  assigned_count?: number;
  available_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface AssetFormData {
  asset_name: string;
  asset_type: string;
  asset_description?: string;
  asset_count: string | number;
  asset_serial?: string;
  // city is the frontend field name; service maps it to asset_city when calling backend
  city?: string;
}

export interface AssetFilters {
  search?: string;
  asset_type?: string;
  location?: string;
  city?: string;
}

export interface ValidationError {
  row: number;
  field: string;
  message: string;
  value?: any;
}

export interface AssetApiResponse {
  message: string;
  data?: Asset[];
  count?: number;
}