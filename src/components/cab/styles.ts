import { StyleSheet, Platform } from 'react-native';

export const styles = StyleSheet.create({
    appContainer: {
        flex: 1,
        backgroundColor: '#e7e6e5',
    },
    screenContainer: {
        flex: 1,
    },
    bottomNav: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#fff',
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingVertical: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 5,
    },
    navItem: {
        alignItems: 'center',
        padding: 5,
    },
    activeNavItem: {},
    navLabel: {
        fontSize: 12,
        color: '#666',
        marginTop: 5,
    },
    activeNavLabel: {
        color: '#008069',
    },
    navIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#f5f5f5',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    activeNavIconContainer: {
        backgroundColor: '#008069',
        shadowColor: '#008069',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    pickerModalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    pickerModalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    },
    pickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    pickerTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#333',
    },
    pickerCancelText: {
        fontSize: 16,
        color: '#ff5e7a',
        fontWeight: '500',
    },
    pickerDoneText: {
        fontSize: 16,
        color: '#00d285',
        fontWeight: '600',
    },
    dateTimePicker: {
        height: 220,
        backgroundColor: '#fff',
    },
});



