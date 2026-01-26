// hr_employee_management/hr_employee_management.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  StatusBar,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { Header } from './header';
import { EmployeeList } from './list';
import EmployeeDetails from './employeeDetails';
import { Employee, EmployeeManagementProps } from './types';
import { WHATSAPP_COLORS, TOKEN_KEY } from './constants';
import { styles } from './styles';
import { BACKEND_URL } from '../../config/config';
import SearchAndDownload from './searchAndDownload';
import AddEmployeeScreen from './AddEmployeeScreen';
import HolidayManagement from './holiday';
import AttendanceDownloadModal from './AttendanceDownloadModal';

const HREmployeeManager: React.FC<EmployeeManagementProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const [token, setToken] = useState<string | null>(null);
  const [tokenLoaded, setTokenLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showHolidayManagement, setShowHolidayManagement] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showAddEmployeeScreen, setShowAddEmployeeScreen] = useState(false);

  // Get token on mount - with enhanced debugging
  useEffect(() => {
    const getToken = async () => {
      try {
        console.log('=== Getting token from AsyncStorage ===');
        console.log('Trying TOKEN_KEY:', TOKEN_KEY);
        
        const possibleKeys = ['user_token', 'token', 'authToken', 'auth_token', 'userToken'];
        
        let foundToken = null;
        let foundKey = null;
        
        foundToken = await AsyncStorage.getItem(TOKEN_KEY);
        if (foundToken) {
          foundKey = TOKEN_KEY;
          console.log(`✅ Token found with key: ${TOKEN_KEY}`);
        } else {
          console.log(`❌ No token with key: ${TOKEN_KEY}`);
          
          for (const key of possibleKeys) {
            const testToken = await AsyncStorage.getItem(key);
            if (testToken) {
              foundToken = testToken;
              foundKey = key;
              console.log(`✅ Token found with alternate key: ${key}`);
              break;
            }
          }
        }
        
        const allKeys = await AsyncStorage.getAllKeys();
        console.log('All keys in AsyncStorage:', allKeys);
        
        if (foundToken) {
          console.log('Token value (first 30 chars):', foundToken.substring(0, 30) + '...');
          setToken(foundToken);
        } else {
          console.log('❌ No token found in AsyncStorage at all');
          setError('Authentication token not found. Please login again.');
        }
        
        setTokenLoaded(true);
      } catch (error) {
        console.error('Error getting token:', error);
        setError('Failed to retrieve authentication token');
        setTokenLoaded(true);
      }
    };
    getToken();
  }, []);

  // Fetch employees when token is available
  useEffect(() => {
    console.log('=== Token Effect Triggered ===');
    console.log('Token:', token ? 'exists' : 'null');
    console.log('Token Loaded:', tokenLoaded);
    
    if (tokenLoaded && token) {
      console.log('Conditions met - calling fetchEmployees');
      fetchEmployees();
    } else if (tokenLoaded && !token) {
      console.log('Token loaded but is null - not fetching');
      setLoading(false);
    }
  }, [token, tokenLoaded]);

  // Filter employees based on search
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredEmployees(employees);
    } else {
      const filtered = employees.filter(emp =>
        emp.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.employee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        emp.designation?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredEmployees(filtered);
    }
  }, [searchQuery, employees]);

  const fetchEmployees = async () => {
    console.log('=== fetchEmployees called ===');
    
    if (!token) {
      console.log('No token available for fetch - aborting');
      setError('No authentication token available');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = `${BACKEND_URL}/manager/getAllEmployees`;
      console.log('Fetching from URL:', url);
      console.log('Request body token (first 30 chars):', token.substring(0, 30) + '...');
      
      const response = await fetch(url, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      console.log('Response received - Status:', response.status);
      console.log('Response OK:', response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ SUCCESS - Employees fetched:', data.length);
        if (data.length > 0) {
          console.log('First employee sample:', {
            name: data[0].full_name,
            id: data[0].employee_id
          });
        }
        setEmployees(data);
        setFilteredEmployees(data);
      } else {
        const errorText = await response.text();
        console.error('❌ ERROR Response:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        
        const errorMessage = errorData.message || `Server error: ${response.status}`;
        console.error('Error message:', errorMessage);
        setError(errorMessage);
      }
    } catch (error: any) {
      console.error('❌ FETCH ERROR:', error);
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      setError(`Network error: ${error.message}`);
    } finally {
      console.log('=== fetchEmployees completed ===');
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    console.log('=== Manual refresh triggered ===');
    setRefreshing(true);
    await fetchEmployees();
    setRefreshing(false);
  };

  const handleEmployeePress = (employee: Employee) => {
    setSelectedEmployee(employee);
  };

  const handleBackFromDetails = () => {
    setSelectedEmployee(null);
  };

  const downloadAttendanceReport = async (month: number, year: number, employeeId?: string) => {
    if (!token) {
      Alert.alert('Error', 'Authentication required');
      throw new Error('Authentication required');
    }

    try {
      console.log('Downloading attendance report:', { month, year, employeeId });

      const response = await fetch(`${BACKEND_URL}/manager/downloadAllAttendanceReport`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token, 
          month, 
          year
        }),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        
        const errorMessage = errorData.message || 'Failed to download attendance report';
        Alert.alert('Error', errorMessage);
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Success response:', data);

      if (!data.file_url) {
        Alert.alert('Error', 'Invalid response from server');
        throw new Error('Invalid response from server');
      }

      const fileUrl = data.file_url;
      const filename = data.filename || `attendance_report_all_employees_${month}_${year}.pdf`;
      const monthName = data.month || '';

      // Show download options alert (similar to attendance.tsx)
      Alert.alert(
        'Download Report',
        `Attendance report for ${monthName} ${year} is ready. Choose how you want to access it:`,
        [
          {
            text: 'Open in Browser',
            onPress: async () => {
              try {
                await WebBrowser.openBrowserAsync(fileUrl);
              } catch (err) {
                console.error('Failed to open browser:', err);
                Alert.alert('Error', 'Could not open the file in browser');
              }
            },
          },
          {
            text: 'Download & Share',
            onPress: async () => {
              try {
                setLoading(true);
                
                // Fetch the PDF from the URL
                const pdfResponse = await fetch(fileUrl);
                if (!pdfResponse.ok) {
                  throw new Error('Failed to fetch PDF from server');
                }
                
                // Convert to blob and then to base64
                const blob = await pdfResponse.blob();
                const reader = new FileReader();
                
                reader.onloadend = async () => {
                  try {
                    const base64data = reader.result as string;
                    const base64Content = base64data.split(',')[1];
                    
                    // Save to device storage
                    const fileUri = FileSystem.documentDirectory + filename;
                    await FileSystem.writeAsStringAsync(fileUri, base64Content, {
                      encoding: FileSystem.EncodingType.Base64,
                    });

                    // Share the file
                    const canShare = await Sharing.isAvailableAsync();
                    if (canShare) {
                      await Sharing.shareAsync(fileUri, {
                        mimeType: 'application/pdf',
                        dialogTitle: 'Share Attendance Report',
                        UTI: 'com.adobe.pdf',
                      });
                      Alert.alert('Success', 'Report downloaded successfully!');
                    } else {
                      Alert.alert('Info', 'File saved to app directory but sharing is not available on this device');
                    }
                  } catch (shareError) {
                    console.error('Share error:', shareError);
                    Alert.alert('Error', 'Failed to share PDF. The file may have been saved to app directory.');
                  } finally {
                    setLoading(false);
                  }
                };
                
                reader.onerror = () => {
                  console.error('FileReader error');
                  Alert.alert('Error', 'Failed to process PDF');
                  setLoading(false);
                };
                
                reader.readAsDataURL(blob);
              } catch (err) {
                console.error('Download error:', err);
                Alert.alert('Error', 'Failed to download PDF. Please try again.');
                setLoading(false);
              }
            },
          },
          {
            text: 'Cancel',
            style: 'cancel',
          },
        ]
      );

    } catch (error: any) {
      console.error('Download attendance error:', error);
      // Error already handled above, just rethrow for modal to catch
      throw error;
    }
  };

  // Handle employee addition success
  const handleEmployeeAdded = () => {
    fetchEmployees(); // Refresh the employee list
  };

  if (selectedEmployee) {
    return (
      <EmployeeDetails
        employee={selectedEmployee}
        onBack={handleBackFromDetails}
        token={token || ''}
      />
    );
  }

  if (showHolidayManagement) {
    return (
      <HolidayManagement
        token={token || ''}
        onBack={() => setShowHolidayManagement(false)}
      />
    );
  }

  if (showAddEmployeeScreen) {
    return (
      <AddEmployeeScreen
        token={token || ''}
        onBack={() => setShowAddEmployeeScreen(false)}
        onEmployeeAdded={handleEmployeeAdded}
      />
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle="light-content" 
        backgroundColor="#2D3748" 
        translucent={false}
      />
      
      <Header
        title="HR Management"
        subtitle={`${filteredEmployees.length} employee${filteredEmployees.length !== 1 ? 's' : ''}`}
        onBack={onBack}
        showAddEmployee={() => setShowAddEmployeeScreen(true)}
      />

      <SearchAndDownload
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onDownloadAttendance={() => setShowAttendanceModal(true)}
        onOpenHolidays={() => setShowHolidayManagement(true)}
        placeholder="Search employees..."
      />

      <EmployeeList
        employees={filteredEmployees}
        loading={loading}
        refreshing={refreshing}
        error={error}
        searchQuery={searchQuery}
        onRefresh={onRefresh}
        onEmployeePress={handleEmployeePress}
        onClearSearch={() => setSearchQuery('')}
      />

      <AttendanceDownloadModal
        visible={showAttendanceModal}
        onClose={() => setShowAttendanceModal(false)}
        onDownload={downloadAttendanceReport}
      />
    </View>
  );
};

export default HREmployeeManager;