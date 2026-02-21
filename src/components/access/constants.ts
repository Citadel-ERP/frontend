/**
 * Constants for Module Access Management
 */

export const WHATSAPP_COLORS = {
  primary: '#075E54',
  secondary: '#128C7E',
  accent: '#25D366',
  background: '#ECE5DD',
  surface: '#FFFFFF',
  text: '#1F2C34',
  textSecondary: '#3B4A54',
  textTertiary: '#8696A0',
  border: '#E9EDF0',
  error: '#DC3545',
  success: '#28A745',
  warning: '#FFC107',
  statusOnline: '#4CAF50',
  statusOffline: '#9E9E9E',
  headerBg: '#075E54',
  white: '#FFFFFF',
  black: '#000000',
};

export const ICON_OPTIONS = [
  { name: 'Cube', value: 'cube', icon: 'cube', family: 'Ionicons' },
  { name: 'Car', value: 'car', icon: 'car', family: 'FontAwesome5' },
  { name: 'Users', value: 'users', icon: 'users', family: 'FontAwesome5' },
  { name: 'Calendar', value: 'calendar', icon: 'calendar', family: 'Ionicons' },
  { name: 'Document', value: 'document', icon: 'document-text', family: 'Ionicons' },
  { name: 'Settings', value: 'settings', icon: 'settings', family: 'Ionicons' },
  { name: 'Chart', value: 'chart', icon: 'bar-chart', family: 'FontAwesome5' },
  { name: 'Location', value: 'location', icon: 'location', family: 'Ionicons' },
  { name: 'Time', value: 'time', icon: 'time', family: 'Ionicons' },
  { name: 'Wallet', value: 'wallet', icon: 'wallet', family: 'FontAwesome5' },
  { name: 'Camera', value: 'camera', icon: 'camera', family: 'Ionicons' },
  { name: 'Mail', value: 'mail', icon: 'mail', family: 'Ionicons' },
  { name: 'Lock', value: 'lock', icon: 'lock-closed', family: 'Ionicons' },
  { name: 'Key', value: 'key', icon: 'key', family: 'Ionicons' },
  { name: 'Phone', value: 'phone', icon: 'call', family: 'Ionicons' },
];

export const AVATAR_COLORS = [
  '#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', 
  '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50', 
  '#FF9800', '#FF5722'
];

export const API_ENDPOINTS = {
  GET_ALL_EMPLOYEES: '/access/getAllEmployees',
  GET_EMPLOYEE_DATA: '/access/getEmployeeData',
  GRANT_ACCESS: '/access/grantAccess',
  REVOKE_ACCESS: '/access/revokeAccess',
  UPDATE_MODULE: '/access/updateModule',
};