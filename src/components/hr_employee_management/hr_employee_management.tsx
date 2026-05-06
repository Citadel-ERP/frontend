// hr_employee_management/hr_employee_management.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import WorkStatistics from './WorkStatistics';
import BulkUploadPayslips from './BulkUploadPayslips';
import BulkUploadEmployees from './BulkUploadEmployees';
import DesignationPriorityScreen from './priority';
import EventsScreen from './events';
import alert from '../../utils/Alert';

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

const mergeCityGroups = (existing: CityGroup[], incoming: CityGroup[]): CityGroup[] => {
  const cityMap = new Map<string, Employee[]>();

  for (const group of existing) {
    cityMap.set(group.city, [...group.employees]);
  }

  for (const group of incoming) {
    if (cityMap.has(group.city)) {
      const existingEmployees = cityMap.get(group.city)!;
      const existingIds = new Set(existingEmployees.map(e => e.employee_id));
      const newEmployees = group.employees.filter(e => !existingIds.has(e.employee_id));
      cityMap.set(group.city, [...existingEmployees, ...newEmployees]);
    } else {
      cityMap.set(group.city, [...group.employees]);
    }
  }

  return Array.from(cityMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([city, employees]) => ({ city, employees }));
};

const filterCityGroups = (cityGroups: CityGroup[], query: string): CityGroup[] => {
  if (!query.trim()) return cityGroups;
  return cityGroups
    .map(cityGroup => {
      const filteredEmployees = cityGroup.employees.filter(employee => {
        const fields = [
          employee.full_name?.toLowerCase(),
          employee.employee_id?.toLowerCase(),
          employee.email?.toLowerCase(),
          employee.designation?.toLowerCase(),
          employee.city?.toLowerCase(),
          `${employee.first_name} ${employee.last_name}`.toLowerCase(),
        ].filter(Boolean);
        return fields.some(f => f?.includes(query));
      });
      return filteredEmployees.length > 0 ? { ...cityGroup, employees: filteredEmployees } : null;
    })
    .filter(Boolean) as CityGroup[];
};

const PAGE_SIZE = 50;

