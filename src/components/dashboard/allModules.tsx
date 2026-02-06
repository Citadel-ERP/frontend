import React, { useState, useEffect } from 'react';
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
    Animated,
    StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

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
    const [slideAnim] = useState(new Animated.Value(height));
    const [fadeAnim] = useState(new Animated.Value(0));
    const itemWidth = (width - 60) / 2;

    useEffect(() => {
        if (isVisible) {
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 65,
                    friction: 10,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: height,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [isVisible]);

    const handleClose = () => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: height,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onClose();
        });
    };

    return (
        <Modal
            animationType="none"
            transparent={true}
            visible={isVisible}
            onRequestClose={handleClose}
            statusBarTranslucent={true}
        >
            <StatusBar
                barStyle="light-content"
                backgroundColor="transparent"
                translucent={true}
            />
            
            {/* Backdrop */}
            <Animated.View
                style={[
                    styles.backdrop,
                    {
                        opacity: fadeAnim,
                    },
                ]}
            >
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={handleClose}
                />
            </Animated.View>

            {/* Modal Content */}
            <Animated.View
                style={[
                    styles.modalContainer,
                    { backgroundColor: theme.bgColor },
                    {
                        transform: [{ translateY: slideAnim }],
                    },
                ]}
            >
                {/* Header with Gradient */}
                <LinearGradient
                    colors={[currentColors.gradientStart, currentColors.gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.headerGradient}
                >
                    {/* Decorative sketch elements */}
                    <View style={styles.sketchCircle1} />
                    <View style={styles.sketchCircle2} />
                    <View style={styles.sketchWave} />
                    
                    <View style={styles.headerContent}>
                        {/* Top Bar */}
                        <View style={styles.topBar}>
                            <TouchableOpacity
                                onPress={handleClose}
                                style={styles.backButton}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="chevron-back" size={24} color="white" />
                                <Text style={styles.backText}>Back</Text>
                            </TouchableOpacity>
                            
                            <View style={styles.headerTextContainer}>
                                <Text style={styles.headerTitle}>All Modules</Text>
                                <Text style={styles.headerSubtitle}>
                                    {modules.length} {modules.length === 1 ? 'module' : 'modules'} available
                                </Text>
                            </View>
                            
                            <View style={styles.backButtonSpacer} />
                        </View>

                        {/* Search Bar */}
                        <View style={styles.searchWrapper}>
                            <View style={styles.searchBar}>
                                <Ionicons
                                    name="search"
                                    size={20}
                                    color="rgba(255, 255, 255, 0.7)"
                                    style={styles.searchIcon}
                                />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Search modules..."
                                    placeholderTextColor="rgba(255, 255, 255, 0.6)"
                                    value={searchQuery}
                                    onChangeText={onSearchChange}
                                    autoCapitalize="none"
                                    autoCorrect={false}
                                />
                                {searchQuery.length > 0 && (
                                    <TouchableOpacity
                                        onPress={() => onSearchChange('')}
                                        style={styles.clearButton}
                                        activeOpacity={0.7}
                                    >
                                        <Ionicons
                                            name="close-circle"
                                            size={20}
                                            color="rgba(255, 255, 255, 0.7)"
                                        />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>
                    </View>
                </LinearGradient>

                {/* Content Area */}
                <View style={[styles.contentWrapper, { backgroundColor: theme.bgColor }]}>
                    <ScrollView
                        style={styles.scrollView}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        bounces={true}
                    >
                        {modules.length === 0 ? (
                            <View style={styles.emptyState}>
                                <View style={[styles.emptyIconContainer, {
                                    backgroundColor: theme.cardBg === '#111a2d' ? 'rgba(255, 255, 255, 0.05)' : '#f5f5f5',
                                }]}>
                                    <Ionicons
                                        name="search-outline"
                                        size={48}
                                        color={theme.textSub || '#999'}
                                    />
                                </View>
                                <Text style={[styles.emptyTitle, { color: theme.textMain }]}>
                                    No modules found
                                </Text>
                                <Text style={[styles.emptySubtitle, { color: theme.textSub }]}>
                                    Try different search terms
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.modulesGrid}>
                                {modules.map((module: Module, index: number) => (
                                    <ModuleCard
                                        key={`${module.module_unique_name}-${index}`}
                                        module={module}
                                        index={index}
                                        itemWidth={itemWidth}
                                        theme={theme}
                                        currentColors={currentColors}
                                        onPress={() => {
                                            onModulePress(module.title, module.module_unique_name);
                                            handleClose();
                                        }}
                                    />
                                ))}
                            </View>
                        )}
                    </ScrollView>
                </View>
            </Animated.View>
        </Modal>
    );
};

// Module Card Component
const ModuleCard: React.FC<{
    module: Module;
    index: number;
    itemWidth: number;
    theme: any;
    currentColors: any;
    onPress: () => void;
}> = ({ module, index, itemWidth, theme, currentColors, onPress }) => {
    const [scaleAnim] = useState(new Animated.Value(0));

    useEffect(() => {
        Animated.spring(scaleAnim, {
            toValue: 1,
            delay: index * 30,
            useNativeDriver: true,
            tension: 100,
            friction: 8,
        }).start();
    }, []);

    return (
        <Animated.View
            style={{
                transform: [{ scale: scaleAnim }],
                opacity: scaleAnim,
            }}
        >
            <TouchableOpacity
                style={[
                    styles.moduleCard,
                    {
                        width: itemWidth,
                        backgroundColor: theme.cardBg,
                        borderColor: theme.cardBg === '#111a2d' ? 'rgba(255, 255, 255, 0.08)' : '#f0f0f0',
                    },
                ]}
                onPress={onPress}
                activeOpacity={0.7}
            >
                <View style={styles.moduleCardInner}>
                    <View style={[styles.iconContainer, {
                        backgroundColor: theme.cardBg === '#111a2d' 
                            ? 'rgba(255, 255, 255, 0.05)' 
                            : '#f8f9fa',
                    }]}>
                        <Image
                            source={{
                                uri: module.iconUrl || 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
                            }}
                            style={styles.moduleIcon}
                            resizeMode="contain"
                        />
                    </View>
                    <Text
                        style={[styles.moduleTitle, { color: theme.textMain }]}
                        numberOfLines={2}
                    >
                        {module.title}
                    </Text>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
    },
    modalContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    headerGradient: {
        paddingTop: Platform.OS === 'ios' ? 60 : StatusBar.currentHeight! + 20,
        paddingBottom: 20,
        position: 'relative',
        overflow: 'hidden',
    },
    sketchCircle1: {
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        top: -80,
        right: -60,
    },
    sketchCircle2: {
        position: 'absolute',
        width: 150,
        height: 150,
        borderRadius: 75,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        bottom: -40,
        left: -50,
    },
    sketchWave: {
        position: 'absolute',
        width: 300,
        height: 100,
        borderTopWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.06)',
        borderTopLeftRadius: 100,
        borderTopRightRadius: 100,
        bottom: 30,
        right: -100,
        transform: [{ rotate: '15deg' }],
    },
    headerContent: {
        paddingHorizontal: 20,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingRight: 8,
        minWidth: 70,
    },
    backButtonSpacer: {
        minWidth: 70,
    },
    backText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 2,
    },
    headerTextContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: 'white',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.85)',
        fontWeight: '500',
    },
    searchWrapper: {
        marginTop: 4,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.25)',
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        color: 'white',
        fontSize: 16,
        fontWeight: '500',
        padding: 0,
    },
    clearButton: {
        padding: 4,
    },
    contentWrapper: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: Platform.OS === 'ios' ? 100 : 80,
    },
    modulesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    moduleCard: {
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 1,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    moduleCardInner: {
        padding: 20,
        alignItems: 'center',
        minHeight: 150,
        justifyContent: 'center',
    },
    iconContainer: {
        width: 72,
        height: 72,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    moduleIcon: {
        width: 40,
        height: 40,
    },
    moduleTitle: {
        fontSize: 15,
        fontWeight: '600',
        textAlign: 'center',
        lineHeight: 20,
        letterSpacing: 0.2,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 100,
    },
    emptyIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8,
    },
    emptySubtitle: {
        fontSize: 14,
        textAlign: 'center',
    },
});

export default AllModulesModal;