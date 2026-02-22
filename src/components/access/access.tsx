// access/Access.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  StyleSheet,
  StatusBar,
  BackHandler,
  ScrollView,
  Dimensions,
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

  const [token, setToken] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('employees');
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [selectedModule, setSelectedModule] = useState<ModuleItem | null>(null);

  // ── Load token ─────────────────────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(TOKEN_KEY).then((t) => setToken(t)).catch(console.error);
  }, []);

  // ── Fetch employees ────────────────────────────────────────────────────────
  const fetchEmployees = useCallback(async (silent = false) => {
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
      if (response.ok && data.employees) setEmployees(data.employees);
    } catch (err) {
      console.error('fetchEmployees error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  // ── Fetch modules ──────────────────────────────────────────────────────────
  const fetchModules = useCallback(async (silent = false) => {
    if (!token) return;
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const response = await fetch(`${BACKEND_URL}/citadel_admin/getAllModulesAccess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = await response.json();
      if (response.ok && data.modules) setModules(data.modules as ModuleItem[]);
    } catch (err) {
      console.error('fetchModules error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchEmployees();
      fetchModules();
    }
  }, [token, fetchEmployees, fetchModules]);

  // ── Tab change ─────────────────────────────────────────────────────────────
  const handleTabChange = useCallback((tab: ActiveTab) => {
    setActiveTab(tab);
    setSearchQuery('');
  }, []);

  // ── Navigation ─────────────────────────────────────────────────────────────
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

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBack();
      return true;
    });
    return () => sub.remove();
  }, [handleBack]);

  const handleModuleUpdated = useCallback((updated: ModuleItem) => {
    setModules((prev) => prev.map((m) => (m.module_id === updated.module_id ? updated : m)));
    setSelectedModule(updated);
  }, []);

  const handleRefresh = useCallback(() => {
    if (activeTab === 'employees') fetchEmployees(true);
    else fetchModules(true);
  }, [activeTab, fetchEmployees, fetchModules]);

  // ── Computed values ────────────────────────────────────────────────────────
  const headerTitle = useMemo(() => {
    if (viewMode === 'employeeDetail' && selectedEmployee)
      return selectedEmployee.full_name || selectedEmployee.first_name;
    if (viewMode === 'moduleDetail' && selectedModule)
      return selectedModule.module_name;
    return 'Access Control';
  }, [viewMode, selectedEmployee, selectedModule]);

  const headerSubtitle = useMemo(() => {
    if (viewMode !== 'list') return undefined;
    if (activeTab === 'employees')
      return `${employees.length} employee${employees.length !== 1 ? 's' : ''}`;
    return `${modules.length} module${modules.length !== 1 ? 's' : ''}`;
  }, [viewMode, activeTab, employees.length, modules.length]);

  const searchPlaceholder = useMemo(
    () => (activeTab === 'employees' ? 'Search employees by name, email…' : 'Search modules by name…'),
    [activeTab],
  );

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      {viewMode === 'list' && (
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshing={refreshing}
          onRefresh={handleRefresh}
        >
          <Header
            title={headerTitle}
            subtitle={headerSubtitle}
            onBack={handleBack}
            loading={loading}
          />

          <Navigation
            activeTab={activeTab}
            onTabChange={handleTabChange}
            employeeCount={employees.length}
            moduleCount={modules.length}
          />

          <Search
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={searchPlaceholder}
          />

          <AccessList
            tab={activeTab}
            employees={employees}
            modules={modules}
            loading={loading && employees.length === 0 && modules.length === 0}
            refreshing={false}
            onRefresh={handleRefresh}
            onEmployeePress={handleEmployeePress}
            onModulePress={handleModulePress}
            searchQuery={searchQuery}
          />
        </ScrollView>
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
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
});

export default Access;