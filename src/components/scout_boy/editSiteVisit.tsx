import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ThemeColors, Visit } from './types';

interface EditSiteVisitProps {
  visit: Visit;
  onBack: () => void;
  token: string | null;
  theme: ThemeColors;
}

const EditSiteVisit: React.FC<EditSiteVisitProps> = ({ visit, onBack, token, theme }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Edit Visit (Coming Soon)</Text>
      <Text style={styles.subtitle}>Edit functionality will be implemented here</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default EditSiteVisit;