/**
 * Module Item Component
 */

import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { Module } from '../types';
import { WHATSAPP_COLORS, ICON_OPTIONS } from '../constants';
import { styles } from '../styles';

interface ModuleItemProps {
  module: Module;
  onGrantAccess: (moduleId: number) => void;
  onRevokeAccess: (moduleId: number) => void;
  onEdit: (module: Module) => void;
  loading?: boolean;
}

export const ModuleItem: React.FC<ModuleItemProps> = ({
  module,
  onGrantAccess,
  onRevokeAccess,
  onEdit,
  loading,
}) => {
  const getIconComponent = (iconName?: string) => {
    const icon = ICON_OPTIONS.find(opt => opt.value === iconName) || ICON_OPTIONS[0];
    
    switch (icon.family) {
      case 'FontAwesome5':
        return <FontAwesome5 name={icon.icon as any} size={24} color={WHATSAPP_COLORS.primary} />;
      case 'MaterialCommunityIcons':
        return <MaterialCommunityIcons name={icon.icon as any} size={24} color={WHATSAPP_COLORS.primary} />;
      default:
        return <Ionicons name={icon.icon as any} size={24} color={WHATSAPP_COLORS.primary} />;
    }
  };

  return (
    <View style={styles.moduleItem}>
      <View style={styles.moduleInfo}>
        {module.module_icon ? (
          <Image source={{ uri: module.module_icon }} style={styles.moduleIcon} resizeMode="contain" />
        ) : (
          <View style={styles.moduleIconContainer}>
            {getIconComponent(module.module_icon)}
          </View>
        )}
        <Text style={styles.moduleName}>{module.module_name}</Text>
      </View>

      <View style={styles.moduleActions}>
        {module.access ? (
          <TouchableOpacity
            style={[styles.actionButton, styles.revokeButton]}
            onPress={() => onRevokeAccess(module.module_id)}
            disabled={loading}
          >
            <Text style={styles.revokeButtonText}>Revoke Access</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionButton, styles.grantButton]}
            onPress={() => onGrantAccess(module.module_id)}
            disabled={loading}
          >
            <Text style={styles.grantButtonText}>Grant Access</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.editButton}
          onPress={() => onEdit(module)}
          disabled={loading}
        >
          <Ionicons name="create-outline" size={20} color={WHATSAPP_COLORS.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};