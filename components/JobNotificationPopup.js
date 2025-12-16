import { Bike, Car, Check, ChevronsRight, Truck, X } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import { useEffect, useState } from 'react';
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
const BUTTON_WIDTH = width - 80;
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

    // Modern Gesture API (Fixes your error)
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

    const dynamicStyles = {
        swipeContainer: {
            backgroundColor: isDark ? '#334155' : '#f1f5f9',
            borderColor: isDark ? '#475569' : '#e2e8f0',
        },
        swipeable: {
            backgroundColor: isDark ? '#1e293b' : 'white',
        },
        swipeText: {
            color: isDark ? '#94a3b8' : '#64748b',
        },
    };

    return (
        <View style={[styles.swipeContainer, dynamicStyles.swipeContainer]}>
            <Animated.View style={[styles.colorOverlay, animatedOverlayStyle]} />
            <Animated.Text style={[styles.swipeText, dynamicStyles.swipeText, animatedTextStyle]}>
                {isSuccess ? t('jobPopup.accepted') : t('jobPopup.swipeToAccept')}
            </Animated.Text>
            <GestureDetector gesture={panGesture}>
                <Animated.View style={[styles.swipeable, dynamicStyles.swipeable, animatedKnobStyle]}>
                    {isSuccess ? <Check size={24} color="#22c55e" /> : <ChevronsRight size={24} color={isDark ? "#60a5fa" : "#2563eb"} />}
                </Animated.View>
            </GestureDetector>
        </View>
    );
};

// --- Countdown Timer ---
const CountdownTimer = ({ seconds, onExpire, t, isDark }) => {
    const [timeLeft, setTimeLeft] = useState(seconds);

    useEffect(() => {
        if (timeLeft === 0) {
            onExpire && onExpire();
            return;
        }
        const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
        return () => clearInterval(timer);
    }, [timeLeft]);

    return (
        <Text style={[styles.timerText, { color: isDark ? '#94a3b8' : '#64748b' }]}>
            {t('jobPopup.autoReject')} <Text style={{ color: isDark ? '#fbbf24' : '#d97706', fontWeight: 'bold' }}>{timeLeft}s</Text>
        </Text>
    );
};

// --- Main Component ---
export default function JobNotificationPopup({ job, onAccept, onReject, onMinimize }) {
    const { t } = useTranslation();
    const { colorScheme } = useColorScheme();
    const isDark = colorScheme === 'dark';

    if (!job) return null;
    console.log("JobNotificationPopup :", job);

    // Dynamic colors for dark mode
    const colors = {
        card: isDark ? '#1e293b' : 'white',
        body: isDark ? '#0f172a' : 'white',
        infoLabel: isDark ? '#94a3b8' : '#64748b',
        infoValue: isDark ? '#e2e8f0' : '#1e293b',
        // Info row colors
        blueRowBg: isDark ? 'rgba(37, 99, 235, 0.15)' : '#eff6ff',
        blueRowBorder: isDark ? 'rgba(37, 99, 235, 0.3)' : '#dbeafe',
        blueIconBg: isDark ? 'rgba(37, 99, 235, 0.25)' : '#dbeafe',
        yellowRowBg: isDark ? 'rgba(217, 119, 6, 0.15)' : '#fffbeb',
        yellowRowBorder: isDark ? 'rgba(217, 119, 6, 0.3)' : '#fef3c7',
        yellowIconBg: isDark ? 'rgba(217, 119, 6, 0.25)' : '#fef3c7',
        greenRowBg: isDark ? 'rgba(22, 163, 74, 0.15)' : '#f0fdf4',
        greenRowBorder: isDark ? 'rgba(22, 163, 74, 0.3)' : '#dcfce7',
        greenIconBg: isDark ? 'rgba(22, 163, 74, 0.25)' : '#dcfce7',
        footer: isDark ? '#1e293b' : 'white',
        timerBg: isDark ? '#334155' : '#f8fafc',
        timerBorder: isDark ? '#475569' : '#e2e8f0',
    };

    return (
        <View style={styles.overlay} className="mb-6 pb-12">
            {/* Reject Button (Floating Top Right) */}
            <TouchableOpacity onPress={onReject} style={styles.rejectBtn}>
                <X size={20} color="white" />
                <Text style={styles.rejectText}>{t('jobPopup.reject')}</Text>
            </TouchableOpacity>

            {/* Minimize Button (Floating Top Left) - NEW */}
            <TouchableOpacity onPress={onMinimize} style={styles.minimizeBtn}>
                <X size={24} color="white" />
            </TouchableOpacity>

            <View style={styles.sheet}>

                {/* Countdown bubble */}
                <View style={styles.countdownCircle}>
                    <CountdownTimer
                        seconds={12}
                        onExpire={onReject}
                        t={t}
                        isDark={isDark}
                    />
                </View>

                {/* Vehicle row */}
                <View style={styles.vehicleRow}>
                    <View style={styles.vehicleIcon}>
                        {getVehicleIcon(job.vehical_type, isDark)}
                    </View>

                    <View style={{ flex: 1 }}>
                        <Text style={styles.vehicleTitle}>
                            {job.vehical_type || 'Bike Taxi'}
                        </Text>
                        <Text style={styles.vehicleSub}>
                            Online Payment ₹{job.amount || 120}
                        </Text>
                    </View>
                </View>

                <View style={styles.divider} />

                {/* Pickup / Drop */}
                <View style={styles.routeBlock}>
                    <View style={styles.routeRow}>
                        <View style={styles.pickupDot} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.routeLabel}>Pickup · 2 km away</Text>
                            <Text style={styles.routeText} numberOfLines={2}>
                                {job.pickup || 'Pickup location'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.routeLine} />

                    <View style={styles.routeRow}>
                        <View style={styles.dropDot} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.routeLabel}>Drop · 8 km</Text>
                            <Text style={styles.routeText} numberOfLines={2}>
                                {job.location || 'Drop location'}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.divider} />

                {/* Your SAME swipe button */}
                <SwipeButton onToggle={onAccept} t={t} isDark={isDark} />

            </View>

        </View>
    );
}

