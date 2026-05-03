import React from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface BottomBarProps {
  activeNavItem: string;
  handleNavItemPress: (navItem: string) => void;
  theme: any;
  currentColors: any;
  bulgeAnim: Animated.Value;
  screenWidth: number;
  unreadNotificationCount: number;
}

const BottomBar: React.FC<BottomBarProps> = ({
  activeNavItem,
  handleNavItemPress,
  theme,
  currentColors,
  bulgeAnim,
  screenWidth,
  unreadNotificationCount,
}) => {
  const insets = useSafeAreaInsets();

  // Calculate total height including safe area
  const bottomNavHeight = 65;
  const totalHeight = bottomNavHeight + insets.bottom;

  const navItems = [
    { icon: 'home',        label: 'Home',    id: 'home'    },
    { icon: 'chatbubbles', label: 'Message', id: 'message' },
    { icon: 'people',      label: 'HrPedia', id: 'hr'      },
    { icon: 'headset',     label: 'Support', id: 'support' },
  ];

  return (
    <View style={[styles.bottomNavContainer, { backgroundColor: 'transparent' }]}>
      <View
        style={[
          styles.bottomNav,
          {
            backgroundColor: theme.navBg,
            borderTopLeftRadius: 25,
            borderTopRightRadius: 25,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -5 },
            shadowOpacity: 0.1,
            shadowRadius: 20,
            elevation: 10,
            overflow: 'visible',
            paddingBottom: insets.bottom || 6,
            height: totalHeight,
          },
        ]}
      >
        {/* Animated Bulge Background */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.downBulgeWrapper,
            {
              transform: [
                {
                  translateX: bulgeAnim.interpolate({
                    inputRange: [0, 1, 2, 3],
                    outputRange: [
                      screenWidth * 0.125,
                      screenWidth * 0.375,
                      screenWidth * 0.625,
                      screenWidth * 0.875,
                    ],
                  }),
                },
              ],
            },
          ]}
        >
          <View
            style={[
              styles.downBulge,
              { backgroundColor: theme.bgColor },
            ]}
          />
        </Animated.View>

        <View style={styles.navItemsContainer}>
          {navItems.map((item, index) => {
            const isActive = activeNavItem === item.id;

            // Badge only on the Message icon when there are unread messages
            const showBadge =
              item.id === 'message' && unreadNotificationCount > 0;
            const badgeLabel =
              unreadNotificationCount > 99
                ? '99+'
                : String(unreadNotificationCount);

            return (
              <TouchableOpacity
                key={index}
                style={styles.navItem}
                onPress={() => handleNavItemPress(item.id)}
                activeOpacity={0.7}
              >
                {isActive ? (
                  /* Active state — floating gradient circle */
                  <LinearGradient
                    colors={[
                      currentColors.gradientStart,
                      currentColors.gradientEnd,
                    ]}
                    style={styles.floatingCircle}
                  >
                    <Ionicons
                      name={item.icon as any}
                      size={22}
                      color="white"
                    />
                  </LinearGradient>
                ) : (
                  /* Inactive state — icon + optional badge + label */
                  <View style={styles.navIconWrapper}>
                    <View style={styles.iconWithBadge}>
                      <Ionicons
                        name={item.icon as any}
                        size={20}
                        color={theme.textSub}
                      />
                      {showBadge && (
                        <View style={styles.badge}>
                          <Text style={styles.badgeText}>{badgeLabel}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.navLabel, { color: theme.textSub }]}>
                      {item.label}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bottomNavContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomNav: {
    paddingHorizontal: 20,
    paddingTop: 6,
  },
  navItemsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: 65,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    position: 'relative',
  },
  /* Wraps the icon + badge + label for inactive items */
  navIconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* Positions the badge relative to the icon */
  iconWithBadge: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  /* WhatsApp-style notification pill */
  badge: {
    position: 'absolute',
    top: -5,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#F15C6D',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    // White halo separates the badge from the icon beneath
    borderWidth: 1.5,
    borderColor: '#ffffff',
    // Lift the badge above sibling views
    zIndex: 10,
    elevation: 10,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 13,
    includeFontPadding: false,
  },
  floatingCircle: {
    position: 'absolute',
    top: -25,
    width: 65,
    height: 65,
    borderRadius: 32.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navLabel: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '500',
  },
  downBulgeWrapper: {
    position: 'absolute',
    bottom: -34,
    left: 0,
    width: 0,
    height: 0,
    zIndex: 5,
    elevation: 5,
  },
  downBulge: {
    width: 76,
    height: 76,
    borderBottomLeftRadius: 38,
    borderBottomRightRadius: 38,
    transform: [{ scaleX: 1.15 }],
  },
});

export default BottomBar;