import React, { useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  Dimensions,
  Animated,
  Easing
} from 'react-native';
import { colors, spacing, fontSize, borderRadius } from '../styles/theme';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const isTablet = screenWidth >= 768;
const isSmallDevice = screenHeight < 700;
const logoSize = isTablet ? 140 : isSmallDevice ? 100 : 120;

interface Props {
  name: string;
  onContinue: () => void;
}

const WelcomeScreen: React.FC<Props> = ({ name, onContinue }) => {
  const logoScale = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoTranslateY = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(50)).current;
  const containerOpacity = useRef(new Animated.Value(1)).current;
  const containerTranslateY = useRef(new Animated.Value(0)).current;
  const backdropOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const startAnimations = () => {
      // Entrance animations
      Animated.parallel([
        Animated.timing(logoScale, {
          toValue: 1,
          duration: 1000,
          easing: Easing.out(Easing.back(1.1)),
          useNativeDriver: true,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 800,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start();

      // Text entrance with delay
      setTimeout(() => {
        Animated.parallel([
          Animated.timing(textOpacity, {
            toValue: 1,
            duration: 800,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(textTranslateY, {
            toValue: 0,
            duration: 800,
            easing: Easing.out(Easing.back(1.05)),
            useNativeDriver: true,
          }),
        ]).start();
      }, 400);
    };

    const handleExit = () => {
      // More sophisticated exit animation
      Animated.parallel([
        // Fade out backdrop
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 600,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        // Move logo up and scale down
        Animated.timing(logoTranslateY, {
          toValue: -screenHeight * 0.3,
          duration: 800,
          easing: Easing.in(Easing.back(1.2)),
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 0.6,
          duration: 800,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        // Fade out text faster
        Animated.timing(textOpacity, {
          toValue: 0,
          duration: 400,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        // Slide entire container up
        Animated.timing(containerTranslateY, {
          toValue: -screenHeight * 0.1,
          duration: 800,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        // Final fade out
        Animated.timing(containerOpacity, {
          toValue: 0,
          duration: 600,
          delay: 200,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
      ]).start(() => {
        onContinue();
      });
    };

    startAnimations();
    const exitTimer = setTimeout(handleExit, 2800); // Slightly shorter display time

    return () => clearTimeout(exitTimer);
  }, [
    onContinue, 
    logoScale, 
    logoOpacity, 
    logoTranslateY,
    textOpacity, 
    textTranslateY, 
    containerOpacity, 
    containerTranslateY,
    backdropOpacity
  ]);

  return (
    <Animated.View 
      style={[
        styles.container,
        {
          opacity: containerOpacity,
          transform: [{ translateY: containerTranslateY }]
        }
      ]}
    >
      {/* Background overlay for smoother transition */}
      <Animated.View 
        style={[
          styles.backdrop,
          { opacity: backdropOpacity }
        ]} 
      />
      
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Animated.Image
            source={require('../assets/logo.png')}
            style={[
              styles.logo, 
              { 
                width: logoSize, 
                height: logoSize,
                opacity: logoOpacity,
                transform: [
                  { scale: logoScale },
                  { translateY: logoTranslateY }
                ]
              }
            ]}
            resizeMode="contain"
          />
        </View>
        
        <Animated.Text 
          style={[
            styles.welcomeText,
            {
              opacity: textOpacity,
              transform: [{ translateY: textTranslateY }]
            }
          ]}
        >
          Welcome, {name}
        </Animated.Text>

        <View style={styles.loadingContainer}>
          <View style={styles.loadingDots}>
            {[0, 1, 2].map((index) => (
              <LoadingDot key={index} delay={index * 150} />
            ))}
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

const LoadingDot: React.FC<{ delay: number }> = ({ delay }) => {
  const opacity = useRef(new Animated.Value(0.3)).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const animate = () => {
      Animated.parallel([
        Animated.sequence([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0.3,
            duration: 600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(scale, {
            toValue: 1.2,
            duration: 600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(scale, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => animate());
    };

    const timer = setTimeout(animate, delay + 1000);
    return () => clearTimeout(timer);
  }, [opacity, scale, delay]);

  return (
    <Animated.View 
      style={[
        styles.dot, 
        { 
          opacity,
          transform: [{ scale }]
        }
      ]} 
    />
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: 'transparent', // Let backdrop handle background
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    zIndex: 0,
  },
  content: {
    flex: 1,
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingHorizontal: spacing.lg,
    zIndex: 1,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: isSmallDevice ? spacing.xl : spacing.xxl,
  },
  logo: {
    marginBottom: isTablet ? spacing.lg : isSmallDevice ? spacing.sm : spacing.md,
  },
  welcomeText: { 
    fontSize: isTablet ? fontSize.xxxl : isSmallDevice ? fontSize.xl : fontSize.xxl, 
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: spacing.xl,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: isSmallDevice ? 60 : 80,
    alignItems: 'center',
  },
  loadingDots: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary || colors.text,
    marginHorizontal: 4,
  },
});

export default WelcomeScreen;