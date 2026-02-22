// access/list.tsx
import React, { useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Employee, ModuleItem, ActiveTab, COLORS } from './types';

// ─── Employee Avatar ──────────────────────────────────────────────────────────
const AVATAR_PALETTE = ['#00d285', '#ff5e7a', '#ffb157', '#0984e3', '#6c5ce7', '#fd79a8', '#e17055'];

const getInitials = (name: string): string => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '?';
  return ((parts[0][0] ?? '') + (parts[parts.length - 1][0] ?? '')).toUpperCase();
};

const getAvatarColor = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
};

// ─── Employee Row ─────────────────────────────────────────────────────────────
interface EmployeeRowProps {
  employee: Employee;
  onPress: (employee: Employee) => void;
}

const EmployeeRow: React.FC<EmployeeRowProps> = React.memo(({ employee, onPress }) => {
  const name = employee.full_name || `${employee.first_name} ${employee.last_name ?? ''}`.trim();
  const initials = getInitials(name);
  const avatarColor = getAvatarColor(employee.employee_id);

  const roleColor: Record<string, string> = {
    admin: '#0984e3',
    manager: '#6c5ce7',
    employee: COLORS.primary,
  };

  return (
    <TouchableOpacity style={styles.row} onPress={() => onPress(employee)} activeOpacity={0.7}>
      <View style={styles.avatarContainer}>
        {employee.profile_picture ? (
          <Image source={{ uri: employee.profile_picture }} style={styles.avatarImage} />
        ) : (
          <View style={[styles.avatarFallback, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        )}
        <View style={[styles.roleDot, { backgroundColor: roleColor[employee.role] ?? COLORS.primary }]} />
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{name}</Text>
        <Text style={styles.email} numberOfLines={1}>{employee.email ?? 'No email'}</Text>
        <View style={styles.metaRow}>
          {employee.designation ? (
            <Text style={styles.designation} numberOfLines={1}>{employee.designation}</Text>
          ) : null}
          <View style={[styles.roleChip, { backgroundColor: (roleColor[employee.role] ?? COLORS.primary) + '18' }]}>
            <Text style={[styles.roleChipText, { color: roleColor[employee.role] ?? COLORS.primary }]}>
              {employee.role.charAt(0).toUpperCase() + employee.role.slice(1)}
            </Text>
          </View>
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
    </TouchableOpacity>
  );
});

// ─── Module Row ───────────────────────────────────────────────────────────────
interface ModuleRowProps {
  module: ModuleItem;
  onPress: (module: ModuleItem) => void;
}

const MODULE_COLORS: Record<string, string> = {
  attendance: '#00d285',
  cab: '#ff5e7a',
  hr: '#ffb157',
  bdt: '#0984e3',
  driver: '#6c5ce7',
  driver_manager: '#6c5ce7',
  bup: '#ffb157',
  scout_boy: '#fdcb6e',
  site_manager: '#fd79a8',
  reminder: '#a29bfe',
  medical: '#d63031',
  mediclaim: '#d63031',
  employee_management: '#74b9ff',
  access: '#00b894',
};

const getModuleAccentColor = (uniqueName: string): string =>
  MODULE_COLORS[uniqueName] ?? COLORS.primary;

const ModuleRow: React.FC<ModuleRowProps> = React.memo(({ module, onPress }) => {
  const accentColor = getModuleAccentColor(module.module_unique_name);

  return (
    <TouchableOpacity style={styles.row} onPress={() => onPress(module)} activeOpacity={0.7}>
      <View style={[styles.moduleIconWrapper, { backgroundColor: accentColor + '18' }]}>
        {module.module_icon ? (
          <Image source={{ uri: module.module_icon }} style={styles.moduleIcon} resizeMode="contain" />
        ) : (
          <Ionicons name="grid" size={22} color={accentColor} />
        )}
      </View>

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>{module.module_name}</Text>
        <Text style={styles.email} numberOfLines={1}>ID: {module.module_unique_name}</Text>
        <View style={styles.metaRow}>
          {module.is_generic && (
            <View style={styles.genericChip}>
              <Text style={styles.genericChipText}>Generic</Text>
            </View>
          )}
          {module.allowed_tags?.length > 0 && (
            <Text style={styles.tagCount}>{module.allowed_tags.length} tag{module.allowed_tags.length !== 1 ? 's' : ''}</Text>
          )}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
    </TouchableOpacity>
  );
});

// ─── Empty State ─────────────────────────────────────────────────────────────
const EmptyState: React.FC<{ tab: ActiveTab; searching: boolean }> = ({ tab, searching }) => (
  <View style={styles.emptyContainer}>
    <Ionicons
      name={tab === 'employees' ? 'people-outline' : 'grid-outline'}
      size={56}
      color={COLORS.textTertiary}
    />
    <Text style={styles.emptyTitle}>
      {searching ? 'No results found' : tab === 'employees' ? 'No employees' : 'No modules'}
    </Text>
    <Text style={styles.emptySubtitle}>
      {searching ? 'Try a different search term' : 'Data will appear here once loaded'}
    </Text>
  </View>
);

// ─── Main List Component ──────────────────────────────────────────────────────
interface AccessListProps {
  tab: ActiveTab;
  employees: Employee[];
  modules: ModuleItem[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onEmployeePress: (employee: Employee) => void;
  onModulePress: (module: ModuleItem) => void;
  searchQuery: string;
}

const AccessList: React.FC<AccessListProps> = ({
  tab,
  employees,
  modules,
  loading,
  refreshing,
  onRefresh,
  onEmployeePress,
  onModulePress,
  searchQuery,
}) => {
  const filteredEmployees = useMemo(
    () =>
      employees.filter((e) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          (e.full_name ?? '').toLowerCase().includes(q) ||
          (e.email ?? '').toLowerCase().includes(q) ||
          (e.designation ?? '').toLowerCase().includes(q) ||
          e.employee_id.toLowerCase().includes(q)
        );
      }),
    [employees, searchQuery],
  );

  const filteredModules = useMemo(
    () =>
      modules.filter((m) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          m.module_name.toLowerCase().includes(q) ||
          m.module_unique_name.toLowerCase().includes(q)
        );
      }),
    [modules, searchQuery],
  );

  const renderEmployee = useCallback(
    ({ item }: { item: Employee }) => <EmployeeRow employee={item} onPress={onEmployeePress} />,
    [onEmployeePress],
  );

  const renderModule = useCallback(
    ({ item }: { item: ModuleItem }) => <ModuleRow module={item} onPress={onModulePress} />,
    [onModulePress],
  );

  const keyExtractorEmployee = useCallback((item: Employee) => item.employee_id, []);
  const keyExtractorModule = useCallback((item: ModuleItem) => item.module_id, []);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loaderText}>Loading {tab}...</Text>
      </View>
    );
  }

  const data = tab === 'employees' ? filteredEmployees : filteredModules;
  const isEmpty = data.length === 0;

  return (
    <FlatList
      // ─── THE KEY: scrollEnabled={false} lets the parent ScrollView own
      // the scroll gesture — exactly how Vehicles.tsx does it.
      scrollEnabled={false}
      data={tab === 'employees' ? filteredEmployees : filteredModules}
      renderItem={tab === 'employees' ? renderEmployee : renderModule}
      keyExtractor={tab === 'employees' ? keyExtractorEmployee : keyExtractorModule}
      contentContainerStyle={isEmpty ? styles.emptyFlex : styles.list}
      ListEmptyComponent={
        <EmptyState tab={tab} searching={searchQuery.length > 0} />
      }
      showsVerticalScrollIndicator={false}
      removeClippedSubviews={false}  // must be false when scrollEnabled={false}
    />
  );
};

AccessList.displayName = 'AccessList';

const styles = StyleSheet.create({
  list: {
    paddingVertical: 8,
    backgroundColor: COLORS.background,
  },
  emptyFlex: {
    flexGrow: 1,
    paddingVertical: 60,
    backgroundColor: COLORS.background,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  info: {
    flex: 1,
    marginHorizontal: 12,
    gap: 2,
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  email: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
    flexWrap: 'wrap',
  },
  designation: {
    fontSize: 12,
    color: COLORS.textTertiary,
    flexShrink: 1,
  },
  roleChip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  roleChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarFallback: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: '700',
  },
  roleDot: {
    position: 'absolute',
    bottom: 1,
    right: 1,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.surface,
  },
  moduleIconWrapper: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moduleIcon: {
    width: 30,
    height: 30,
  },
  genericChip: {
    backgroundColor: COLORS.primary + '18',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  genericChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  tagCount: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  loaderContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: COLORS.background,
  },
  loaderText: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export { AccessList, getInitials, getAvatarColor, getModuleAccentColor };
export default AccessList;