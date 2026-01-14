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

export interface Driver {
    id: number;
    employee_id: string;
    email: string;
    first_name: string;
    last_name: string;
    full_name: string;
    profile_picture: string | null;
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
    vehicle_photos?: Array<{ // Add this for multiple images
    id: number;
    photo: string;
    created_at: string;
    updated_at: string;
  }>;
}

export interface MyBookingsScreenProps {
    bookings: Booking[];
    loading: boolean;
    onBack: () => void;
    onCancelBooking: (booking: Booking) => void;
    onRefresh?: () => void;
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
    bio: string | null;
}

export interface Office {
    id: number;
    name: string;
    address: {
        id: number;
        address: string;
        city: string;
        state: string;
        country: string;
        zip_code: string;
    };
    latitude: number | null;
    longitude: number | null;
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
export interface Booking {
    id: number;
    booked_by: AssignedEmployee;
    booked_for: AssignedEmployee | null; // Changed from booking_for_someone_else
    start_time: string;
    end_time: string;
    grace_period: string | null; // Changed from number to string to match backend
    purpose: string;
    status: string; // 'pending', 'assigned', 'in-progress', 'completed', 'cancelled'
    reason_of_cancellation: string | null;
    start_location: string;
    end_location: string;
    office: Office;
    vehicle_assignments: VehicleAssignment[]; // New: array of vehicle assignments
    created_at: string;
    updated_at: string;
}

export type ScreenType = 'booking' | 'cabs' | 'myBookings';
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

export interface BookingScreenProps {
    bookingStep: BookingStep;
    setBookingStep: (step: BookingStep) => void;
    bookingForm: BookingFormData;
    setBookingForm: (form: BookingFormData) => void;
    selectedCity: string;
    loading: boolean;
    onBack: () => void;
    onSearchCabs: () => void;
    onSetActivePickerType: (type: string) => void;
    onChangeCity: () => void;
    formatTimeForDisplay: (date: Date) => string;
    formatDateForDisplay: (date: Date) => string;
    token: string | null;
}

export interface PreviousBookingsSectionProps {
    bookings: Booking[];
    loading: boolean;
}

export interface AvailableCabsScreenProps {
    vehicles: Vehicle[];
    availableDrivers: Driver[];
    selectedVehicles: Array<{vehicle: Vehicle, driver: Driver | null}>;
    onBack: () => void;
    onUpdateSelection: (selection: Array<{vehicle: Vehicle, driver: Driver | null}>) => void;
    onProceedToBooking: () => void;
}

export interface BookVehicleModalProps {
    visible: boolean;
    onClose: () => void;
    bookingForm: BookingFormData;
    setBookingForm: (form: BookingFormData) => void;
    loading: boolean;
    onBookVehicle: () => void;
    selectedVehicles: Array<{vehicle: Vehicle, driver: Driver | null}>;
}

export interface CancelBookingModalProps {
    visible: boolean;
    onClose: () => void;
    selectedBooking: Booking | null;
    cancelReason: string;
    setCancelReason: (reason: string) => void;
    loading: boolean;
    onCancelBooking: () => void;
}

export interface ConfirmationModalProps {
    visible: boolean;
    onClose: () => void;
    onDone: () => void;
}