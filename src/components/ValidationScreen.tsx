// screens/ValidationScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import Constants from 'expo-constants';
import { ConfigValidator } from '../services/configValidator';

export const ValidationScreen = () => {
  const [results, setResults] = useState<any[]>([]);
  const [willWork, setWillWork] = useState(false);
  const [loading, setLoading] = useState(false);

  const runValidation = async () => {
    setLoading(true);
    const { results, willWorkInDevBuild } = await ConfigValidator.validateAll();
    setResults(results);
    setWillWork(willWorkInDevBuild);
    setLoading(false);
  };

  useEffect(() => {
    runValidation();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return '#10B981';
      case 'warning': return '#F59E0B';
      case 'fail': return '#EF4444';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return '✅';
      case 'warning': return '⚠️';
      case 'fail': return '❌';
      default: return '❔';
    }
  };

  const inExpoGo = Constants.appOwnership === 'expo';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Configuration Validator</Text>
        <Text style={styles.subtitle}>
          Check if your setup will work in a dev build
        </Text>
      </View>

      {inExpoGo && (
        <View style={styles.expoGoWarning}>
          <Text style={styles.warningText}>
            ⚠️ You're in Expo Go
          </Text>
          <Text style={styles.warningSubtext}>
            Background features won't work on iOS in Expo Go.
            This is NORMAL and EXPECTED.
          </Text>
        </View>
      )}

      <ScrollView style={styles.resultsContainer}>
        {results.map((result, index) => (
          <View 
            key={index} 
            style={[
              styles.resultCard,
              { borderLeftColor: getStatusColor(result.status) }
            ]}
          >
            <View style={styles.resultHeader}>
              <Text style={styles.resultIcon}>
                {getStatusIcon(result.status)}
              </Text>
              <Text style={styles.resultCategory}>
                {result.category}
              </Text>
            </View>
            <Text style={styles.resultMessage}>
              {result.message}
            </Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <View style={[
          styles.finalStatus,
          { backgroundColor: willWork ? '#10B98120' : '#EF444420' }
        ]}>
          <Text style={[
            styles.finalStatusTitle,
            { color: willWork ? '#10B981' : '#EF4444' }
          ]}>
            {willWork ? '✅ Ready for Dev Build' : '❌ Config Issues Found'}
          </Text>
          <Text style={styles.finalStatusText}>
            {willWork 
              ? 'Your configuration is correct. Background features will work when you build a development build.'
              : 'Fix the configuration issues above before building.'}
          </Text>
        </View>

        <TouchableOpacity 
          style={styles.button}
          onPress={runValidation}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? '🔄 Running...' : '🔄 Run Validation Again'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  expoGoWarning: {
    backgroundColor: '#FEF3C7',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  warningText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
  },
  warningSubtext: {
    fontSize: 14,
    color: '#78350F',
  },
  resultsContainer: {
    flex: 1,
    padding: 16,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  resultCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  resultMessage: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  finalStatus: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  finalStatusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  finalStatusText: {
    fontSize: 14,
    color: '#4B5563',
  },
  button: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});