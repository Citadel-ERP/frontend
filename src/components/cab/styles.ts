import { StyleSheet } from 'react-native';

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
});



