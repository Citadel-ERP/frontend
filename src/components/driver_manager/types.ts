export const TOKEN_KEY = 'token_2';

export interface Document {
  uri: string;
  name: string;
  type: string;
  size?: number;
}

export interface DriverProps {
  onBack: () => void;
}

export interface Address {
  id: number;
  address: string;
  city: string;
  state: string;
  country: string;
  zip_code: string;
}

export interface Office {
  id: number;
  name: string;
  address: Address;
  latitude: number | null;
  longitude: number | null;
}

export interface AssignedEmployee {
  employee_id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  profile_picture: string | null;
  is_approved_by_hr: boolean;
  is_approved_by_admin: boolean;
  is_archived: boolean;
  designation: string | null;
}

export interface Vehicle {
  id: number;
  make: string;
  model: string;
  year: number;
  license_plate: string;
  color: string;
  seating_capacity: number;
  fuel_type: string;
  status: string;
  current_location: {
    city: string;
    state: string;
  };
  image_url?: string;
  images?: Array<{
    id: number;
    url: string;
    is_primary: boolean;
  }>;
  vehicle_photos?: Array<{
    id: number;
    photo: string;
    created_at: string;
    updated_at: string;
  }>;
  // Add these certificate fields
  pollution_certificate?: string | null;
  insurance_certificate?: string | null;
  registration_certificate?: string | null;
}

export interface Booking {
  id: number;
  vehicle: Vehicle;
  start_time: string;
  end_time: string;
  booked_by: AssignedEmployee;
  booked_for: AssignedEmployee;
  status: string;
  purpose: string;
  reason_of_cancellation: string | null;
  start_location: string;
  end_location: string;
  created_at: string;
  updated_at: string;
  vehicle_assignments?: VehicleAssignment[]
}

export interface MaintenanceRecord {
  id: number;
  vehicle: Vehicle;
  maintenance_date: string;
  cost: string;
  description: string;
  logged_by: AssignedEmployee;
  start_date: string;
  end_date: string;
  document ?: string | null;
}

export interface FuelLog {
  id: number;
  vehicle: Vehicle;
  fuel_date: string;
  quantity: string;
  cost: string;
  logged_by: AssignedEmployee;
  odometer_reading: string;
}

export interface MaintenanceModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: () => void;
  form: {
    cost: string;
    description: string;
    start_date: string;
    end_date: string;
    document: Document | null;
  };
  setForm: React.Dispatch<React.SetStateAction<{
    cost: string;
    description: string;
    start_date: string;
    end_date: string;
    document: Document | null;
  }>>;
  loading: boolean;
}

export interface FuelLogModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSubmit: () => void;
  form: {
    quantity: string;
    cost: string;
    odometer_reading: string;
  };
  setForm: React.Dispatch<React.SetStateAction<{
    quantity: string;
    cost: string;
    odometer_reading: string;
  }>>;
  loading: boolean;
}

export interface MaintenanceLogsModalProps {
  isVisible: boolean;
  onClose: () => void;
  logs: MaintenanceRecord[];
  formatDate: (dateString: string) => string;
  token?: string;  
  vehicleId?: number; 
}

export interface FuelLogsModalProps {
  isVisible: boolean;
  onClose: () => void;
  logs: FuelLog[];
  formatDateTime: (dateString: string) => string;
  token?: string;  
  vehicleId?: number; 
}
export interface VehicleAssignment {
  id: number;
  vehicle: Vehicle;
  assigned_driver: AssignedEmployee | null;
  assignment_status: string; // 'pending', 'assigned', 'in-progress', 'completed', 'cancelled'
  assigned_at: string | null;
  created_at: string;
  updated_at: string;
}

export type ViewType = 'main' | 'vehicle-detail' | 'booking-detail' | 'update-vehicle';