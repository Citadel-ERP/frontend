import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Image,
    Platform,
    Dimensions,
    Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

interface Module {
    title: string;
    iconUrl: string;
    module_unique_name: string;
    is_generic: boolean;
}

interface AllModulesModalProps {
    isVisible: boolean;
    onClose: () => void;
    modules: Module[];
    searchQuery: string;
    onSearchChange: (text: string) => void;
    onModulePress: (moduleName: string, moduleUniqueName?: string) => void;
    theme: any;
    currentColors: any;
}

const AllModulesModal: React.FC<AllModulesModalProps> = ({
    isVisible,
    onClose,
    modules,
    searchQuery,
    onSearchChange,
    onModulePress,
    theme,
    currentColors,
}) => {
    const itemWidth = (width - 60) / 2;

    return (
        <Modal animationType="slide" transparent={false} visible={isVisible} onRequestClose={onClose} statusBarTranslucent={true} >
            {/* <SafeAreaView style={[styles.modalContainer, { backgroundColor: '#3262f1' }]}> */}
                <LinearGradient
                    colors={[currentColors.gradientStart, currentColors.gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.modalHeaderGradient, styles.linearGradient]}
                >
                    <View style={styles.modalHeader}>
                        <View style={styles.modalHeaderRow}>
                            <TouchableOpacity onPress={onClose} style={styles.modalBackButton}>
                                <Ionicons name="arrow-back" size={24} color="white" />
                            </TouchableOpacity>
                            <View style={styles.modalTitleContainer}>
                                {/* <LinearGradient
                                    colors={[currentColors.gradientStart, currentColors.gradientEnd]}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.linearGradient}
                                > */}
                                <Text style={styles.modalTitle}>All Modules</Text>
                                <Text style={styles.modalSubtitle}>{modules.length} Available</Text>
                                {/* </LinearGradient> */}
                            </View>
                            <View style={{ width: 40 }} />
                        </View>
                    </View>
                    {/* Search Bar */}
                    <View style={styles.searchContainer}>
                        <View style={[styles.searchBar, { backgroundColor: 'rgba(255, 255, 255, 0.15)' }]}>
                            <Ionicons name="search" size={20} color="rgba(255, 255, 255, 0.7)" />
                            <TextInput style={styles.searchInput} placeholder="Search modules..." placeholderTextColor="rgba(255, 255, 255, 0.7)" value={searchQuery} onChangeText={onSearchChange} autoCapitalize="none" autoCorrect={false} />
                            {searchQuery.length > 0 && (
                                <TouchableOpacity onPress={() => onSearchChange('')}>
                                    <Ionicons name="close-circle" size={20} color="rgba(255, 255, 255, 0.7)" />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </LinearGradient>
                <ScrollView
                    style={styles.modalContent}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={[
                        styles.modalContentContainer,
                        { paddingBottom: Platform.OS === 'ios' ? 100 : 80 }
                    ]}
                >
                    {modules.length === 0 ? (
                        <View style={styles.noResultsContainer}>
                            <Ionicons name="search-outline" size={60} color={theme.textSub} />
                            <Text style={[styles.noResultsText, { color: theme.textMain }]}>
                                No modules found
                            </Text>
                            <Text style={[styles.noResultsSubtext, { color: theme.textSub }]}>
                                Try searching with different keywords
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.allModulesGrid}>
                            {modules.map((module: any, index: number) => (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.moduleItemModalSquare,
                                        {
                                            backgroundColor: theme.cardBg,
                                            width: itemWidth,
                                            height: itemWidth,
                                        }
                                    ]}
                                    onPress={() => {
                                        onModulePress(module.title, module.module_unique_name);
                                        onClose();
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.moduleIconContainerModalSimple}>
                                        <Image
                                            source={{ uri: module.iconUrl || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png' }}
                                            style={styles.moduleIconImageModalSimple}
                                            resizeMode="contain"
                                        />
                                    </View>
                                    <Text style={[styles.moduleTitleModalSimple, { color: theme.textMain }]} numberOfLines={2}>
                                        {module.title}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </ScrollView>
            {/* </SafeAreaView> */}
        </Modal >
    );
};

const styles = StyleSheet.create({
    modalContainer: {
        flex: 1,
    },
    modalHeaderGradient: {
        // borderBottomLeftRadius: 30,
        // borderBottomRightRadius: 30,
        overflow: 'hidden',
        paddingBottom: 20,
    },
    modalHeader: {
        paddingTop: Platform.OS === 'ios' ? 60 : 60,
        paddingHorizontal: 20,
    },
    modalHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    modalBackButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: 'white',
    },
    modalSubtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '500',
        marginTop: 4,
    },
    searchContainer: {
        paddingHorizontal: 20,
        marginTop: 10,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 12,
        borderRadius: 12,
    },
    searchInput: {
        flex: 1,
        color: 'white',
        fontSize: 16,
        marginLeft: 10,
        padding: 0,
    },
    modalContent: {
        flex: 1,
        backgroundColor: '#f8f9fa',
    },
    modalContentContainer: {
        padding: 20,
    },
    allModulesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    moduleItemModalSquare: {
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
        marginBottom: 20,
        padding: 16,
    },
    moduleIconContainerModalSimple: {
        width: 60,
        height: 60,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    moduleIconImageModalSimple: {
        width: 40,
        height: 40,
    },
    moduleTitleModalSimple: {
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 18,
    },
    noResultsContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 80,
    },
    noResultsText: {
        fontSize: 20,
        fontWeight: '600',
        marginTop: 20,
        marginBottom: 8,
    },
    noResultsSubtext: {
        fontSize: 14,
        textAlign: 'center',
    },
    linearGradient: {
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        // shadowRadius: 8098,
        elevation: 6,
    }
});

export default AllModulesModal;