export const colors = {
  primary: '#161b34ff',
  primaryLight: '#c1c7f4ff',
  primaryDark: '#1A1D2E',

  background: '#FFFFFF',
  backgroundSecondary: '#F8F9FA',

  text: '#2F3349',
  textSecondary: '#6C7293',
  textLight: '#8B92B2',

  white: '#FFFFFF',
  black: '#000000',
  gray: '#F1F3F4',
  border: '#E0E4E7',

  success: '#28A745',
  error: '#DC3545',
  warning: '#FFC107',
  info: '#e07935ff',

  link: '#007BFF',
  disabled: '#6C757D',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const fontSize = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 28,
};

export const borderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 999,
};

export const shadows = {
  sm: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
};

export const commonStyles = {
  input: {
    height: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.white,
    fontSize: fontSize.md,
    color: colors.text,
    ...shadows.sm,
  },

  primaryButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    ...shadows.sm,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600' as const,
  },
  secondaryButton: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: '600' as const,
  },

  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },

  h1: {
    fontSize: fontSize.xxxl,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: spacing.md,
  },
  h2: {
    fontSize: fontSize.xxl,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  h3: {
    fontSize: fontSize.xl,
    fontWeight: '600' as const,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '700' as const,
    color: colors.text,
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  body: {
    fontSize: fontSize.md,
    color: colors.text,
    lineHeight: 24,
  },
  caption: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
};
