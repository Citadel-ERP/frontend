import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface QuickActionsProps {
  lastOpenedModules: Array<{
    title: string;
    iconUrl: string;
    module_unique_name: string;
  }>;
  modules: Array<any>;
  theme: any;
  handleModulePress: (moduleName: string, moduleUniqueName?: string) => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({
  lastOpenedModules,
  modules,
  theme,
  handleModulePress,
}) => {
  // Helper function to get module color
  const getModuleColor = (moduleName: string): string => {
    switch (moduleName.toLowerCase()) {
      case 'hr':
        return '#00d285';
      case 'car':
        return '#ff5e7a';
      case 'attendance':
        return '#ffb157';
      case 'bdt':
        return '#1da1f2';
      default:
        return '#007AFF';
    }
  };

  return (
    <View style={[styles.sectionCard, { backgroundColor: theme.cardBg, marginTop: 20 }]}>
      <Text style={[styles.labelSmall, { color: theme.textSub }]}>QUICK ACTIONS</Text>
      <View style={styles.iconGridFull}>
        {lastOpenedModules.slice(0, 4).map((item, index) => {
          // Ensure we have a unique key and handle missing items
          if (!item) return null;
          return (
            <TouchableOpacity
              key={`${item.module_unique_name || item.title}-${index}`}
              style={styles.iconItemFull}
              onPress={() => handleModulePress(item.title, item.module_unique_name)}
            >
              <View style={[styles.iconBox, { backgroundColor: getModuleColor(item.title) }]}>
                <Image
                  source={{ uri: item.iconUrl || `https://cdn-icons-png.flaticon.com/512/3135/3135715.png` }}
                  style={styles.iconImage}
                  resizeMode="contain"
                  onError={(e) => {
                    console.log('Error loading icon:', item.iconUrl);
                  }}
                />
              </View>
              <Text style={[styles.iconLabel, { color: theme.textMain }]} numberOfLines={1}>
                {item.title}
              </Text>
            </TouchableOpacity>
          );
        })}
        {/* If we have less than 4 modules, render placeholder or additional modules */}
        {lastOpenedModules.length < 4 && (
          <>
            {Array.from({ length: 4 - lastOpenedModules.length }).map((_, index) => {
              // Get a random module from backend that's not already shown
              const availableModules = modules.filter(
                (backendModule: any) =>
                  !lastOpenedModules.some(
                    (m: any) => m.module_unique_name === backendModule.module_unique_name
                  )
              );
              const randomModule = availableModules.length > 0
                ? availableModules[Math.floor(Math.random() * availableModules.length)]
                : null;
              if (randomModule) {
                return (
                  <TouchableOpacity
                    key={`placeholder-${index}`}
                    style={styles.iconItemFull}
                    onPress={() => handleModulePress(
                      randomModule.module_name.charAt(0).toUpperCase() +
                      randomModule.module_name.slice(1).replace('_', ' '),
                      randomModule.module_unique_name
                    )}
                  >
                    <View style={[styles.iconBox, { backgroundColor: getModuleColor(randomModule.module_name) }]}>
                      <Image
                        source={{ uri: randomModule.module_icon }}
                        style={styles.iconImage}
                        resizeMode="contain"
                      />
                    </View>
                    <Text style={[styles.iconLabel, { color: theme.textMain }]} numberOfLines={1}>
                      {randomModule.module_name.charAt(0).toUpperCase() +
                        randomModule.module_name.slice(1).replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                );
              }
              // If no backend modules available, show a placeholder
              return (
                <View key={`placeholder-${index}`} style={styles.iconItemFull}>
                  <View style={[styles.iconBox, { backgroundColor: '#e5e7eb' }]}>
                    <Ionicons name="apps" size={25} color="#9ca3af" />
                  </View>
                  <Text style={[styles.iconLabel, { color: theme.textSub }]}>Module</Text>
                </View>
              );
            })}
          </>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionCard: {
    marginHorizontal: 20,
    marginBottom: 15,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 15,
    elevation: 3,
  },
  labelSmall: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    fontWeight: '600',
  },
  iconGridFull: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  iconItemFull: {
    alignItems: 'center',
    width: '23%',
  },
  iconBox: {
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  iconImage: {
    width: 25,
    height: 25,
    tintColor: 'white',
  },
  iconLabel: {
    fontSize: 10,
    textAlign: 'center',
    fontWeight: '500',
  },
});

export default QuickActions;