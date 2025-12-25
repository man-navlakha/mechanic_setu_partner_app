import { Image } from 'expo-image';
import { Bike, Car, Check, ChevronsRight, MapPin, Truck, User, VolumeOff, X } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    Extrapolate,
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');
const BUTTON_HEIGHT = 60;
const BUTTON_WIDTH = width - 60;
const BUTTON_PADDING = 5;
const SWIPEABLE_DIMENSIONS = BUTTON_HEIGHT - 2 * BUTTON_PADDING;
const H_SWIPE_RANGE = BUTTON_WIDTH - 2 * BUTTON_PADDING - SWIPEABLE_DIMENSIONS;

// --- Helper: Vehicle Icon ---
const getVehicleIcon = (type, isDark) => {
    const t = type?.toLowerCase();
    const color = isDark ? "#60a5fa" : "#2563eb";
    if (t?.includes('bike') || t?.includes('motorcycle')) return <Bike size={24} color={color} />;
    if (t?.includes('truck')) return <Truck size={24} color={color} />;
    return <Car size={24} color={color} />;
};

// --- Modern Swipe Button Component ---
const SwipeButton = ({ onToggle, t, isDark }) => {
    const X = useSharedValue(0);
    const [isSuccess, setIsSuccess] = useState(false);

    const handleComplete = (finished) => {
        if (finished) {
            setIsSuccess(true);
            onToggle();
        }
    };

    const panGesture = Gesture.Pan()
        .onUpdate((e) => {
            if (isSuccess) return;
            let newValue = e.translationX;
            if (newValue >= 0 && newValue <= H_SWIPE_RANGE) {
                X.value = newValue;
            }
        })
        .onEnd(() => {
            if (isSuccess) return;
            if (X.value > H_SWIPE_RANGE * 0.7) {
                X.value = withSpring(H_SWIPE_RANGE, { damping: 20 }, (finished) => {
                    if (finished) runOnJS(handleComplete)(true);
                });
            } else {
                X.value = withSpring(0);
            }
        });

    const animatedKnobStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: X.value }]
    }));

    const animatedOverlayStyle = useAnimatedStyle(() => ({
        width: X.value + SWIPEABLE_DIMENSIONS + BUTTON_PADDING
    }));

    const animatedTextStyle = useAnimatedStyle(() => ({
        opacity: interpolate(X.value, [0, H_SWIPE_RANGE / 2], [1, 0], Extrapolate.CLAMP),
    }));

    // Green Swipe Theme
    const theme = {
        container: '#dcfce7', // Light green bg
        overlay: '#22c55e',   // Green fill
        knob: 'white',
        text: '#15803d'       // Dark green text
    };

    return (
        <View style={[styles.swipeContainer, { backgroundColor: theme.container }]}>
            <Animated.View style={[styles.colorOverlay, { backgroundColor: theme.overlay }, animatedOverlayStyle]} />
            <Animated.Text style={[styles.swipeText, { color: theme.text }, animatedTextStyle]}>
                {isSuccess ? t('jobPopup.accepted') : t('jobPopup.swipeToAccept')}
            </Animated.Text>
            <GestureDetector gesture={panGesture}>
                <Animated.View style={[styles.swipeable, { backgroundColor: theme.knob }, animatedKnobStyle]}>
                    {isSuccess ? <Check size={28} color={theme.overlay} /> : <ChevronsRight size={28} color={theme.overlay} />}
                </Animated.View>
            </GestureDetector>
        </View>
    );
};

