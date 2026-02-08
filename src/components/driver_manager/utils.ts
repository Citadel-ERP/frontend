// utils.ts
import { ImageSourcePropType } from 'react-native';
import { Vehicle } from './types';
import { BACKEND_URL } from '../../config/config';

export const formatDate = (dateString: string): string => {
    try {
        if (!dateString) return 'No date';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid date';
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Invalid date';
    }
};

export const formatDateTime = (dateString: string): string => {
    try {
        if (!dateString) return 'No date';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Invalid date';
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch (error) {
        console.error('Error formatting date time:', error);
        return 'Invalid date';
    }
};

export const getStatusColor = (status: string): string => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
        case 'active':
        case 'available':
        case 'completed':
            return '#25D366';
        case 'maintenance':
        case 'in_maintenance':
            return '#8E8E93';
        case 'in-progress':
            return '#FF9500';
        case 'inactive':
        case 'not_available':
        case 'cancelled':
            return '#FF3B30';
        case 'assigned':
            return '#007AFF';
        default:
            return '#FF9500';
    }
};
export const getStatusIconBooking = (status: string) => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
        case 'active':
        case 'available':
            return 'check-circle';
        case 'maintenance':
        case 'in_maintenance':
            return 'hammer-wrench';
        case 'inactive':
        case 'not_available':
            return 'close-circle-outline';
        case 'assigned':
            return 'clock-outline';
        case 'completed':
            return 'check-all';
        case 'cancelled':
            return 'close-circle';
        case 'in-progress':
            return 'sync';
        case 'pending':
            return 'timer-sand';
        default:
            return 'help-circle';
    }
};
export const getStatusIcon = (status: string) => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
        case 'active':
        case 'available':
            return 'checkmark-circle';
        case 'maintenance':
        case 'in_maintenance':
            return 'build';
        case 'inactive':
        case 'not_available':
            return 'close-circle';
        case 'booked':
            return 'time';
        case 'completed':
            return 'checkmark-done-circle';
        case 'cancelled':
            return 'close-circle';
        case 'in-progress':
            return 'sync-circle';
        case 'pending':
            return 'timer';
        default:
            return 'help-circle';
    }
};

// utils.ts
export const getVehicleImageSource = (vehicle: Vehicle): ImageSourcePropType | null => {
  if (!vehicle) return null;
  
  if (vehicle.vehicle_photos) {
    const firstPhoto = vehicle.vehicle_photos[0];
    if (firstPhoto.photo) {
      if (firstPhoto.photo.startsWith('http')) {
        return { uri: firstPhoto.photo };
      }
      return { uri: `${BACKEND_URL}/${firstPhoto.photo.replace(/^\//, '')}` };
    }
  }
  
  return null;
};