export const lightTheme = {
  // Primary colors
  primary: '#075E54',
  primaryLight: '#128C7E',
  primaryDark: '#054D44',
  secondary: '#25D366',
  accent: '#10B981',
  
  // UI colors
  primaryBlue: '#007AFF',
  background: '#e7e6e5',
  backgroundSecondary: '#e7e6e5',
  cardBg: '#e7e6e5',
  
  // Surface colors (for cards, modals, etc.)
  surface: '#FFFFFF',
  
  // Text colors
  text: '#1A1A1A',
  textPrimary: '#1F2937',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textLight: '#999999',
  
  // Border and divider colors
  border: '#E5E7EB',
  
  // Status colors
  white: '#FFFFFF',
  gray: '#6B7280',
  info: '#075E54',
  error: '#EF4444',
  success: '#075E54',
  warning: '#F59E0B',
  danger: '#EF4444',
  
  // Chat colors (WhatsApp-like)
  chatBg: '#ECE5DD',
  incoming: '#FFFFFF',
  outgoing: '#DCF8C6',
  
  // Module colors
  moduleColors: {
    bup: '#1da1f2',
    hr: '#00d285',
    cab: '#ff5e7a',
    attendance: '#ffb157',
  },
  
  // Header and gradient
  headerBg: '#0a1128',
  gradientStart: '#007AFF',
  gradientEnd: '#0056CC',
  
  // Lead status colors
  leadStatusColors: {
    active: '#00D492',
    pending: '#F59E0B',
    cold: '#FF637F',
  }
};

export const darkTheme = {
  // Primary colors
  primary: '#075E54',
  primaryLight: '#128C7E',
  primaryDark: '#054D44',
  secondary: '#25D366',
  accent: '#10B981',
  
  // UI colors
  primaryBlue: '#1C5CFB',
  background: '#050b18',
  backgroundSecondary: '#111a2d',
  cardBg: '#111a2d',
  
  // Surface colors (for cards, modals, etc.)
  surface: '#1E293B',
  
  // Text colors
  text: '#FFFFFF',
  textPrimary: '#FFFFFF',
  textSecondary: '#CCCCCC',
  textTertiary: '#999999',
  textLight: '#999999',
  
  // Border and divider colors
  border: '#404040',
  
  // Status colors
  white: '#111a2d',
  gray: '#4B5563',
  info: '#3B82F6',
  error: '#EF4444',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  
  // Chat colors (WhatsApp-like)
  chatBg: '#0D1117',
  incoming: '#1E293B',
  outgoing: '#075E54',
  
  // Module colors
  moduleColors: {
    bup: '#1C5CFB',
    hr: '#00A73A',
    cab: '#FE395C',
    attendance: '#FAAB21',
  },
  
  // Header and gradient
  headerBg: '#0a1128',
  gradientStart: '#1C5CFB',
  gradientEnd: '#0F3FD9',
  
  // Lead status colors
  leadStatusColors: {
    active: '#007AFF',
    pending: '#FFBB64',
    cold: '#FF637F',
  }
};

// Added for Incentive component compatibility
export const colors = lightTheme;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const fontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 24,
  xxxl: 32,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
};

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