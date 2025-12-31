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
    assigned_to: AssignedEmployee;
    vehicle_type: string;
    license_plate: string;
    model: string;
    make: string;
    color: string;
    fuel_type: string;
    seating_capacity: number;
    year: number;
    status: string;
    current_location: Address;
    office: Office;
    pollution_certificate: string;
    insurance_certificate: string;
    registration_certificate: string;
    created_at: string;
    updated_at: string;
}

export interface Booking {
    id: number;
    vehicle: Vehicle;
    start_time: string;
    end_time: string;
    booked_by: AssignedEmployee;
    status: string;
    purpose: string;
    reason_of_cancellation: string | null;
    start_location: string;
    end_location: string;
    grace_period?: number;
    booking_for_someone_else?: AssignedEmployee;
}

export type ScreenType = 'city' | 'booking' | 'cabs' | 'myBookings';

export interface CabProps {
    onBack: () => void;
}

export interface BookingFormData {
    fromLocation: string;
    toLocation: string;
    startDate: Date;
    endDate: Date;
    startTime: Date;
    endTime: Date;
    purpose: string;
    gracePeriod: string;
    bookingFor: AssignedEmployee | null;
}
export interface City {
    name: string;
    icon: string;
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
    assigned_to: AssignedEmployee;
    vehicle_type: string;
    license_plate: string;
    model: string;
    make: string;
    color: string;
    fuel_type: string;
    seating_capacity: number;
    year: number;
    status: string;
    current_location: Address;
    office: Office;
    pollution_certificate: string;
    insurance_certificate: string;
    registration_certificate: string;
    created_at: string;
    updated_at: string;
}

export interface Booking {
    id: number;
    vehicle: Vehicle;
    start_time: string;
    end_time: string;
    booked_by: AssignedEmployee;
    status: string;
    purpose: string;
    reason_of_cancellation: string | null;
    start_location: string;
    end_location: string;
    grace_period?: number;
    booking_for_someone_else?: AssignedEmployee;
}

export type BookingStep = 1 | 2 | 3;

export interface CabProps {
    onBack: () => void;
}

export interface BookingFormData {
    fromLocation: string;
    toLocation: string;
    startDate: Date;
    endDate: Date;
    startTime: Date;
    endTime: Date;
    purpose: string;
    gracePeriod: string;
    bookingFor: AssignedEmployee | null;
}

export interface CityScreenProps {
    onBack: () => void;
    onCitySelect: (cityName: string) => void;
    onViewBookings: () => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    filteredCities: Array<{ name: string; image: any }>;
}




export interface AvailableCabsScreenProps {
    vehicles: Vehicle[];
    onBack: () => void;
    onSelectVehicle: (vehicle: Vehicle) => void;
    loading: boolean; // Add this
}

export interface MyBookingsScreenProps {
    bookings: Booking[];
    loading: boolean;
    onBack: () => void; // Add this
    onCancelBooking: (booking: Booking) => void;
    onRefresh?: () => void; // Make this optional
}

export interface CityScreenProps {
    onBack: () => void;
    onCitySelect: (cityName: string) => void;
    onViewBookings: () => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    filteredCities: Array<{ name: string; image: any }>;
}

export interface BookingStepProps {
    bookingStep: BookingStep;
    setBookingStep: (step: BookingStep) => void;
    bookingForm: BookingFormData;
    setBookingForm: (form: BookingFormData) => void;
    selectedCity: string;
    loading: boolean;
    onBack: () => void;
    onSearchCabs: () => void;
    onSetActivePickerType: (type: string) => void;
    formatTimeForDisplay: (date: Date) => string;
    formatDateForDisplay: (date: Date) => string;
}

// Add this if not present
export interface BookingFormData {
    fromLocation: string;
    toLocation: string;
    startDate: Date;
    endDate: Date;
    startTime: Date;
    endTime: Date;
    purpose: string;
    gracePeriod: string;
    bookingFor: AssignedEmployee | null;
}