import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { OfficeApi, EmployeeAssignmentError } from '../services/officeApi';
import { Office, OfficeFormData, CreateOfficePayload, UpdateOfficePayload } from '../types/office.types';
import { MapsLinkParser } from '../utils/mapsUtils';

export const useOffices = () => {
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [selectedOffice, setSelectedOffice] = useState<Office | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Fetch all offices
  const fetchOffices = useCallback(async (showRefreshing = false) => {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      const data = await OfficeApi.getOffices();
      setOffices(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load offices');
      Alert.alert('Error', err.message || 'Failed to load offices');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchOffices();
  }, [fetchOffices]);

  // Process form data with maps link
  const processFormData = useCallback((formData: OfficeFormData): Omit<CreateOfficePayload, 'token'> => {
    // Extract coordinates from Google Maps link
    const coords = MapsLinkParser.validateAndExtract(formData.googleMapsLink);
    
    return {
      name: formData.name,
      latitude: coords.latitude,
      longitude: coords.longitude,
      address: formData.address,
      city: formData.city,
      state: formData.state,
      country: formData.country,
      zipcode: formData.zipcode,
    };
  }, []);

  // Create office
  const createOffice = useCallback(async (formData: OfficeFormData): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      const payload = processFormData(formData);
      const newOffice = await OfficeApi.createOffice(payload);
      
      setOffices(prev => [newOffice, ...prev]);
      Alert.alert('Success', 'Office created successfully');
      return true;
    } catch (err: any) {
      setError(err.message);
      Alert.alert('Error', err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [processFormData]);

  // Update office
  const updateOffice = useCallback(async (officeId: number, formData: OfficeFormData): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      
      const payload = processFormData(formData);
      const updatedOffice = await OfficeApi.updateOffice({
        office_id: officeId,
        ...payload
      });
      
      setOffices(prev => prev.map(office => 
        office.id === officeId ? updatedOffice : office
      ));
      
      Alert.alert('Success', 'Office updated successfully');
      return true;
    } catch (err: any) {
      setError(err.message);
      Alert.alert('Error', err.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [processFormData]);

  // Show delete confirmation
  const confirmDelete = useCallback((office: Office) => {
    setSelectedOffice(office);
    setDeleteModalVisible(true);
  }, []);

  // Execute delete
  const deleteOffice = useCallback(async () => {
    if (!selectedOffice) return;
    
    try {
      setDeleteLoading(true);
      await OfficeApi.deleteOffice(selectedOffice.id);
      
      setOffices(prev => prev.filter(office => office.id !== selectedOffice.id));
      Alert.alert('Success', `Office "${selectedOffice.name}" deleted successfully`);
      setDeleteModalVisible(false);
      setSelectedOffice(null);
    } catch (err: any) {
      if (err instanceof EmployeeAssignmentError) {
        // Show more detailed warning for employee assignments
        Alert.alert(
          'Cannot Delete Office',
          err.message,
          [
            { text: 'OK' },
            { 
              text: 'View Employees', 
              onPress: () => console.log('Navigate to employees') 
            }
          ]
        );
      } else {
        Alert.alert('Error', err.message || 'Failed to delete office');
      }
    } finally {
      setDeleteLoading(false);
    }
  }, [selectedOffice]);

  // Cancel delete
  const cancelDelete = useCallback(() => {
    setDeleteModalVisible(false);
    setSelectedOffice(null);
  }, []);

  return {
    offices,
    loading,
    refreshing,
    error,
    deleteModalVisible,
    selectedOffice,
    deleteLoading,
    fetchOffices,
    createOffice,
    updateOffice,
    confirmDelete,
    deleteOffice,
    cancelDelete,
  };
};