// --- Main Component ---
export default function JobNotificationPopup({ job, onAccept, onReject, onMinimize, onStopSound }) {
    const { t } = useTranslation();
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    if (!job) return null;

    return (
        <View style={styles.overlay}>

            {/* Top Floating Actions */}
            <View style={styles.topActionsStub}>
                {/* Stop Sound Pill */}
                <TouchableOpacity onPress={onStopSound} style={[styles.pillBtn, styles.mutePill]}>
                    <VolumeOff size={18} color="#475569" />
                    <Text style={styles.muteText}>{t('jobPopup.stopSound')}</Text>
                </TouchableOpacity>

                <View style={{ flexDirection: 'row', gap: 8 }}>
                    {/* Minimize/Close Pill */}
                    <TouchableOpacity onPress={onMinimize} style={[styles.pillBtn, styles.mutePill]}>
                        <Text style={styles.muteText}>{t('header.close') || 'Close'}</Text>
                    </TouchableOpacity>

                    {/* Deny Pill */}
                    <TouchableOpacity onPress={onReject} style={[styles.pillBtn, styles.denyPill]}>
                        <X size={18} color="white" />
                        <Text style={styles.denyText}>{t('jobPopup.deny')}</Text>
                    </TouchableOpacity>
                </View>
            </View>


            <View style={[styles.sheet, { backgroundColor: isDark ? '#1e293b' : 'white' }]}>

                {/* Floating Badge (New Request) */}
                <View style={styles.floatingBadge}>
                    <Text style={styles.badgeText}>{t('jobPopup.newRequest')}</Text>
                </View>

                {/* Main Hero Content */}
                <View style={{ paddingTop: 30, alignItems: 'center', marginBottom: 20 }}>

                    {/* Problem (Hero) */}
                    <Text style={[styles.heroTitle, { color: isDark ? '#f1f5f9' : '#0f172a' }]}>
                        {job.problem || t('jobPopup.unknownIssue')}
                    </Text>

                    {/* Vehicle (Sub) */}
                    <View style={styles.vehicleTag}>
                        {getVehicleIcon(job.vehical_type, isDark)}
                        <Text style={[styles.heroSub, { color: isDark ? '#94a3b8' : '#64748b' }]}>
                            {job.vehical_type || t('jobPopup.vehicle')}
                        </Text>
                    </View>
                </View>

                <View style={[styles.divider, { backgroundColor: isDark ? '#334155' : '#e5e7eb' }]} />

                {/* Info Rows */}
                <View style={styles.infoSection}>

                    {/* Location */}
                    <View style={styles.row}>
                        <View style={[styles.iconCircle, { backgroundColor: isDark ? '#334155' : '#eff6ff' }]}>
                            <MapPin size={20} color={isDark ? '#60a5fa' : '#2563eb'} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>{t('jobPopup.location')}</Text>
                            <Text style={[styles.value, { color: isDark ? '#e2e8f0' : '#1e293b' }]} numberOfLines={2}>
                                {job.location || t('jobPopup.locationShared')}
                            </Text>
                        </View>
                    </View>

                    {/* User */}
                    <View style={styles.row}>
                        <View style={[styles.iconCircle, { backgroundColor: isDark ? '#334155' : '#fce7f3' }]}>
                            {job.user_profile_pic ? (
                                <Image
                                    source={job.user_profile_pic}
                                    style={styles.userAvatar}
                                    contentFit="cover"
                                    transition={200} // Smooth fade in
                                    cachePolicy="disk"
                                />
                            ) : (
                                <User size={20} color={isDark ? '#f472b6' : '#db2777'} />
                            )}
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.label}>{t('jobPopup.customer')}</Text>
                            <Text style={[styles.value, { color: isDark ? '#e2e8f0' : '#1e293b' }]}>
                                {job.first_name} {job.last_name}
                            </Text>
                            <Text style={styles.subValue}>
                                {job.mobile_number}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Swipe Button */}
                <View style={{ marginTop: 24 }}>
                    <SwipeButton onToggle={onAccept} t={t} isDark={isDark} />
                </View>

            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 100000,
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: 80
    },
    topActionsStub: {
        position: 'absolute',
        top: 60,
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        zIndex: 100002,
    },
    pillBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 30,
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        gap: 8,
    },
    mutePill: {
        backgroundColor: '#f8fafc', // Slate 50
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    denyPill: {
        backgroundColor: '#ef4444', // Red 500
        borderWidth: 1,
        borderColor: '#dc2626',
    },
    muteText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#475569',
    },
    denyText: {
        fontSize: 14,
        fontWeight: '700',
        color: 'white',
    },

    sheet: {
        width: '94%',
        borderRadius: 24,
        padding: 24,
        paddingTop: 32,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 5 },
        elevation: 10,
        marginBottom: 10,
    },
    floatingBadge: {
        position: 'absolute',
        top: -20,
        alignSelf: 'center',
        backgroundColor: '#2563eb', // Blue
        paddingVertical: 8,
        paddingHorizontal: 24,
        borderRadius: 24,
        borderWidth: 4,
        borderColor: '#f1f5f9', // Match approx overlay or bg
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
    },
    badgeText: {
        color: 'white',
        fontWeight: '800',
        fontSize: 14,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    heroTitle: {
        fontSize: 26,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    vehicleTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(0,0,0,0.04)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    heroSub: {
        fontSize: 16,
        fontWeight: '700',
        textTransform: 'uppercase',
    },

    divider: {
        height: 1,
        marginVertical: 20,
    },

    infoSection: {
        gap: 20,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    userAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    label: {
        fontSize: 11,
        color: '#64748b',
        fontWeight: '700',
        textTransform: 'uppercase',
        marginBottom: 2,
        letterSpacing: 0.5,
    },
    value: {
        fontSize: 16,
        fontWeight: '600',
        lineHeight: 22,
    },
    subValue: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 2,
    },

    // Swipe Button
    swipeContainer: {
        width: '100%',
        height: BUTTON_HEIGHT,
        borderRadius: BUTTON_HEIGHT / 2,
        justifyContent: 'center',
        padding: BUTTON_PADDING,
        overflow: 'hidden',
    },
    colorOverlay: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        borderRadius: BUTTON_HEIGHT / 2,
    },
    swipeText: {
        position: 'absolute',
        alignSelf: 'center',
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    swipeable: {
        width: SWIPEABLE_DIMENSIONS,
        height: SWIPEABLE_DIMENSIONS,
        borderRadius: SWIPEABLE_DIMENSIONS / 2,
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
});