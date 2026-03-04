export interface SerialId {
  id: number;
  serial_id: string;
  is_assigned: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Asset {
  id: number;
  asset_name: string;
  asset_type: string;
  asset_description?: string;
  asset_count: number;
  assigned_count?: number;
  available_count?: number;
  asset_city?: string;
  city?: string;                      // alias used internally
  asset_serial_id: SerialId[];        // replaces old asset_serial string
  created_at?: string;
  updated_at?: string;
}

export interface AssetFormData {
  asset_name: string;
  asset_type: string;
  asset_description?: string;
  asset_count: string | number;
  city?: string;
  // serial_id removed — serials are managed via addSerialIds endpoint
}

export interface AssetFilters {
  search?: string;
  asset_type?: string;
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