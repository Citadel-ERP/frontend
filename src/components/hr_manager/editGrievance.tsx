import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './styles';
import { WHATSAPP_COLORS } from './constants';
import { Header } from './header';
import { Item } from './types';

interface EditGrievanceProps {
    item: Item;
    token: string | null;
    onUpdate: (data: {
        grievance_id: string;
        status: string;
    }) => Promise<void>;
    onBack: () => void;
    loading: boolean;
}

const getStatusConfig = (status: string): { color: string, label: string, icon: string } => {
    switch (status) {
        case 'resolved':
            return { color: '#10B981', label: 'Resolved', icon: 'checkmark-circle' };
        case 'rejected':
            return { color: '#EF4444', label: 'Rejected', icon: 'close-circle' };
        case 'in_progress':
            return { color: '#3B82F6', label: 'In Progress', icon: 'sync-circle' };
        case 'pending':
            return { color: '#F59E0B', label: 'Pending', icon: 'time' };
        case 'cancelled':
            return { color: '#8B5CF6', label: 'Cancelled', icon: 'ban' };
        default:
            return { color: '#6B7280', label: status, icon: 'help-circle' };
    }
};

export const EditGrievance: React.FC<EditGrievanceProps> = ({
    item,
    token,
    onUpdate,
    onBack,
    loading
}) => {
    const insets = useSafeAreaInsets();
    const [selectedStatus, setSelectedStatus] = useState(item.status);

    const handleSubmit = async () => {
        if (!token) {
            Alert.alert('Error', 'Authentication required');
            return;
        }

        if (!selectedStatus || selectedStatus === item.status) {
            Alert.alert('No Changes', 'Please select a different status to update');
            return;
        }

        await onUpdate({
            grievance_id: item.id,
            status: selectedStatus
        });
    };

    const statusOptions = [
        { value: 'pending', label: 'Pending', icon: 'time' },
        { value: 'in_progress', label: 'In Progress', icon: 'sync-circle' },
        { value: 'resolved', label: 'Resolved', icon: 'checkmark-circle' },
        { value: 'rejected', label: 'Rejected', icon: 'close-circle' },
    ];

    const currentConfig = getStatusConfig(item.status);

    return (
        <View style={[styles.container]}>
            <StatusBar
                barStyle="light-content"
                backgroundColor={WHATSAPP_COLORS.primaryDark}
            />
            <Header
                title="Edit Grievance"
                subtitle="Update grievance status"
                onBack={onBack}
            />

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContentPadded}
            >
                {/* Grievance Information Card */}
                <View style={styles.modernFormCard}>
                    <View style={styles.previewHeader}>
                        <View style={{
                            backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            padding: 10,
                            borderRadius: 12,
                        }}>
                            <Ionicons name="alert-circle" size={24} color="#EF4444" />
                        </View>
                        <Text style={styles.previewTitle}>Grievance Details</Text>
                    </View>

                    <View style={styles.previewContent}>
                        {/* Nature */}
                        <View style={styles.previewItem}>
                            <Text style={styles.previewLabel}>Grievance Type</Text>
                            <Text style={styles.previewValue}>{item.nature}</Text>
                        </View>

                        {/* Current Status Badge */}
                        <View style={styles.previewItem}>
                            <Text style={styles.previewLabel}>Current Status</Text>
                            <View style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                marginTop: 4,
                            }}>
                                <View style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    backgroundColor: currentConfig.color + '15',
                                    paddingHorizontal: 12,
                                    paddingVertical: 6,
                                    borderRadius: 20,
                                    borderWidth: 1,
                                    borderColor: currentConfig.color + '40',
                                }}>
                                    <Ionicons
                                        name={currentConfig.icon as any}
                                        size={16}
                                        color={currentConfig.color}
                                    />
                                    <Text style={{
                                        fontSize: 14,
                                        fontWeight: '600',
                                        color: currentConfig.color,
                                        marginLeft: 6,
                                    }}>
                                        {currentConfig.label}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Employee Info */}
                        {item.employee_name && (
                            <View style={styles.previewItem}>
                                <Text style={styles.previewLabel}>Submitted By</Text>
                                <Text style={styles.previewValue}>
                                    {item.employee_name}
                                    {item.employee_email && (
                                        <Text style={{ color: WHATSAPP_COLORS.gray, fontSize: 13 }}>
                                            {'\n'}{item.employee_email}
                                        </Text>
                                    )}
                                </Text>
                            </View>
                        )}

                        {/* Description */}
                        <View style={styles.previewItem}>
                            <Text style={styles.previewLabel}>Issue Description</Text>
                            <View style={{
                                backgroundColor: '#FEE2E2',
                                padding: 12,
                                borderRadius: 10,
                                marginTop: 4,
                                borderLeftWidth: 3,
                                borderLeftColor: '#EF4444',
                            }}>
                                <Text style={{
                                    fontSize: 14,
                                    color: '#7F1D1D',
                                    lineHeight: 20,
                                }}>
                                    {item.description || item.issue || 'No description provided'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Status Update Section */}
                <View style={styles.modernFormCard}>
                    <View style={styles.modernLabelContainer}>
                        <Text style={styles.modernLabel}>Select New Status</Text>
                        <View style={styles.requiredBadge}>
                            <Text style={styles.requiredBadgeText}>Required</Text>
                        </View>
                    </View>

                    <View style={{
                        gap: 12,
                        marginTop: 4,
                    }}>
                        {statusOptions.map((option) => {
                            const isSelected = selectedStatus === option.value;
                            const config = getStatusConfig(option.value);

                            return (
                                <TouchableOpacity
                                    key={option.value}
                                    style={{
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        backgroundColor: isSelected ? config.color : '#F8F9FA',
                                        paddingVertical: 16,
                                        paddingHorizontal: 16,
                                        borderRadius: 14,
                                        borderWidth: 2,
                                        borderColor: isSelected ? config.color : '#E8E8E8',
                                        shadowColor: isSelected ? config.color : '#000',
                                        shadowOffset: { width: 0, height: isSelected ? 4 : 2 },
                                        shadowOpacity: isSelected ? 0.2 : 0.05,
                                        shadowRadius: isSelected ? 8 : 4,
                                        elevation: isSelected ? 4 : 1,
                                    }}
                                    onPress={() => setSelectedStatus(option.value)}
                                    activeOpacity={0.7}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                        <View style={{
                                            width: 44,
                                            height: 44,
                                            borderRadius: 12,
                                            backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.3)' : config.color + '20',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            marginRight: 12,
                                        }}>
                                            <Ionicons
                                                name={config.icon as any}
                                                size={24}
                                                color={isSelected ? '#FFFFFF' : config.color}
                                            />
                                        </View>
                                        <Text style={{
                                            fontSize: 16,
                                            fontWeight: isSelected ? '700' : '600',
                                            color: isSelected ? '#FFFFFF' : WHATSAPP_COLORS.darkGray,
                                            flex: 1,
                                        }}>
                                            {option.label}
                                        </Text>
                                    </View>

                                    {isSelected && (
                                        <View style={{
                                            width: 28,
                                            height: 28,
                                            borderRadius: 14,
                                            backgroundColor: '#FFFFFF',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}>
                                            <Ionicons
                                                name="checkmark"
                                                size={18}
                                                color={config.color}
                                            />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Help Text */}
                    <View style={{
                        flexDirection: 'row',
                        alignItems: 'flex-start',
                        backgroundColor: '#DBEAFE',
                        padding: 12,
                        borderRadius: 10,
                        marginTop: 16,
                        borderLeftWidth: 3,
                        borderLeftColor: '#3B82F6',
                    }}>
                        <Ionicons
                            name="shield-checkmark"
                            size={20}
                            color="#3B82F6"
                            style={{ marginRight: 8, marginTop: 1 }}
                        />
                        <Text style={{
                            flex: 1,
                            fontSize: 13,
                            color: '#1E40AF',
                            lineHeight: 18,
                        }}>
                            Updating the grievance status will notify the employee and HR team immediately.
                        </Text>
                    </View>
                </View>
            </ScrollView>

            {/* Fixed Bottom Action Buttons */}
            <View style={[
                styles.fixedBottomContainer,
                { paddingBottom: Math.max(insets.bottom, 16) }
            ]}>
                <TouchableOpacity
                    style={styles.modernCancelButton}
                    onPress={onBack}
                    disabled={loading}
                    activeOpacity={0.7}
                >
                    <Ionicons name="close-circle-outline" size={22} color={WHATSAPP_COLORS.darkGray} />
                    <Text style={styles.modernCancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.modernSubmitButton,
                        (!selectedStatus || selectedStatus === item.status || loading) &&
                        styles.modernSubmitButtonDisabled
                    ]}
                    onPress={handleSubmit}
                    disabled={loading || !selectedStatus || selectedStatus === item.status}
                    activeOpacity={0.7}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                        <>
                            <Ionicons
                                name="checkmark-circle"
                                size={22}
                                color="#FFFFFF"
                            />
                            <Text style={styles.modernSubmitButtonText}>
                                Update Grievance
                            </Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
};