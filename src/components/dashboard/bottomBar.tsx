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
}) => {
  const insets = useSafeAreaInsets();
  
  // Calculate total height including safe area
  const bottomNavHeight = 65;
  const totalHeight = bottomNavHeight + insets.bottom;

  return (
    <View style={[styles.bottomNavContainer, { backgroundColor: 'transparent' }]}>
      {/* <LinearGradient
        colors={['transparent', 'rgba(0, 0, 0, 0.1)']}
        style={[styles.bottomNavGradient, { height: totalHeight + 10 }]}
      > */}
        <View style={[styles.bottomNav, {
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
        }]}>
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
                {
                  backgroundColor: theme.bgColor,
                },
              ]}
            />
          </Animated.View>

          <View style={styles.navItemsContainer}>
            {[
              { icon: 'home', label: 'Home' },
              { icon: 'chatbubbles', label: 'Message' },
              { icon: 'people', label: 'HrPedia' },
              { icon: 'headset', label: 'Support' },
            ].map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.navItem}
                onPress={() => handleNavItemPress(item.label.toLowerCase())}
                activeOpacity={0.7}
              >
                {activeNavItem === item.label.toLowerCase() ? (
                  <LinearGradient
                    colors={[currentColors.gradientStart, currentColors.gradientEnd]}
                    style={styles.floatingCircle}
                  >
                    <Ionicons
                      name={item.icon as any}
                      size={22}
                      color="white"
                    />
                  </LinearGradient>
                ) : (
                  <>
                    <Ionicons
                      name={item.icon as any}
                      size={20}
                      color={theme.textSub}
                    />
                    <Text style={[styles.navLabel, { color: theme.textSub }]}>
                      {item.label}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      {/* </LinearGradient> */}
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
  bottomNavGradient: {
    justifyContent: 'flex-end',
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
  floatingCircle: {
    position: 'absolute',
    top: -25,
    width: 65,
    height: 65,
    borderRadius: 32.5,
    alignItems: 'center',
    justifyContent: 'center',
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: 4 },
    // shadowOpacity: 0.3,
    // shadowRadius: 8,
    // elevation: 10,
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
    // shadowColor: '#000',
    // shadowOffset: { width: 0, height: -6 },
    // shadowOpacity: 0.12,
    // shadowRadius: 12,
    // elevation: 8,
  },
});

export default BottomBar;