import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { ThemeColors, Lead, Pagination } from './types';

const { width: screenWidth } = Dimensions.get('window');

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
  const beautifyName = (name: string): string => {
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const getLeadCardBackgroundColor = (status: string): string => {
    const statusColor = theme.leadStatusColors;
    
    switch (status) {
      case 'active':
      case 'transaction_complete':
        return isDarkMode ? 
          `rgba(${hexToRgb(statusColor.active)}, 0.15)` : 
          `rgba(${hexToRgb(statusColor.active)}, 0.08)`;
      case 'hold':
      case 'mandate':
        return isDarkMode ? 
          `rgba(${hexToRgb(statusColor.pending)}, 0.15)` : 
          `rgba(${hexToRgb(statusColor.pending)}, 0.08)`;
      case 'no_requirement':
      case 'closed':
      case 'non_responsive':
        return isDarkMode ? 
          `rgba(${hexToRgb(statusColor.cold)}, 0.15)` : 
          `rgba(${hexToRgb(statusColor.cold)}, 0.08)`;
      default:
        return isDarkMode ? 
          'rgba(255, 255, 255, 0.05)' : 
          'rgba(0, 0, 0, 0.02)';
    }
  };

  const getStatusBadgeColor = (status: string): string => {
    const statusColor = theme.leadStatusColors;
    
    switch (status) {
      case 'active':
      case 'transaction_complete':
        return statusColor.active;
      case 'hold':
      case 'mandate':
        return statusColor.pending;
      case 'no_requirement':
      case 'closed':
      case 'non_responsive':
        return statusColor.cold;
      default:
        return theme.textSecondary;
    }
  };

  const hexToRgb = (hex: string): string => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? 
      `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : 
      '0, 0, 0';
  };

  const formatDateTime = (dateString?: string): string => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 20;
    
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
      onLoadMore();
    }
  };

  if (loading && leads.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading leads...</Text>
      </View>
    );
  }

  if (leads.length === 0) {
    return (
      <View style={[styles.emptyState, { 
        backgroundColor: theme.cardBg,
        borderColor: theme.border
      }]}>
        <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>
          {searchQuery || isSearchMode ? 'No leads match your criteria' : 'No leads found'}
        </Text>
        <Text style={[styles.emptyStateSubtext, { color: theme.textSecondary }]}>
          {searchQuery || isSearchMode 
            ? 'Try adjusting your search or filters' 
            : 'Create your first lead to get started'
          }
        </Text>
      </View>
    );
  }

  return (
    <ScrollView 
      style={[styles.leadsContainer, { backgroundColor: theme.background }]}
      showsVerticalScrollIndicator={false}
      onScroll={handleScroll}
      scrollEventThrottle={16}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.primary}
        />
      }
    >
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Leads ({leads.length}
          {pagination && !isSearchMode && (
            ` of ${pagination.total_items}`
          )})
          {isSearchMode && ' - Search Results'}
        </Text>
      </View>

      {leads.map((lead) => {
        const cardBackgroundColor = getLeadCardBackgroundColor(lead.status);
        const statusBadgeColor = getStatusBadgeColor(lead.status);
        
        return (
          <View 
            key={lead.id} 
            style={[
              styles.leadCard,
              { backgroundColor: cardBackgroundColor }
            ]}
          >
            {/* Status Badge */}
            <View style={[styles.statusBadgeContainer, { backgroundColor: statusBadgeColor }]}>
              <Text style={styles.statusBadgeText}>
                {beautifyName(lead.status)}
              </Text>
            </View>
            
            <TouchableOpacity onPress={() => onLeadPress(lead)}>
              <View style={styles.leadHeader}>
                <Image
                  source={{ uri: `https://i.pravatar.cc/150?u=${lead.name}` }}
                  style={styles.avatar}
                />
                <View style={styles.leadInfo}>
                  <Text style={[styles.leadName, { color: theme.text }]}>{lead.name}</Text>
                  <Text style={[styles.leadContact, { color: theme.textSecondary }]}>
                    {lead.emails && lead.emails.length > 0 
                      ? lead.emails[0].email 
                      : 'No email'} • {lead.phone_numbers && lead.phone_numbers.length > 0 
                      ? lead.phone_numbers[0].number 
                      : 'No phone'}
                  </Text>
                </View>
              </View>

              <View style={styles.tagContainer}>
                <View style={[styles.tag, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.7)' }]}>
                  <Text style={[styles.tagText, { color: theme.text }]}>{beautifyName(lead.phase)}</Text>
                </View>
                <View style={[styles.tag, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.7)' }]}>
                  <Text style={[styles.tagText, { color: theme.text }]}>{beautifyName(lead.subphase)}</Text>
                </View>
                
                {lead.city && (
                  <View style={[styles.tag, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.7)' }]}>
                    <Text style={[styles.tagText, { color: theme.text }]}>📍 {lead.city}</Text>
                  </View>
                )}
              </View>

              <View style={styles.cardFooter}>
                <View>
                  <Text style={[styles.companyName, { color: theme.text }]}>{lead.company || 'No company specified'}</Text>
                  <Text style={[styles.lastOpened, { color: theme.textSecondary }]}>
                    Created: {formatDateTime(lead.created_at || lead.createdAt)}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={[styles.viewButton, { borderColor: theme.primary }]}
                  onPress={() => onLeadPress(lead)}
                >
                  <Text style={[styles.viewButtonText, { color: theme.primary }]}>View Details</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </View>
        );
      })}

      {loadingMore && (
        <View style={styles.loadMoreContainer}>
          <ActivityIndicator size="small" color={theme.primary} />
          <Text style={[styles.loadMoreText, { color: theme.textSecondary }]}>Loading more leads...</Text>
        </View>
      )}

      {pagination && !pagination.has_next && !isSearchMode && leads.length > 0 && (
        <View style={styles.endOfListContainer}>
          <Text style={[styles.endOfListText, { color: theme.textSecondary }]}>
            You've reached the end of the list
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  leadsContainer: {
    flex: 1,
    padding: 15,
  },
  sectionHeader: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  leadCard: {
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  statusBadgeContainer: {
    position: 'absolute',
    top: 15,
    right: 15,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 70,
    alignItems: 'center',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 0.5,
  },
  leadHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 10,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ddd',
  },
  leadInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  leadName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 2,
  },
  leadContact: {
    fontSize: 12,
    opacity: 0.8,
  },
  tagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    marginVertical: 10,
  },
  tag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
  },
  tagText: {
    fontSize: 11,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.05)',
  },
  companyName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  lastOpened: {
    fontSize: 10,
  },
  viewButton: {
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  viewButtonText: {
    fontSize: 13,
    fontWeight: '500',
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
  },
  emptyState: {
    margin: 20,
    borderRadius: 12,
    padding: 40,
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  loadMoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadMoreText: {
    marginLeft: 10,
    fontSize: 14,
  },
  endOfListContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  endOfListText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
});

export default LeadsList;