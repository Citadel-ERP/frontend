export interface Asset {
  id: number;
  asset_name: string;
  asset_type: string;
  asset_description?: string;
  asset_count: number;
  asset_serial?: string;  
  city?: string;       
  created_at?: string;
}

export interface AssetFormData {
  asset_name: string;
  asset_type: string;
  asset_description?: string;
  asset_count: string | number;
  asset_serial?: string; 
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