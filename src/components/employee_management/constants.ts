// WhatsApp Color Theme
export const WHATSAPP_COLORS = {
  primary: '#075E54',
  primaryLight: '#128C7E',
  accent: '#25D366',
  background: '#ECE5DD',
  surface: '#FFFFFF',
  chatBubbleSent: '#DCF8C6',
  chatBubbleReceived: '#FFFFFF',
  textPrimary: '#000000',
  textSecondary: '#667781',
  textTertiary: '#8696A0',
  border: '#E0E0E0',
  statusOnline: '#25D366',
  statusAway: '#FFB300',
  statusOffline: '#9E9E9E',
  error: '#FF3B30',
  success: '#34C759',
  warning: '#FF9500',
};

export const TOKEN_KEY = 'token_2';

// Helper function for avatar colors
export const getAvatarColor = (id: string): string => {
  const colors = [
    '#075E54', '#128C7E', '#25D366', '#34B7F1', '#ED4C67',
    '#FFC312', '#EE5A24', '#A3CB38', '#1289A7', '#D980FA',
  ];
  const hash = id.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

// Date formatting utilities
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

export const calculateExperience = (joiningDate: string): string => {
  const joinDate = new Date(joiningDate);
  const today = new Date();

  let years = today.getFullYear() - joinDate.getFullYear();
  let months = today.getMonth() - joinDate.getMonth();

  if (months < 0) {
    years--;
    months += 12;
  }

  if (years > 0) {
    return `${years}yr ${months}mo`;
  }
  return `${months}mo`;
};

export const getInitials = (fullName: string): string => {
  return fullName
    .split(' ')
    .map(name => name.charAt(0).toUpperCase())
    .join('')
    .substring(0, 2);
};