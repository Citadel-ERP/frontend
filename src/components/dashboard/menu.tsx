import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Platform,
    Modal,
    Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

interface UserData {
    full_name: string;
    designation?: string;
    role?: string;
    profile_picture?: string;
}

interface MenuItem {
    id: string;
    title: string;
    icon: string;
    color: string;
}

interface HamburgerMenuProps {
    isVisible: boolean;
    onClose: () => void;
    userData: UserData | null;
    menuItems: MenuItem[];
    activeMenuItem: string;
    onMenuItemPress: (item: MenuItem) => void;
    onLogout: () => void;
    isDark: boolean;
    slideAnim: Animated.Value;
    getInitials: (fullName: string) => string;
    currentColors: any;
}

const HamburgerMenu: React.FC<HamburgerMenuProps> = ({
    isVisible,
    onClose,
    userData,
    menuItems,
    activeMenuItem,
    onMenuItemPress,
    onLogout,
    isDark,
    slideAnim,
    getInitials,
    currentColors,
}) => {
    if (!isVisible) return null;

    return (
        <Modal transparent visible={isVisible} animationType="none" onRequestClose={onClose} statusBarTranslucent={true}>
            {/* <SafeAreaView style={[styles.overlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}> */}
            <View style={[styles.overlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
                <LinearGradient
                    colors={[currentColors.gradientStart, currentColors.gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.modalHeaderGradient, styles.linearGradient]}
                >
                    <TouchableOpacity style={styles.overlayTouchable} activeOpacity={1} onPress={onClose} />
                    <Animated.View style={[
                        styles.menuContainer,
                        {
                            width: 300,
                            transform: [{ translateX: slideAnim }],
                            backgroundColor: currentColors.white,
                        }
                    ]}>
                        <View style={[styles.menuHeader, { backgroundColor: '#3262f1' }]}>
                            <View style={styles.menuHeaderContent}>
                                {userData?.profile_picture ? (
                                    <Image
                                        source={{ uri: userData.profile_picture }}
                                        style={styles.menuUserAvatar}
                                    />
                                ) : (
                                    <View style={[styles.menuUserAvatarCircle, { backgroundColor: 'rgba(255, 255, 255, 0.3)' }]}>
                                        <Text style={styles.menuUserAvatarText}>
                                            {getInitials(userData?.full_name || 'User')}
                                        </Text>
                                    </View>
                                )}
                                <View style={styles.menuUserDetails}>
                                    <Text style={[styles.menuUserName, { color: '#FFFFFF' }]}>
                                        {userData?.full_name || 'User'}
                                    </Text>
                                    <Text style={[styles.menuUserRole, { color: 'rgba(255, 255, 255, 0.8)' }]}>
                                        {userData?.designation || userData?.role || 'Employee'}
                                    </Text>
                                </View>
                            </View>
                        </View>
                        <ScrollView style={[styles.menuItems, { backgroundColor: currentColors.white }]}
                            showsVerticalScrollIndicator={false}
                            contentContainerStyle={styles.menuItemsContent}
                        >
                            {menuItems.map((item: any, index: number) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.menuItem,
                                        activeMenuItem === item.title && styles.menuItemActive,
                                        {
                                            backgroundColor: activeMenuItem === item.title ? currentColors.backgroundSecondary : 'transparent',
                                        }
                                    ]}
                                    onPress={() => onMenuItemPress(item)}
                                    activeOpacity={0.7}
                                >
                                    <View style={styles.menuItemIconContainer}>
                                        <Ionicons
                                            name={item.icon as any}
                                            size={22}
                                            color={activeMenuItem === item.title ? '#3262f1' : currentColors.textSecondary}
                                        />
                                    </View>
                                    <Text style={[
                                        styles.menuItemText,
                                        activeMenuItem === item.title && styles.menuItemTextActive,
                                        { color: activeMenuItem === item.title ? '#3262f1' : currentColors.textSecondary }
                                    ]}>{item.title}</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        <View style={[styles.logoutSection, { backgroundColor: currentColors.white }]}>
                            <View style={[styles.logoutDivider, { backgroundColor: currentColors.border }]} />
                            <TouchableOpacity
                                style={[styles.logoutButton, { backgroundColor: '#FEF2F2' }]}
                                onPress={onLogout}
                                activeOpacity={0.7}
                            >
                                <View style={styles.logoutIconContainer}>
                                    <Ionicons name="log-out-outline" size={22} color={currentColors.error} />
                                </View>
                                <Text style={[styles.logoutButtonText, { color: currentColors.error }]}>Logout</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </LinearGradient>
            </View>
            {/* </SafeAreaView> */}
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        flexDirection: 'row',
    },
    overlayTouchable: {
        flex: 1,
    },
    menuContainer: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 0 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 10,
    },
    menuHeader: {
        paddingTop: Platform.OS === 'ios' ? 60 : 60,
        paddingBottom: 24,
        
    },
    menuHeaderContent: {
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    menuUserAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: 3,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    menuUserAvatarCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    menuUserAvatarText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    menuUserDetails: {
        flex: 1,
        marginLeft: 16,
    },
    menuUserRole: {
        fontSize: 13,
        marginBottom: 4,
    },
    menuUserName: {
        fontSize: 18,
        fontWeight: '600',
    },
    menuItems: {
        flex: 1,
    },
    menuItemsContent: {
        paddingTop: 20,
        paddingBottom: 12,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 12,
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 10,
        marginBottom: 4,
    },
    menuItemActive: {
        borderLeftWidth: 4,
        borderLeftColor: '#3262f1',
    },
    menuItemIconContainer: {
        width: 32,
        marginRight: 16,
    },
    menuItemText: {
        fontWeight: '500',
        flex: 1,
        fontSize: 15,
    },
    menuItemTextActive: {
        fontWeight: '600',
    },
    logoutSection: {
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    logoutDivider: {
        height: 1,
        marginHorizontal: 20,
        marginBottom: 12,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 12,
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 10,
        borderLeftWidth: 4,
        borderLeftColor: '#EF4444',
    },
    logoutIconContainer: {
        width: 32,
        marginRight: 16,
    },
    logoutButtonText: {
        fontWeight: '600',
        flex: 1,
        fontSize: 15,
    },
    modalHeaderGradient: {
        paddingBottom: 20,
        height: '100%',
    },
    linearGradient: {
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        elevation: 6,
    }
});

export default HamburgerMenu;