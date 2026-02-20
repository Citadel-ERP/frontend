import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HeaderProps {
  currentUser: {
    employee_id: string;
    first_name: string;
    last_name: string;
    profile_picture?: string;
  };
  unreadCount: number;
  onMenuClick: (action: string) => void;
  onBack: () => void; 
  onCameraClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  
  currentUser, 
  unreadCount, 
  onMenuClick,
  onBack,
  onCameraClick 
}) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <View style={styles.chatHeader}>
      <View style={styles.headerContent}>
        {/* Replace the headerLeft section with back button */}
        <TouchableOpacity 
          style={styles.headerLeft}
          onPress={onBack}
          activeOpacity={0.7}
        >
          <View style={styles.backIcon}>
            <View style={styles.backArrow} />
            {/* <Text style={styles.backText}>Back</Text> */}
          </View>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Messages</Text>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerIconBtn} onPress={onCameraClick} activeOpacity={0.7}>
            <Ionicons name="camera" size={24} color="#ffffff" />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.headerIconBtn}
            onPress={() => setShowMenu(!showMenu)}
            activeOpacity={0.7}
          >
            <Ionicons name="ellipsis-vertical" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Dropdown Menu Modal */}
      <Modal
        visible={showMenu}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <Pressable 
          style={styles.modalOverlay}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.dropdownMenu}>
            <TouchableOpacity 
              style={styles.dropdownItem}
              onPress={() => { onMenuClick('newGroup'); setShowMenu(false); }}
            >
              <Text style={styles.dropdownText}>New group</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.dropdownItem}
              onPress={() => { onMenuClick('newChat'); setShowMenu(false); }}
            >
              <Text style={styles.dropdownText}>New chat</Text>
            </TouchableOpacity>

            <View style={styles.dropdownDivider} />

            <TouchableOpacity 
              style={styles.dropdownItem}
              onPress={() => setShowMenu(false)}
            >
              <Text style={styles.dropdownText}>Read all</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.dropdownItem}
              onPress={() => setShowMenu(false)}
            >
              <Text style={styles.dropdownText}>Settings</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  chatHeader: {
    backgroundColor: '#008069',
    paddingTop: 90,
    paddingBottom: 10,
    paddingHorizontal: 16,
    marginTop:Platform.OS === 'ios' ? -80 : -50,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    marginRight: 12,
    paddingVertical: 8,
  },
  // Add back button styles
  backIcon: {
  width: 24,
  height: 24,
  alignItems: 'center',
  justifyContent: 'center',
},
  backArrow: {
    width: 12,
    height: 12,
    borderLeftWidth: 2,
    borderTopWidth: 2,
    borderColor: '#fff',
    transform: [{ rotate: '-45deg' }],
  },
  backText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 8,
    fontWeight: '500',
  },
  headerTitle: {
    flex: 1,
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconBtn: {
    padding: 8,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 55,
    paddingRight: 6,
  },
  dropdownMenu: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dropdownText: {
    fontSize: 16,
    color: '#000000',
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 4,
  },
});