export interface Office {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  address: Address;
  created_at?: string;
  updated_at?: string;
}

export interface Address {
  id?: number;
  address: string;
  city: string;
  state: string;
  country: string;
  zip_code: string;
}

export interface OfficeFormData {
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  zipcode: string;
  googleMapsLink: string; // Frontend only - not sent to backend
  // These will be extracted from maps link
  latitude?: number;
  longitude?: number;
}

export interface CreateOfficePayload {
  token: string | null;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
  country: string;
  zipcode: string;
}

export interface UpdateOfficePayload extends Partial<CreateOfficePayload> {
  office_id: number;
}

export interface DeleteOfficePayload {
  token: string | null;
  office_id: number;
}

export interface ApiResponse<T = any> {
  message: string;
  data?: T;
  offices?: T;
  office_data?: T;
  error?: string;
}