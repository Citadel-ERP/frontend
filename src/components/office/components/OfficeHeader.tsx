import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface OfficeHeaderProps {
  onBack: () => void;
  onCreate: () => void;
  isDark?: boolean;
}

export const OfficeHeader: React.FC<OfficeHeaderProps> = ({
  onBack,
  onCreate,
  isDark = false,
}) => {
  const theme = {
    bgColor: isDark ? '#111a2d' : '#f6f6f6',
    textMain: isDark ? '#ffffff' : '#333333',
    textSub: isDark ? '#a0a0a0' : '#666666',
    accentBlue: '#008069',
  };
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { backgroundColor: theme.accentBlue, paddingTop: insets.top + 22 }]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />
      
      <View style={styles.topRow}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color="white" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Office Management</Text>
        
        <TouchableOpacity onPress={onCreate} style={styles.headerButton}>
          <Ionicons name="add" size={28} color="white" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'ios' ? 70 : 20,
    paddingBottom: 16,
    marginTop:Platform.OS === 'ios' ? -60 :-10,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
  },
  headerButton: {
    padding: 4,
    marginLeft: 12,
  },
});