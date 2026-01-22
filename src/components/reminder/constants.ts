export const TOKEN_KEY = 'token_2';

// WhatsApp Color Theme (same as Employee file)
export const WHATSAPP_COLORS = {
  primary: '#075E54', // WhatsApp dark green
  primaryLight: '#128C7E', // WhatsApp medium green
  accent: '#25D366', // WhatsApp light green
  background: '#ECE5DD', // WhatsApp chat background
  surface: '#FFFFFF', // White for cards
  chatBubbleSent: '#DCF8C6', // WhatsApp sent message bubble
  chatBubbleReceived: '#FFFFFF', // WhatsApp received message bubble
  textPrimary: '#000000', // Black for primary text
  textSecondary: '#667781', // WhatsApp secondary text
  textTertiary: '#8696A0', // WhatsApp tertiary text
  border: '#E0E0E0', // Light gray border
  statusOnline: '#25D366', // Online status green
  statusAway: '#FFB300', // Away status yellow
  statusOffline: '#9E9E9E', // Offline gray
  error: '#FF3B30', // Red for errors
  success: '#34C759', // Green for success
  warning: '#FF9500', // Orange for warnings
};

export const reminderTypes = [
  { label: 'Meeting', value: 'meeting', icon: '👥' },
  { label: 'Call', value: 'call', icon: '📞' },
  { label: 'Task', value: 'task', icon: '✓' },
  { label: 'Event', value: 'event', icon: '📅' },
  { label: 'Follow-up', value: 'followup', icon: '🔄' },
  { label: 'Deadline', value: 'deadline', icon: '⏰' },
  { label: 'Other', value: 'other', icon: '📝' },
];

export const eventColors = [
  { name: 'blue', value: '#2196F3' },
  { name: 'green', value: '#4CAF50' },
  { name: 'orange', value: '#FF9800' },
  { name: 'purple', value: '#9C27B0' },
  { name: 'pink', value: '#E91E63' },
  { name: 'yellow', value: '#FFC107' },
];

export const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
export const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0')).filter((_, i) => i % 5 === 0);
export const periods = ['AM', 'PM'];

// iOS Color Theme
export const IOS_COLORS = {
  primary: '#007AFF', // iOS blue
  background: '#F2F2F7', // iOS light background
  surface: '#FFFFFF', // White for cards
  textPrimary: '#000000', // Black for primary text
  textSecondary: '#8E8E93', // iOS secondary text
  textTertiary: '#C7C7CC', // iOS tertiary text
  border: '#C6C6C8', // iOS border color
  error: '#FF3B30', // iOS red
  success: '#34C759', // iOS green
  warning: '#FF9500', // iOS orange
  separator: '#E5E5EA', // iOS separator
};
