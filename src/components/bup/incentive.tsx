import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ThemeColors } from './types';

interface IncentiveProps {
  theme: ThemeColors;
}

const Incentive: React.FC<IncentiveProps> = ({ theme }) => {
  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.text, { color: theme.text }]}>
        Incentive module coming soon...
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  text: {
    fontSize: 18,
    fontWeight: '600',
  },
});

export default Incentive;