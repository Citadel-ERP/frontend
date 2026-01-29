export interface ScoutBoyProps {
  onBack: () => void;
}

export interface Visit {
  id: number;
  site: Site;
  status: 'pending' | 'scout_completed' | 'admin_completed' | 'cancelled';
  collaborators: any[];
  assigned_by: any;
  created_at: string;
  updated_at: string;
  scout_completed_at: string | null;
  building_photos: Photo[];
  photos: Photo[];
}

export interface Site {
  building_name: string;
  location: string;
  managed_property: boolean;
  conventional_property: boolean;
  landmark: string;
  building_status: string;
  floor_condition: string;
  total_floors: string;
  number_of_basements: string;
  total_seats: string;
  seats_available: string;
  number_of_units: string;
  number_of_seats_per_unit: string;
  efficiency: string;
  business_hours_of_operation: string;
  premises_access: string;
  will_developer_do_fitouts: boolean;
  rent_per_seat: string;
  maintenance_rate: string;
  cam_deposit: string;
  security_deposit: string;
  lease_term: string;
  lock_in_period: string;
  notice_period: string;
  rental_escalation: string;
  rent: string;
  total_area: string;
  area_per_floor: string;
  availble_floors: string;
  area_offered: string;
  car_parking_charges: string;
  car_parking_slots: string;
  car_parking_ratio: string;
  two_wheeler_charges: string;
  two_wheeler_slots: string;
  building_owner_name: string;
  building_owner_contact: string;
  contact_person_name: string;
  contact_person_number: string;
  contact_person_email: string;
  contact_person_designation: string;
  remarks: string;
  nearest_metro_station: {
    name: string;
  } | null;
}

export interface Photo {
  id: number;
  file_url: string;
}

export interface Comment {
  id: number;
  user: {
    full_name: string;
  };
  content: string;
  documents: any[];
  created_at: string;
}

export interface FilterOption {
  value: string;
  label: string;
}

export interface Pagination {
  current_page: number;
  total_pages: number;
  total_items: number;
  page_size: number;
  has_next: boolean;
  has_previous: boolean;
  next_page: number | null;
  previous_page: number | null;
}

export type ViewMode = 'list' | 'detail' | 'create-site' | 'edit';

export interface ThemeColors {
  primary: string;
  background: string;
  backgroundSecondary: string;
  cardBg: string;
  text: string;
  textSecondary: string;
  textLight: string;
  border: string;
  white: string;
  gray: string;
  info: string;
  error: string;
  success: string;
  warning: string;
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  fontSize: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    xl: number;
    full: number;
  };
  shadows: {
    sm: any;
    md: any;
    lg: any;
  };
}