// hr_employee_management/hr_employee_management.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  StatusBar,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Header } from './header';
import { EmployeeList } from './list';
import EmployeeDetails from './employeeDetails';
import { Employee, EmployeeManagementProps } from './types';
import { WHATSAPP_COLORS, TOKEN_KEY } from './constants';
import { styles } from './styles';
import { BACKEND_URL } from '../../config/config';
import SearchAndDownload from './searchAndDownload';
import AddEmployeeModal from './addEmployeeModal';
import HolidayManagement from './holiday';
// import AssetsManagement from './assets';

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
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [showHolidayManagement, setShowHolidayManagement] = useState(false);
  // const [showAssetsManagement, setShowAssetsManagement] = useState(false);

  // Get token on mount - with enhanced debugging
  useEffect(() => {
    const getToken = async () => {
      try {
        console.log('=== Getting token from AsyncStorage ===');
        console.log('Trying TOKEN_KEY:', TOKEN_KEY);
        
        // Try multiple possible token keys
        const possibleKeys = ['user_token', 'token', 'authToken', 'auth_token', 'userToken'];
        
        let foundToken = null;
        let foundKey = null;
        
        // Try the defined TOKEN_KEY first
        foundToken = await AsyncStorage.getItem(TOKEN_KEY);
        if (foundToken) {
          foundKey = TOKEN_KEY;
          console.log(`✅ Token found with key: ${TOKEN_KEY}`);
        } else {
          console.log(`❌ No token with key: ${TOKEN_KEY}`);
          
          // Try other possible keys
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
        
        // Log all keys in AsyncStorage for debugging
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

  const downloadAllEmployees = async () => {
    if (!token) {
      Alert.alert('Error', 'Authentication required');
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/manager/downloadEmployeeDetails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        const data = await response.json();
        Alert.alert('Success', 'Employee data downloaded successfully');
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || 'Failed to download');
      }
    } catch (error) {
      console.error('Download error:', error);
      Alert.alert('Error', 'Network error occurred');
    }
  };

  const downloadAttendanceReport = async () => {
    if (!token) {
      Alert.alert('Error', 'Authentication required');
      return;
    }

    try {
      const response = await fetch(`${BACKEND_URL}/manager/downloadAttendanceReport`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        const data = await response.json();
        Alert.alert('Success', 'Attendance report downloaded successfully');
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || 'Failed to download attendance report');
      }
    } catch (error) {
      console.error('Download attendance error:', error);
      Alert.alert('Error', 'Network error occurred');
    }
  };

  const handleAddEmployee = async (employeeData: any) => {
    if (!token) return;

    try {
      const response = await fetch(`${BACKEND_URL}/manager/addEmployee`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...employeeData }),
      });

      if (response.ok) {
        Alert.alert('Success', 'Employee added successfully');
        setShowAddEmployee(false);
        fetchEmployees();
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || 'Failed to add employee');
      }
    } catch (error) {
      console.error('Add employee error:', error);
      Alert.alert('Error', 'Network error occurred');
    }
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

  // if (showAssetsManagement) {
  //   return (
  //     <AssetsManagement
  //       token={token || ''}
  //       onBack={() => setShowAssetsManagement(false)}
  //     />
  //   );
  // }

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
        showAddEmployee={() => setShowAddEmployee(true)}
      />

      <SearchAndDownload
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onDownloadEmployees={downloadAllEmployees}
        onDownloadAttendance={downloadAttendanceReport}
        onOpenHolidays={() => setShowHolidayManagement(true)}
        // onOpenAssets={() => setShowAssetsManagement(true)}
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

      <AddEmployeeModal
        visible={showAddEmployee}
        onClose={() => setShowAddEmployee(false)}
        onSubmit={handleAddEmployee}
        token={token || ''}
      />
    </View>
  );
};

export default HREmployeeManager;