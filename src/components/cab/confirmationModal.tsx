import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ConfirmationModalProps {
    visible: boolean;
    onClose: () => void;
    onDone: () => void;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    visible,
    onClose,
    onDone
}) => {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.confirmationOverlay}>
                <View style={styles.confirmationContent}>
                    <View style={styles.checkmark}>
                        <Ionicons name="checkmark" size={48} color="#fff" />
                    </View>
                    <Text style={styles.confirmationTitle}>Trip Confirmed!</Text>
                    <Text style={styles.confirmationSubtitle}>Your booking has been confirmed successfully</Text>
                    <TouchableOpacity
                        style={styles.searchBtn}
                        onPress={onDone}
                    >
                        <Text style={styles.searchBtnText}>Done</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    confirmationOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    confirmationContent: {
        backgroundColor: '#fff',
        padding: 40,
        borderRadius: 20,
        alignItems: 'center',
        maxWidth: 320,
    },
    checkmark: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#00d285',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    confirmationTitle: {
        fontSize: 24,
        color: '#333',
        marginBottom: 10,
        fontWeight: '600',
    },
    confirmationSubtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 20,
        textAlign: 'center',
    },
    searchBtn: {
        backgroundColor: '#00d285',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        width: '100%',
    },
    searchBtnText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
});

export default ConfirmationModal;