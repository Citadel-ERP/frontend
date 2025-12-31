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
    isFromBackend?: boolean;
    isPlaceholder?: boolean;
  }>;
  modules: Array<any>;
  theme: any;
  handleModulePress: (moduleName: string, moduleUniqueName?: string) => void;
}

// Predefined colors in the required order
const QUICK_ACTION_COLORS = [
  '#00d285',
  '#ff5e7a',
  '#ffb157',
  '#1da1f2'
];

const QuickActions: React.FC<QuickActionsProps> = ({
  lastOpenedModules,
  modules,
  theme,
  handleModulePress,
}) => {
  // Get a consistent color for each position/index
  const getColorForIndex = (index: number): string => {
    // Use modulo to ensure we always use one of the 4 colors
    return QUICK_ACTION_COLORS[index % QUICK_ACTION_COLORS.length];
  };

  // Get all displayed items (last opened + placeholders)
  const getDisplayedItems = () => {
    const displayedItems = [...lastOpenedModules.slice(0, 4)];

    // If we have less than 4 modules, fill with placeholders from backend modules
    if (displayedItems.length < 4) {
      const availableModules = modules.filter(
        (backendModule: any) =>
          !displayedItems.some(
            (m: any) => m.module_unique_name === backendModule.module_unique_name
          )
      );

      for (let i = displayedItems.length; i < 4; i++) {
        if (availableModules.length > 0) {
          const randomModule = availableModules[
            Math.floor(Math.random() * availableModules.length)
          ];
          displayedItems.push({
            title: randomModule.module_name.charAt(0).toUpperCase() +
              randomModule.module_name.slice(1).replace('_', ' '),
            iconUrl: randomModule.module_icon,
            module_unique_name: randomModule.module_unique_name,
            isFromBackend: true
          });
        } else {
          // Placeholder item
          displayedItems.push({
            title: 'Module',
            iconUrl: '',
            module_unique_name: `placeholder-${i}`,
            isPlaceholder: true
          });
        }
      }
    }

    return displayedItems;
  };

  const displayedItems = getDisplayedItems();

  return (
    <View style={[styles.sectionCard, { backgroundColor: theme.cardBg, marginTop: 20 }]}>
      <Text style={[styles.labelSmall, { color: theme.textSub }]}>QUICK ACTIONS</Text>
      <View style={styles.iconGridFull}>
        {displayedItems.slice(0, 4).map((item, index) => {
          const color = getColorForIndex(index);

          if (item.isPlaceholder) {
            return (
              <View key={`placeholder-${index}`} style={styles.iconItemFull}>
                <View style={[styles.iconBox, { backgroundColor: '#e5e7eb' }]}>
                  <Ionicons name="apps" size={25} color="#9ca3af" />
                </View>
                <Text style={[styles.iconLabel, { color: theme.textSub }]} numberOfLines={1}>
                  {item.title}
                </Text>
              </View>
            );
          }

          return (
            <TouchableOpacity
              key={`${item.module_unique_name}-${index}`}
              style={styles.iconItemFull}
              onPress={() => handleModulePress(item.title, item.module_unique_name)}
            >
              <View style={[styles.iconBox, { backgroundColor: color }]}>
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