const styles = StyleSheet.create({
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 100000, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 40 },
    sheet: {
        width: '100%',
        backgroundColor: '#fff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 20,
        paddingTop: 32,
        zIndex: 100001,
        bottom: 30,
    },

    countdownCircle: {
        position: 'absolute',
        top: -30,
        alignSelf: 'center',
        backgroundColor: '#fff',
        borderRadius: 30,
        paddingHorizontal: 16,
        paddingVertical: 8,
        elevation: 6,
    },

    vehicleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },

    vehicleIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#eff6ff',
        justifyContent: 'center',
        alignItems: 'center',
    },

    vehicleTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#0f172a',
    },

    vehicleSub: {
        fontSize: 13,
        color: '#64748b',
    },

    divider: {
        height: 1,
        backgroundColor: '#e5e7eb',
        marginVertical: 16,
    },

    routeBlock: {
        gap: 12,
    },

    routeRow: {
        flexDirection: 'row',
        gap: 12,
    },

    pickupDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#22c55e',
        marginTop: 6,
    },

    dropDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#ef4444',
        marginTop: 6,
    },

    routeLine: {
        width: 2,
        height: 24,
        backgroundColor: '#e5e7eb',
        marginLeft: 4,
    },

    routeLabel: {
        fontSize: 12,
        color: '#64748b',
    },

    routeText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0f172a',
    },

    swipeContainer: {
        width: BUTTON_WIDTH,
        height: BUTTON_HEIGHT,
        borderRadius: BUTTON_HEIGHT / 2,
        justifyContent: 'center',
        padding: BUTTON_PADDING,
        overflow: 'hidden',

        // Modern card look
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e5e7eb',
        elevation: 2,
    },

    colorOverlay: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,

        // Accept green
        backgroundColor: '#22c55e',
        borderRadius: BUTTON_HEIGHT / 2,
    },

    swipeText: {
        position: 'absolute',
        alignSelf: 'center',
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: 0.3,
        color: '#64748b',
    },

    swipeable: {
        width: SWIPEABLE_DIMENSIONS,
        height: SWIPEABLE_DIMENSIONS,
        borderRadius: SWIPEABLE_DIMENSIONS / 2,

        backgroundColor: '#ffffff',

        justifyContent: 'center',
        alignItems: 'center',

        // Floating knob
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
    },


});