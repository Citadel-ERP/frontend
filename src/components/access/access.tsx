// access/Access.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  BackHandler,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { BACKEND_URL } from '../../config/config';
import {
  AccessProps,
  Employee,
  ModuleItem,
  ActiveTab,
  ViewMode,
  TOKEN_KEY,
  COLORS,
} from './types';

import Header from './header';
import Navigation from './navigation';
import Search from './search';
import AccessList from './list';
import EmployeeDetails from './employeeDetails';
import ModuleDetails from './moduleDetails';

const Access: React.FC<AccessProps> = ({ onBack }) => {
  const insets = useSafeAreaInsets();

  // ── Auth ──────────────────────────────────────────────────────────────────
  const [token, setToken] = useState<string | null>(null);

  // ── Data ──────────────────────────────────────────────────────────────────
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [modules, setModules] = useState<ModuleItem[]>([]);

  // ── UI state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<ActiveTab>('employees');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ── Selection state ───────────────────────────────────────────────────────
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedModule, setSelectedModule] = useState<ModuleItem | null>(null);

  // ── Load token ────────────────────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(TOKEN_KEY).then((t) => setToken(t)).catch(console.error);
  }, []);

  // ── Fetch employees ───────────────────────────────────────────────────────
  const fetchEmployees = useCallback(
    async (silent = false) => {
      if (!token) return;
      if (!silent) setLoading(true);
      else setRefreshing(true);
      try {
        const response = await fetch(`${BACKEND_URL}/citadel_admin/getAllEmployeesAccess`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await response.json();
        if (response.ok && data.employees) {
          setEmployees(data.employees);
        }
      } catch (err) {
        console.error('fetchEmployees error:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token],
  );

  // ── Fetch modules (from getUser or a dedicated endpoint) ──────────────────
  // We use getEmployeeData? No — we need standalone module list.
  // We fetch a sample employee's data to get all modules OR we can call getAllEmployees
  // and then getEmployeeData for the first employee. But the cleanest approach is
  // to call getUser which already returns modules. Here we use a lightweight
  // approach: call getEmployeeData for the logged-in user (self) to get all modules.
  // Actually, looking at the backend: getAllEmployees gives us users,
  // getEmployeeData gives us a user's modules list (all modules + access flag).
  // To get ALL modules for the modules tab, we call getEmployeeData on any employee.
  // The modules list returned is always ALL modules (with access boolean).
  // So we call it once using any employee_id; we reuse getEmployeeData.
  const fetchModules = useCallback(
    async (silent = false) => {
      if (!token) return;
      if (!silent) setLoading(true);
      else setRefreshing(true);
      try {
        // We need all employees loaded first to pick one employee_id
        // to call getEmployeeData which returns all modules.
        // Alternative: call getUser which also gives us modules.
        const response = await fetch(`${BACKEND_URL}/core/getUser`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await response.json();
        if (response.ok && data.modules) {
          // data.modules is an array of ModuleItem from getUser
          setModules(data.modules as ModuleItem[]);
        }
      } catch (err) {
        console.error('fetchModules error:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token],
  );

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (token) {
      fetchEmployees();
      fetchModules();
    }
  }, [token, fetchEmployees, fetchModules]);

  // ── Tab change resets search ───────────────────────────────────────────────
  const handleTabChange = useCallback((tab: ActiveTab) => {
    setActiveTab(tab);
    setSearchQuery('');
  }, []);

  // ── Navigation ────────────────────────────────────────────────────────────
  const handleEmployeePress = useCallback((employee: Employee) => {
    setSelectedEmployee(employee);
    setViewMode('employeeDetail');
  }, []);

  const handleModulePress = useCallback((module: ModuleItem) => {
    setSelectedModule(module);
    setViewMode('moduleDetail');
  }, []);

  const handleBack = useCallback(() => {
    if (viewMode !== 'list') {
      setViewMode('list');
      setSelectedEmployee(null);
      setSelectedModule(null);
    } else {
      onBack();
    }
  }, [viewMode, onBack]);

  // ── Android back button ───────────────────────────────────────────────────
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true;
    });
    return () => sub.remove();
  }, [handleBack]);

  // ── Module updated callback (from ModuleDetails edit) ─────────────────────
  const handleModuleUpdated = useCallback((updated: ModuleItem) => {
    setModules((prev) => prev.map((m) => (m.module_id === updated.module_id ? updated : m)));
    setSelectedModule(updated);
  }, []);

  // ── Refresh handler ───────────────────────────────────────────────────────
  const handleRefresh = useCallback(() => {
    if (activeTab === 'employees') fetchEmployees(true);
    else fetchModules(true);
  }, [activeTab, fetchEmployees, fetchModules]);

  // ── Computed header title ─────────────────────────────────────────────────
  const headerTitle = useMemo(() => {
    if (viewMode === 'employeeDetail' && selectedEmployee) {
      return selectedEmployee.full_name || selectedEmployee.first_name;
    }
    if (viewMode === 'moduleDetail' && selectedModule) {
      return selectedModule.module_name;
    }
    return 'Access Control';
  }, [viewMode, selectedEmployee, selectedModule]);

  // ── Computed search placeholder ───────────────────────────────────────────
  const searchPlaceholder = useMemo(
    () => (activeTab === 'employees' ? 'Search employees by name, email…' : 'Search modules by name…'),
    [activeTab],
  );

  // ── Filtered counts for navigation badges ─────────────────────────────────
  const { employeeCount, moduleCount } = useMemo(() => ({
    employeeCount: employees.length,
    moduleCount: modules.length,
  }), [employees, modules]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} translucent={false} />

      {/* ── Header ── */}
      <Header
        title={headerTitle}
        onBack={handleBack}
        rightAction={
          viewMode === 'list'
            ? {
                icon: 'refresh',
                onPress: handleRefresh,
                color: COLORS.secondary,
              }
            : undefined
        }
        loading={loading}
      />

      {/* ── Content ── */}
      {viewMode === 'list' && (
        <>
          {/* Tab navigation */}
          <Navigation
            activeTab={activeTab}
            onTabChange={handleTabChange}
            employeeCount={employeeCount}
            moduleCount={moduleCount}
          />

          {/* Search */}
          <Search
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={searchPlaceholder}
          />

          {/* List */}
          <AccessList
            tab={activeTab}
            employees={employees}
            modules={modules}
            loading={loading && employees.length === 0 && modules.length === 0}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            onEmployeePress={handleEmployeePress}
            onModulePress={handleModulePress}
            searchQuery={searchQuery}
          />
        </>
      )}

      {viewMode === 'employeeDetail' && selectedEmployee && (
        <EmployeeDetails
          employee={selectedEmployee}
          token={token}
          onBack={handleBack}
        />
      )}

      {viewMode === 'moduleDetail' && selectedModule && (
        <ModuleDetails
          module={selectedModule}
          token={token}
          onBack={handleBack}
          onModuleUpdated={handleModuleUpdated}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});

export default Access;