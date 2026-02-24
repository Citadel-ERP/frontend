export const lightTheme = {
  primary: '#075E54',
  primaryBlue: '#075E54',
  background: '#e7e6e5',
  backgroundSecondary: '#e7e6e5',
  cardBg: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#666666',
  textLight: '#999999',
  border: '#E5E7EB',
  white: '#FFFFFF',
  gray: '#6B7280',
  info: '#3B82F6',
  error: '#EF4444',
  success: '#075E54',
  warning: '#F59E0B',
  moduleColors: {
    bdt: '#1da1f2',
    hr: '#00d285',
    cab: '#ff5e7a',
    attendance: '#ffb157',
  },
  headerBg: '#0a1128',
  gradientStart: '#007AFF',
  gradientEnd: '#0056CC',
  leadStatusColors: {
    active: '#00D492',
    pending: '#F59E0B',
    cold: '#FF637F',
  }
};

export const darkTheme = {
  primary: '#075E54',
  primaryBlue: '#075E54',
  background: '#050b18',
  backgroundSecondary: '#111a2d',
  cardBg: '#111a2d',
  text: '#FFFFFF',
  textSecondary: '#CCCCCC',
  textLight: '#999999',
  border: '#404040',
  white: '#111a2d',
  gray: '#4B5563',
  info: '#3B82F6',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  moduleColors: {
    bdt: '#1C5CFB',
    hr: '#00A73A',
    cab: '#FE395C',
    attendance: '#FAAB21',
  },
  headerBg: '#0a1128',
  gradientStart: '#1C5CFB',
  gradientEnd: '#0F3FD9',
  leadStatusColors: {
    active: '#007AFF',
    pending: '#FFBB64',
    cold: '#FF637F',
  }
};

// Export colors (you can use lightTheme as default or create a mechanism to switch)
export const colors = lightTheme;

// Spacing constants
export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Font sizes
export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

// Border radius
export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  round: 9999,
};

// Shadow styles
export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
};