const HREmployeeManager: React.FC<EmployeeManagementProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();
  const [token, setToken] = useState<string | null>(null);
  const [tokenLoaded, setTokenLoaded] = useState(false);

  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
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
  const [showUpdateOrder, setShowUpdateOrder] = useState(false);
  const [showEvents, setShowEvents] = useState(false);

  const [pagination, setPagination] = useState<PaginationInfo | null>(null);

  const currentPageRef        = useRef(1);
  const loadingMoreRef        = useRef(false);
  const loadingRef            = useRef(false);
  const paginationRef         = useRef<PaginationInfo | null>(null);
  const searchQueryRef        = useRef('');
  const tokenRef              = useRef<string | null>(null);
  const allEmployeesByCityRef = useRef<CityGroup[]>([]);

  const setLoadingMoreSynced = (val: boolean) => {
    loadingMoreRef.current = val;
    setLoadingMore(val);
  };
  const setLoadingSynced = (val: boolean) => {
    loadingRef.current = val;
    setLoading(val);
  };

  useEffect(() => {
    allEmployeesByCityRef.current = allEmployeesByCity;
  }, [allEmployeesByCity]);

  // ── Token ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const getToken = async () => {
      try {
        const foundToken = await AsyncStorage.getItem(TOKEN_KEY);
        if (foundToken) {
          tokenRef.current = foundToken;
          setToken(foundToken);
        } else {
          setError('Authentication token not found. Please login again.');
        }
      } catch {
        setError('Failed to retrieve authentication token');
      } finally {
        setTokenLoaded(true);
      }
    };
    getToken();
  }, []);

  useEffect(() => {
    if (tokenLoaded && token) {
      fetchEmployees(1, true);
    }
  }, [token, tokenLoaded]);

  // ── Search ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    searchQueryRef.current = searchQuery;
    const master = allEmployeesByCityRef.current;
    setFilteredEmployeesByCity(
      searchQuery.trim()
        ? filterCityGroups(master, searchQuery.toLowerCase())
        : master
    );
  }, [searchQuery, allEmployeesByCity]);

  // ── Core fetch ─────────────────────────────────────────────────────────────
  const fetchEmployees = useCallback(async (page: number, isReset: boolean) => {
    const tok = tokenRef.current;
    if (!tok) {
      setError('No authentication token available');
      return;
    }

    if (isReset) {
      setLoadingSynced(true);
    } else {
      setLoadingMoreSynced(true);
    }
    setError(null);

    try {
      const response = await fetch(`${BACKEND_URL}/manager/getAllEmployees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ token: tok, page, page_size: PAGE_SIZE }),
      });

      if (response.ok) {
        const data = await response.json();
        const incoming: CityGroup[] = data.employees_by_city || [];

        if (isReset) {
          setAllEmployeesByCity(incoming);
        } else {
          setAllEmployeesByCity(prev => mergeCityGroups(prev, incoming));
        }

        currentPageRef.current = page;

        if (data.pagination) {
          const p = { ...data.pagination, total_items: data.pagination.total_items || 0 };
          paginationRef.current = p;
          setPagination(p);
        }
      } else {
        const errorText = await response.text();
        let parsed: any;
        try { parsed = JSON.parse(errorText); } catch { parsed = { message: errorText }; }
        setError(parsed.message || `Server error: ${response.status}`);
      }
    } catch (err: any) {
      setError(`Network error: ${err.message}`);
    } finally {
      setLoadingSynced(false);
      setLoadingMoreSynced(false);
    }
  }, []);

  // ── Load next page ─────────────────────────────────────────────────────────
  const handleLoadMore = useCallback(() => {
    if (loadingMoreRef.current || loadingRef.current) return;
    if (!paginationRef.current?.has_next) return;
    if (searchQueryRef.current.trim() !== '') return;

    fetchEmployees(currentPageRef.current + 1, false);
  }, [fetchEmployees]);

  // ── Pull-to-refresh ────────────────────────────────────────────────────────
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEmployees(1, true);
    setRefreshing(false);
  };

  const handleEmployeePress      = (employee: Employee) => setSelectedEmployee(employee);
  const handleBackFromDetails    = () => setSelectedEmployee(null);
  const handleEmployeeDataChange = async () => fetchEmployees(1, true);
  const handleEmployeeAdded      = () => fetchEmployees(1, true);

  // ── Attendance download ────────────────────────────────────────────────────
  const downloadAttendanceReport = async (month: number, year: number, employeeId?: string) => {
    const tok = tokenRef.current;
    if (!tok) {
      alert('Error', 'Authentication required');
      throw new Error('Authentication required');
    }

    try {
      const response = await fetch(`${BACKEND_URL}/manager/downloadAllAttendanceReport`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tok, month, year }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData: any;
        try { errorData = JSON.parse(errorText); } catch { errorData = { message: errorText }; }
        const msg = errorData.message || 'Failed to download attendance report';
        alert('Error', msg);
        throw new Error(msg);
      }

      const data = await response.json();
      if (!data.file_url) {
        alert('Error', 'Invalid response from server');
        throw new Error('Invalid response from server');
      }

      const {
        file_url: fileUrl,
        filename = `attendance_report_${month}_${year}.xlsx`,
        month: monthName = '',
      } = data;

      alert(
        'Report Ready',
        `Attendance report for ${monthName} ${year} is ready. How would you like to access it?`,
        [
          {
            text: 'Open in Browser',
            onPress: async () => {
              try { await WebBrowser.openBrowserAsync(fileUrl); }
              catch { alert('Error', 'Could not open the file in browser'); }
            },
          },
          {
            text: 'Download & Share',
            onPress: async () => {
              try {
                setLoadingSynced(true);
                const fileUri = FileSystem.documentDirectory + filename;
                const result = await FileSystem.downloadAsync(fileUrl, fileUri);
                if (result.status !== 200) throw new Error(`Download failed: ${result.status}`);
                const canShare = await Sharing.isAvailableAsync();
                if (canShare) {
                  await Sharing.shareAsync(result.uri, {
                    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    dialogTitle: 'Share Attendance Report',
                    UTI: 'com.microsoft.excel.xlsx',
                  });
                } else {
                  Alert.alert('Info', `File saved to: ${fileUri}\n\nSharing is not available on this device.`);
                }
              } catch (err: any) {
                Alert.alert('Error', err.message || 'Failed to download. Try "Open in Browser".');
              } finally {
                setLoadingSynced(false);
              }
            },
          },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } catch (err: any) {
      throw err;
    }
  };

  // ── Derived counts ─────────────────────────────────────────────────────────
  const displayedCount = filteredEmployeesByCity.reduce((s, g) => s + g.employees.length, 0);
  const totalEmployees = pagination?.total_items
    ?? allEmployeesByCity.reduce((s, g) => s + g.employees.length, 0);

  // ── Screen routing ─────────────────────────────────────────────────────────
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
    return <HolidayManagement token={token || ''} onBack={() => setShowHolidayManagement(false)} />;
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
    return <WorkStatistics token={token || ''} onBack={() => setShowWorkStatistics(false)} />;
  }

  if (showBulkPayslips) {
    return <BulkUploadPayslips token={token || ''} onBack={() => setShowBulkPayslips(false)} />;
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

  if (showUpdateOrder) {
    return (
      <DesignationPriorityScreen
        token={token || ''}
        onBack={() => setShowUpdateOrder(false)}
      />
    );
  }

  if (showEvents) {
    return (
      <EventsScreen
        token={token || ''}
        onBack={() => setShowEvents(false)}
      />
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" backgroundColor="#2D3748" translucent={false} />
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
        onOpenUpdateOrder={() => setShowUpdateOrder(true)}
        onOpenEvents={() => setShowEvents(true)}
        placeholder="Search by name, ID, city, or designation..."
      />
      <EmployeeList
        employeesByCity={filteredEmployeesByCity}
        loading={loading}
        refreshing={refreshing}
        loadingMore={loadingMore}
        error={error}
        searchQuery={searchQuery}
        onRefresh={onRefresh}
        onEmployeePress={handleEmployeePress}
        onClearSearch={() => setSearchQuery('')}
        onEndReached={handleLoadMore}
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