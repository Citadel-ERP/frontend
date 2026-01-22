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
import AssetsManagement from './assets';

const HREmployeeManager: React.FC<EmployeeManagementProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [showHolidayManagement, setShowHolidayManagement] = useState(false);
  const [showAssetsManagement, setShowAssetsManagement] = useState(false);

  useEffect(() => {
    const getToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        setToken(storedToken);
      } catch (error) {
        console.error('Error getting token:', error);
      }
    };
    getToken();
  }, []);

  useEffect(() => {
    if (token) {
      fetchEmployees();
    }
  }, [token]);

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
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${BACKEND_URL}/hr_manager/getAllEmployees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
        setFilteredEmployees(data);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to fetch employees');
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
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
      const response = await fetch(`${BACKEND_URL}/hr_manager/downloadEmployeeDetails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (response.ok) {
        const data = await response.json();
        // Handle download - show success message
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

  const handleAddEmployee = async (employeeData: any) => {
    if (!token) return;

    try {
      const response = await fetch(`${BACKEND_URL}/hr_manager/addEmployee`, {
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

  if (showAssetsManagement) {
    return (
      <AssetsManagement
        token={token || ''}
        onBack={() => setShowAssetsManagement(false)}
      />
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#2D3748" />

      <Header
        title="Employee Management"
        subtitle={`${filteredEmployees.length} employee${filteredEmployees.length !== 1 ? 's' : ''}`}
        onBack={onBack}
        onRefresh={fetchEmployees}
        showRefresh={true}
        showAddEmployee={() => setShowAddEmployee(true)}
        showHolidayManagement={() => setShowHolidayManagement(true)}
        showAssetsManagement={() => setShowAssetsManagement(true)}
      />

      <SearchAndDownload
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onDownload={downloadAllEmployees}
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