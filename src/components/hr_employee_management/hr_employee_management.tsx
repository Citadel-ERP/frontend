// hr_employee_management/hr_employee_management.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  StatusBar,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
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
import WorkStatistics from './WorkStatistics';
import BulkUploadPayslips from './BulkUploadPayslips';
import BulkUploadEmployees from './BulkUploadEmployees';

interface CityGroup {
  city: string;
  employees: Employee[];
}

interface PaginationInfo {
  current_page: number;
  total_pages: number;
  total_items: number;
  has_next: boolean;
  has_previous: boolean;
  page_size: number;
  next_page: number | null;
  previous_page: number | null;
}

const HREmployeeManager: React.FC<EmployeeManagementProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const [token, setToken] = useState<string | null>(null);
  const [tokenLoaded, setTokenLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [allEmployeesByCity, setAllEmployeesByCity] = useState<CityGroup[]>([]);
  const [filteredEmployeesByCity, setFilteredEmployeesByCity] = useState<CityGroup[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [showHolidayManagement, setShowHolidayManagement] = useState(false);
  const [showAttendanceModal, setShowAttendanceModal] = useState(false);
  const [showAddEmployeeScreen, setShowAddEmployeeScreen] = useState(false);
  const [showWorkStatistics, setShowWorkStatistics] = useState(false);
  const [showBulkPayslips, setShowBulkPayslips] = useState(false);
  const [showBulkEmployees, setShowBulkEmployees] = useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);

  // Get token on mount
  useEffect(() => {
    const getToken = async () => {
      try {
        console.log('=== Getting token from AsyncStorage ===');
        console.log('Trying TOKEN_KEY:', TOKEN_KEY);
        const foundToken = await AsyncStorage.getItem(TOKEN_KEY);
        if (foundToken) {
          console.log(`✅ Token found with key: ${TOKEN_KEY}`);
          setToken(foundToken);
        } else {
          console.log(`❌ No token with key: ${TOKEN_KEY}`);
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
    if (tokenLoaded && token) {
      fetchEmployees(1);
    }
  }, [token, tokenLoaded]);

  // Filter employees when search query changes
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredEmployeesByCity(allEmployeesByCity);
    } else {
      filterEmployees(searchQuery.toLowerCase());
    }
  }, [searchQuery, allEmployeesByCity]);

  const filterEmployees = (query: string) => {
    if (allEmployeesByCity.length === 0) return;

    const filtered = allEmployeesByCity
      .map(cityGroup => {
        const filteredEmployees = cityGroup.employees.filter(employee => {
          const searchableFields = [
            employee.full_name?.toLowerCase(),
            employee.employee_id?.toLowerCase(),
            employee.email?.toLowerCase(),
            employee.designation?.toLowerCase(),
            employee.city?.toLowerCase(),
            `${employee.first_name} ${employee.last_name}`.toLowerCase(),
          ].filter(Boolean);

          return searchableFields.some(field =>
            field?.includes(query)
          );
        });

        if (filteredEmployees.length > 0) {
          return {
            ...cityGroup,
            employees: filteredEmployees
          };
        }
        return null;
      })
      .filter(Boolean) as CityGroup[];

    console.log('Filtered employees:', {
      query,
      totalCities: filtered.length,
      totalEmployees: filtered.reduce((sum, group) => sum + group.employees.length, 0)
    });

    setFilteredEmployeesByCity(filtered);
  };

  const fetchEmployees = async (page: number = 1) => {
    console.log('=== fetchEmployees called ===');
    console.log('Page:', page);
    
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
      
      const requestBody = {
        token,
        page,
        page_size: 100,
      };
      
      console.log('Request Body:', JSON.stringify(requestBody));

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      console.log('Response Status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ SUCCESS - Data received');
        console.log('Total items in pagination:', data.pagination?.total_items);
        console.log('Cities count:', data.employees_by_city?.length);

        setAllEmployeesByCity(data.employees_by_city || []);
        setFilteredEmployeesByCity(data.employees_by_city || []);
        setCurrentPage(page);

        if (data.pagination) {
          const paginationData = {
            ...data.pagination,
            total_items: data.pagination.total_items || data.pagination.total_employees || 0
          };
          setPagination(paginationData);
        }
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
        setError(errorMessage);
      }
    } catch (error: any) {
      console.error('❌ FETCH ERROR:', error);
      setError(`Network error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    console.log('=== Manual refresh triggered ===');
    setRefreshing(true);
    await fetchEmployees(1);
    setRefreshing(false);
  };

  const handleEmployeePress = (employee: Employee) => {
    setSelectedEmployee(employee);
  };

  const handleBackFromDetails = () => {
    setSelectedEmployee(null);
  };

  // Handle data changes from employee details screen
  const handleEmployeeDataChange = async () => {
    console.log('=== Employee data changed, refreshing list ===');
    await fetchEmployees(currentPage);
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
                const pdfResponse = await fetch(fileUrl);
                
                if (!pdfResponse.ok) {
                  throw new Error('Failed to fetch PDF from server');
                }

                const blob = await pdfResponse.blob();
                const reader = new FileReader();
                
                reader.onloadend = async () => {
                  try {
                    const base64data = reader.result as string;
                    const base64Content = base64data.split(',')[1];
                    const fileUri = FileSystem.documentDirectory + filename;

                    await FileSystem.writeAsStringAsync(fileUri, base64Content, {
                      encoding: FileSystem.EncodingType.Base64,
                    });

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
      throw error;
    }
  };

  const handleEmployeeAdded = () => {
    fetchEmployees(1);
  };

  const getTotalDisplayedEmployees = () => {
    return filteredEmployeesByCity.reduce((sum, group) => sum + (group.employees?.length || 0), 0);
  };

  const getAllEmployeesCount = () => {
    return allEmployeesByCity.reduce((sum, group) => sum + (group.employees?.length || 0), 0);
  };

  // Route to different screens based on state
  if (selectedEmployee) {
    return (
      <EmployeeDetails
        employee={selectedEmployee}
        onBack={handleBackFromDetails}
        token={token || ''}
        onDataChange={handleEmployeeDataChange}
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

  if (showWorkStatistics) {
    return (
      <WorkStatistics
        token={token || ''}
        onBack={() => setShowWorkStatistics(false)}
      />
    );
  }

  if (showBulkPayslips) {
    return (
      <BulkUploadPayslips
        token={token || ''}
        onBack={() => setShowBulkPayslips(false)}
      />
    );
  }

  if (showBulkEmployees) {
    return (
      <BulkUploadEmployees
        token={token || ''}
        onBack={() => setShowBulkEmployees(false)}
        onEmployeesAdded={handleEmployeeAdded}
      />
    );
  }

  const allEmployeesCount = getAllEmployeesCount();
  const displayedCount = getTotalDisplayedEmployees();
  const totalEmployees = pagination?.total_items || allEmployeesCount;

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#2D3748"
        translucent={false}
      />
      
      <Header
        title="HR Management"
        subtitle={
          searchQuery
            ? `${displayedCount} employee${displayedCount !== 1 ? 's' : ''} found`
            : `${totalEmployees} employee${totalEmployees !== 1 ? 's' : ''}`
        }
        onBack={onBack}
        showAddEmployee={() => setShowAddEmployeeScreen(true)}
      />
      
      <SearchAndDownload
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onDownloadAttendance={() => setShowAttendanceModal(true)}
        onOpenHolidays={() => setShowHolidayManagement(true)}
        onOpenWorkStats={() => setShowWorkStatistics(true)}
        onOpenBulkPayslips={() => setShowBulkPayslips(true)}
        onOpenBulkEmployees={() => setShowBulkEmployees(true)}
        placeholder="Search by name, ID, city, or designation..."
      />
      
      <EmployeeList
        employeesByCity={filteredEmployeesByCity}
        loading={loading}
        refreshing={refreshing}
        error={error}
        searchQuery={searchQuery}
        onRefresh={onRefresh}
        onEmployeePress={handleEmployeePress}
        onClearSearch={() => setSearchQuery('')}
        totalEmployees={totalEmployees}
        displayedEmployees={displayedCount}
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