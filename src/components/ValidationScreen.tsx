// screens/ValidationScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
  RefreshControl,
  Alert,
  Share
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { ConfigValidator } from '../utils/configValidator';
import { config } from '../config/config';

interface ValidationScreenProps {
  onBack: () => void;
}

export const ValidationScreen: React.FC<ValidationScreenProps> = ({ onBack }) => {
  const [results, setResults] = useState<any[]>([]);
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [willWork, setWillWork] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'validation' | 'logs' | 'config'>('validation');
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set());
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    runValidation();
    loadLogs();
  }, []);

  const runValidation = async () => {
    setLoading(true);
    try {
      const { results, willWorkInDevBuild, systemInfo } = await ConfigValidator.validateAll();
      setResults(results);
      setWillWork(willWorkInDevBuild);
      setSystemInfo(systemInfo);
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLogs = async () => {
    try {
      const systemLogs = await ConfigValidator.getSystemLogs();
      setLogs(systemLogs.reverse()); // Most recent first
    } catch (error) {
      console.error('Error loading logs:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await runValidation();
    await loadLogs();
    setRefreshing(false);
  };

  const clearLogs = async () => {
    Alert.alert(
      'Clear Logs',
      'Are you sure you want to clear all system logs?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await ConfigValidator.clearLogs();
            await loadLogs();
          }
        }
      ]
    );
  };

  const exportReport = async () => {
    const report = `
CITADEL VALIDATION REPORT
Generated: ${new Date().toLocaleString()}

=== SYSTEM INFO ===
Platform: ${systemInfo?.platform} ${systemInfo?.version}
Environment: ${systemInfo?.isExpoGo ? 'Expo Go' : systemInfo?.isDevelopmentBuild ? 'Dev Build' : 'Production'}
Device: ${systemInfo?.deviceName}
App Version: ${systemInfo?.appVersion}

=== VALIDATION RESULTS ===
${results.map((r, i) => `
${i + 1}. ${r.category}
   Status: ${r.status.toUpperCase()}
   ${r.message}
   ${r.details ? 'Details: ' + r.details : ''}
`).join('\n')}

=== CONFIGURATION ===
Backend URL: ${config.BACKEND_URL}
WebSocket URL: ${config.BACKEND_URL_WEBSOCKET}

=== CONCLUSION ===
Will work in dev build: ${willWork ? 'YES ✅' : 'NO ❌'}
    `.trim();

    try {
      await Share.share({
        message: report,
        title: 'Citadel Validation Report'
      });
    } catch (error) {
      console.error('Error sharing report:', error);
    }
  };

  const toggleResultExpansion = (index: number) => {
    const newExpanded = new Set(expandedResults);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedResults(newExpanded);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass': return '#10B981';
      case 'warning': return '#F59E0B';
      case 'fail': return '#EF4444';
      case 'info': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return 'checkmark-circle';
      case 'warning': return 'warning';
      case 'fail': return 'close-circle';
      case 'info': return 'information-circle';
      default: return 'help-circle';
    }
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'success': return '#10B981';
      case 'error': return '#EF4444';
      case 'warning': return '#F59E0B';
      case 'info': return '#3B82F6';
      default: return '#6B7280';
    }
  };

  const inExpoGo = Constants.appOwnership === 'expo';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>System Validation</Text>
        <TouchableOpacity onPress={exportReport} style={styles.shareButton}>
          <Ionicons name="share-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'validation' && styles.activeTab]}
          onPress={() => setActiveTab('validation')}
        >
          <Text style={[styles.tabText, activeTab === 'validation' && styles.activeTabText]}>
            Validation
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'logs' && styles.activeTab]}
          onPress={() => setActiveTab('logs')}
        >
          <Text style={[styles.tabText, activeTab === 'logs' && styles.activeTabText]}>
            Logs ({logs.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'config' && styles.activeTab]}
          onPress={() => setActiveTab('config')}
        >
          <Text style={[styles.tabText, activeTab === 'config' && styles.activeTabText]}>
            Config
          </Text>
        </TouchableOpacity>
      </View>

      {/* Expo Go Warning */}
      {inExpoGo && Platform.OS === 'ios' && activeTab === 'validation' && (
        <View style={styles.expoGoWarning}>
          <Ionicons name="warning" size={24} color="#92400E" />
          <View style={styles.warningTextContainer}>
            <Text style={styles.warningTitle}>Running in Expo Go</Text>
            <Text style={styles.warningText}>
              Background location features won't work on iOS in Expo Go. This is NORMAL and EXPECTED.
            </Text>
            <Text style={styles.warningSubtext}>
              ✅ Your config is correct for a dev build
            </Text>
          </View>
        </View>
      )}

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Validation Tab */}
        {activeTab === 'validation' && (
          <>
            {results.map((result, index) => {
              const isExpanded = expandedResults.has(index);
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.resultCard,
                    { borderLeftColor: getStatusColor(result.status) }
                  ]}
                  onPress={() => result.details && toggleResultExpansion(index)}
                  activeOpacity={result.details ? 0.7 : 1}
                >
                  <View style={styles.resultHeader}>
                    <Ionicons
                      name={getStatusIcon(result.status) as any}
                      size={24}
                      color={getStatusColor(result.status)}
                    />
                    <View style={styles.resultTitleContainer}>
                      <Text style={styles.resultCategory}>{result.category}</Text>
                      <Text style={styles.resultMessage}>{result.message}</Text>
                    </View>
                    {result.details && (
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color="#9CA3AF"
                      />
                    )}
                  </View>
                  {isExpanded && result.details && (
                    <View style={styles.resultDetails}>
                      <Text style={styles.detailsText}>{result.details}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </>
        )}

        {/* Logs Tab */}
        {activeTab === 'logs' && (
          <>
            <View style={styles.logsHeader}>
              <Text style={styles.logsTitle}>System Logs</Text>
              <TouchableOpacity onPress={clearLogs} style={styles.clearButton}>
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
            </View>
            {logs.length === 0 ? (
              <View style={styles.emptyLogs}>
                <Ionicons name="document-text-outline" size={48} color="#9CA3AF" />
                <Text style={styles.emptyLogsText}>No logs yet</Text>
              </View>
            ) : (
              logs.map((log, index) => (
                <View key={index} style={styles.logCard}>
                  <View style={styles.logHeader}>
                    <View style={[
                      styles.logLevelBadge,
                      { backgroundColor: getLogLevelColor(log.level) }
                    ]}>
                      <Text style={styles.logLevelText}>
                        {log.level.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.logTimestamp}>
                      {new Date(log.timestamp).toLocaleString()}
                    </Text>
                  </View>
                  <Text style={styles.logCategory}>{log.category}</Text>
                  <Text style={styles.logMessage}>{log.message}</Text>
                  {log.data && (
                    <View style={styles.logData}>
                      <Text style={styles.logDataText}>
                        {typeof log.data === 'string' ? log.data : JSON.stringify(log.data, null, 2)}
                      </Text>
                    </View>
                  )}
                </View>
              ))
            )}
          </>
        )}

        {/* Config Tab */}
        {activeTab === 'config' && (
          <>
            <View style={styles.configCard}>
              <Text style={styles.configTitle}>Backend Configuration</Text>
              <View style={styles.configItem}>
                <Text style={styles.configLabel}>Backend URL:</Text>
                <Text style={styles.configValue}>{config.BACKEND_URL}</Text>
              </View>
              <View style={styles.configItem}>
                <Text style={styles.configLabel}>WebSocket URL:</Text>
                <Text style={styles.configValue}>{config.BACKEND_URL_WEBSOCKET}</Text>
              </View>
            </View>

            {systemInfo && (
              <View style={styles.configCard}>
                <Text style={styles.configTitle}>System Information</Text>
                <View style={styles.configItem}>
                  <Text style={styles.configLabel}>Platform:</Text>
                  <Text style={styles.configValue}>
                    {systemInfo.platform} {systemInfo.version}
                  </Text>
                </View>
                <View style={styles.configItem}>
                  <Text style={styles.configLabel}>Environment:</Text>
                  <Text style={styles.configValue}>
                    {systemInfo.isExpoGo ? 'Expo Go' : systemInfo.isDevelopmentBuild ? 'Development' : 'Production'}
                  </Text>
                </View>
                <View style={styles.configItem}>
                  <Text style={styles.configLabel}>Device:</Text>
                  <Text style={styles.configValue}>{systemInfo.deviceName}</Text>
                </View>
                <View style={styles.configItem}>
                  <Text style={styles.configLabel}>App Version:</Text>
                  <Text style={styles.configValue}>{systemInfo.appVersion}</Text>
                </View>
                {systemInfo.projectId && (
                  <View style={styles.configItem}>
                    <Text style={styles.configLabel}>Project ID:</Text>
                    <Text style={styles.configValue}>{systemInfo.projectId}</Text>
                  </View>
                )}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Footer */}
      {activeTab === 'validation' && (
        <View style={styles.footer}>
          <View style={[
            styles.finalStatus,
            { backgroundColor: willWork ? '#10B98120' : '#EF444420' }
          ]}>
            <Ionicons
              name={willWork ? 'checkmark-circle' : 'close-circle'}
              size={24}
              color={willWork ? '#10B981' : '#EF4444'}
            />
            <View style={styles.finalStatusTextContainer}>
              <Text style={[
                styles.finalStatusTitle,
                { color: willWork ? '#10B981' : '#EF4444' }
              ]}>
                {willWork ? 'Ready for Dev Build' : 'Config Issues Found'}
              </Text>
              <Text style={styles.finalStatusText}>
                {willWork 
                  ? 'Your configuration is correct. Background features will work in a development build.'
                  : 'Fix the configuration issues above before building.'}
              </Text>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={runValidation}
            disabled={loading}
          >
            <Ionicons name="refresh" size={20} color="white" />
            <Text style={styles.refreshButtonText}>
              {loading ? 'Running...' : 'Run Again'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#2D3748',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 15,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'white',
    flex: 1,
    textAlign: 'center',
  },
  shareButton: {
    padding: 8,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#3B82F6',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  expoGoWarning: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#F59E0B',
  },
  warningTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 14,
    color: '#78350F',
    marginBottom: 4,
  },
  warningSubtext: {
    fontSize: 12,
    color: '#78350F',
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  resultCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  resultTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  resultCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  resultMessage: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  resultDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  detailsText: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  logsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  logsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  clearButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EF4444',
    borderRadius: 6,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyLogs: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyLogsText: {
    fontSize: 16,
    color: '#9CA3AF',
    marginTop: 12,
  },
  logCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logLevelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  logLevelText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  logTimestamp: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  logCategory: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  logMessage: {
    fontSize: 13,
    color: '#4B5563',
    marginBottom: 4,
  },
  logData: {
    backgroundColor: '#F3F4F6',
    padding: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  logDataText: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  configCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  configTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
  },
  configItem: {
    marginBottom: 12,
  },
  configLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
  },
  configValue: {
    fontSize: 14,
    color: '#111827',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  footer: {
    backgroundColor: 'white',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  finalStatus: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  finalStatusTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  finalStatusTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  finalStatusText: {
    fontSize: 13,
    color: '#4B5563',
  },
  refreshButton: {
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
});