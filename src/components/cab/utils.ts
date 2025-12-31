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

export const formatTimeForAPI = (date: Date): string => {
    return date.toTimeString().slice(0, 5);
};

export const formatTimeForDisplay = (date: Date): string => {
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });
};

export const formatDateForDisplay = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit'
    });
};

export const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
};

export const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
        case 'available': return '#00d285';
        case 'booked': return '#017bf9';
        case 'completed': return '#666';
        case 'cancelled': return '#ff5e7a';
        case 'in-progress': return '#ffb157';
        default: return '#666';
    }
};

export const getStatusText = (status: string): string => {
    switch (status.toLowerCase()) {
        case 'available': return 'Available';
        case 'booked': return 'Upcoming';
        case 'completed': return 'Completed';
        case 'cancelled': return 'Cancelled';
        case 'in-progress': return 'Current';
        default: return status;
    }
};

export const DEFAULT_CITIES = [
    { name: 'Bengaluru', icon: '🏛️' },
    { name: 'Mumbai', icon: '🌉' },
    { name: 'Hyderabad', icon: '🕌' },
    { name: 'Pune', icon: '🏰' },
    { name: 'Delhi', icon: '🏛️' },
    { name: 'Noida', icon: '🏙️' },
    { name: 'Chennai', icon: '🕍' },
    { name: 'Kolkata', icon: '🌉' },
    { name: 'Ahmedabad', icon: '🕌' },
    { name: 'Jaipur', icon: '🏰' },
    { name: 'Lucknow', icon: '🏛️' },
    { name: 'Chandigarh', icon: '🏙️' }
];

// export const DEFAULT_CITIES = [
//     { name: 'Mumbai', image: require('../assets/cities/mumbai.jpg') },
//     { name: 'Delhi', image: require('../assets/cities/delhi.jpg') },
//     { name: 'Bangalore', image: require('../assets/cities/bangalore.jpg') },
//     { name: 'Hyderabad', image: require('../assets/cities/hyderabad.jpg') },
//     { name: 'Chennai', image: require('../assets/cities/chennai.jpg') },
//     { name: 'Kolkata', image: require('../assets/cities/kolkata.jpg') },
//     { name: 'Pune', image: require('../assets/cities/pune.jpg') },
//     { name: 'Ahmedabad', image: require('../assets/cities/ahmedabad.jpg') },
// ];

// export const DEFAULT_CITIES = [
//     { name: 'Mumbai', image: require('../assets/cities/mumbai.jpg'), icon: 'city' },
//     { name: 'Delhi', image: require('../assets/cities/delhi.jpg'), icon: 'city' },
//     { name: 'Bangalore', image: require('../assets/cities/bangalore.jpg'), icon: 'city' },
//     { name: 'Hyderabad', image: require('../assets/cities/hyderabad.jpg'), icon: 'city' },
//     { name: 'Chennai', image: require('../assets/cities/chennai.jpg'), icon: 'city' },
//     { name: 'Kolkata', image: require('../assets/cities/kolkata.jpg'), icon: 'city' },
//     { name: 'Pune', image: require('../assets/cities/pune.jpg'), icon: 'city' },
//     { name: 'Ahmedabad', image: require('../assets/cities/ahmedabad.jpg'), icon: 'city' },
// ];