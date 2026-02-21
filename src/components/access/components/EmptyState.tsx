/**
 * Empty State Component
 */

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WHATSAPP_COLORS } from '../constants';
import { styles } from '../styles';

interface EmptyStateProps {
  title: string;
  message: string;
  icon?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  icon = 'people-outline',
  actionLabel,
  onAction,
}) => {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyStateIcon}>
        <Ionicons name={icon as any} size={80} color={WHATSAPP_COLORS.border} />
      </View>
      <Text style={styles.emptyStateTitle}>{title}</Text>
      <Text style={styles.emptyStateMessage}>{message}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity style={styles.clearSearchButton} onPress={onAction}>
          <Text style={styles.clearSearchButtonText}>{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};