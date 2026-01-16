import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from 'react-native';
import { ThemeColors, Lead, Pagination } from './types';
import { Ionicons } from '@expo/vector-icons';

// WhatsApp Color Scheme (matching BDT)
const WHATSAPP_COLORS = {
  primary: '#075E54',
  primaryLight: '#128C7E',
  primaryDark: '#054D44',
  secondary: '#25D366',
  accent: '#10B981',
  danger: '#EF4444',
  warning: '#F59E0B',
  background: '#e7e6e5',
  surface: '#FFFFFF',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  success: '#25D366',
  info: '#3B82F6',
  white: '#FFFFFF',
  chatBg: '#ECE5DD',
  incoming: '#FFFFFF',
  outgoing: '#DCF8C6',
};

interface LeadsListProps {
  leads: Lead[];
  onLeadPress: (lead: Lead) => void;
  loading: boolean;
  loadingMore: boolean;
  refreshing: boolean;
  onLoadMore: () => void;
  onRefresh: () => void;
  pagination: Pagination | null;
  isSearchMode: boolean;
  searchQuery: string;
  token: string | null;
  theme: ThemeColors;
  isDarkMode: boolean;
}

const LeadsList: React.FC<LeadsListProps> = ({
  leads,
  onLeadPress,
  loading,
  loadingMore,
  refreshing,
  onLoadMore,
  onRefresh,
  pagination,
  isSearchMode,
  searchQuery,
  theme,
  isDarkMode,
}) => {
  const avatarColors = ['#00d285', '#ff5e7a', '#ffb157', '#1da1f2', '#007AFF'];

  const beautifyName = (name: string): string => {
    if (!name) return '';
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const getInitials = (name: string): string => {
    if (!name || name.trim().length === 0) return '?';
    
    const nameParts = name.trim().split(/\s+/);
    
    if (nameParts.length === 1) {
      return nameParts[0].charAt(0).toUpperCase();
    } else {
      return (nameParts[0].charAt(0) + nameParts[1].charAt(0)).toUpperCase();
    }
  };

  const getAvatarColor = (name: string): string => {
    if (!name) return avatarColors[0];
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const index = Math.abs(hash) % avatarColors.length;
    return avatarColors[index];
  };

  const formatDateTime = (dateString?: string): string => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short'
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
      case 'transaction_complete':
        return { icon: 'checkmark-circle', color: WHATSAPP_COLORS.success };
      case 'hold':
      case 'mandate':
        return { icon: 'time', color: WHATSAPP_COLORS.warning };
      case 'no_requirement':
      case 'closed':
      case 'non_responsive':
        return { icon: 'close-circle', color: WHATSAPP_COLORS.danger };
      default:
        return { icon: 'help-circle', color: WHATSAPP_COLORS.textTertiary };
    }
  };

  const renderLeadItem = ({ item: lead }: { item: Lead }) => {
    const avatarColor = getAvatarColor(lead.name);
    const initials = getInitials(lead.name);
    const lastOpened = formatDateTime(lead.created_at || lead.createdAt);
    const statusIcon = getStatusIcon(lead.status);
    
    return (
      <TouchableOpacity 
        style={styles.leadItem} 
        onPress={() => onLeadPress(lead)}
        activeOpacity={0.7}
      >
        <View style={[styles.leadAvatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.leadAvatarText}>{initials}</Text>
        </View>
        
        <View style={styles.leadContent}>
          <View style={styles.leadHeader}>
            <Text style={styles.leadName} numberOfLines={1}>
              {lead.name}
            </Text>
            <Text style={styles.leadTime}>{lastOpened}</Text>
          </View>
          
          <View style={styles.leadMessage}>
            <Text style={styles.leadMessageText} numberOfLines={1}>
              {lead.company || 'No company specified'}
            </Text>
            <Ionicons 
              name={statusIcon.icon as any} 
              size={16} 
              color={statusIcon.color} 
            />
          </View>
          
          <View style={styles.leadStatus}>
            <Text style={styles.leadStatusText}>
              {beautifyName(lead.phase)} • {beautifyName(lead.subphase)}
            </Text>
          </View>
          
          {lead.emails && lead.emails.length > 0 && (
            <View style={styles.leadContact}>
              <Ionicons name="mail" size={12} color={WHATSAPP_COLORS.textTertiary} />
              <Text style={styles.leadContactText} numberOfLines={1}>
                {lead.emails[0].email}
              </Text>
            </View>
          )}
        </View>
        
        <View style={styles.leadArrow}>
          <Ionicons name="chevron-forward" size={20} color={WHATSAPP_COLORS.textTertiary} />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && leads.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={WHATSAPP_COLORS.primary} />
        <Text style={styles.loadingText}>Loading leads...</Text>
      </View>
    );
  }

  if (leads.length === 0) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="people" size={64} color={WHATSAPP_COLORS.border} />
        <Text style={styles.emptyStateText}>
          {searchQuery || isSearchMode ? 'No leads match your criteria' : 'No leads found'}
        </Text>
        <Text style={styles.emptyStateSubtext}>
          {searchQuery || isSearchMode 
            ? 'Try adjusting your search or filters' 
            : 'Your leads will appear here when they are created'
          }
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={leads}
      renderItem={renderLeadItem}
      keyExtractor={(item) => item.id.toString()}
      showsVerticalScrollIndicator={false}
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.1}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[WHATSAPP_COLORS.primary]}
          tintColor={WHATSAPP_COLORS.primary}
        />
      }
      contentContainerStyle={styles.listContainer}
      ListFooterComponent={
        loadingMore ? (
          <View style={styles.loadMoreContainer}>
            <ActivityIndicator size="small" color={WHATSAPP_COLORS.primary} />
            <Text style={styles.loadMoreText}>Loading more leads...</Text>
          </View>
        ) : pagination && !pagination.has_next && !isSearchMode ? (
          <View style={styles.endOfListContainer}>
            <Text style={styles.endOfListText}>
              You've reached the end of the list
            </Text>
          </View>
        ) : null
      }
    />
  );
};

const styles = StyleSheet.create({
  listContainer: {
    // marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  leadItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: WHATSAPP_COLORS.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  leadAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  leadAvatarText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  leadContent: {
    flex: 1,
  },
  leadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  leadName: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  leadTime: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textTertiary,
  },
  leadMessage: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  leadMessageText: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
    flex: 1,
    marginRight: 8,
  },
  leadStatus: {
    marginBottom: 4,
  },
  leadStatusText: {
    fontSize: 12,
    color: WHATSAPP_COLORS.primary,
    fontWeight: '500',
  },
  leadContact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  leadContactText: {
    fontSize: 12,
    color: WHATSAPP_COLORS.textTertiary,
    flex: 1,
  },
  leadArrow: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 50,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: WHATSAPP_COLORS.textPrimary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 8,
  },
  loadMoreText: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
  },
  endOfListContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  endOfListText: {
    fontSize: 14,
    color: WHATSAPP_COLORS.textSecondary,
    fontStyle: 'italic',
  },
});

export default LeadsList;