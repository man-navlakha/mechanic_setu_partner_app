import { Bike, Car, Check, ChevronsRight, Clock, MapPin, Truck, Wrench, X } from 'lucide-react-native';
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
const getVehicleIcon = (type) => {
    const t = type?.toLowerCase();
    if (t?.includes('bike') || t?.includes('motorcycle')) return <Bike size={24} color="#2563eb" />;
    if (t?.includes('truck')) return <Truck size={24} color="#2563eb" />;
    return <Car size={24} color="#2563eb" />;
};

// --- Modern Swipe Button Component ---
const SwipeButton = ({ onToggle, t }) => {
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

    return (
        <View style={styles.swipeContainer}>
            <Animated.View style={[styles.colorOverlay, animatedOverlayStyle]} />
            <Animated.Text style={[styles.swipeText, animatedTextStyle]}>
                {isSuccess ? t('jobPopup.accepted') : t('jobPopup.swipeToAccept')}
            </Animated.Text>
            <GestureDetector gesture={panGesture}>
                <Animated.View style={[styles.swipeable, animatedKnobStyle]}>
                    {isSuccess ? <Check size={24} color="green" /> : <ChevronsRight size={24} color="#2563eb" />}
                </Animated.View>
            </GestureDetector>
        </View>
    );
};

// --- Countdown Timer ---
const CountdownTimer = ({ seconds, onExpire, t }) => {
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
        <Text style={styles.timerText}>
            {t('jobPopup.autoReject')} <Text style={{ color: '#d97706', fontWeight: 'bold' }}>{timeLeft}s</Text>
        </Text>
    );
};

// --- Main Component ---
export default function JobNotificationPopup({ job, onAccept, onReject }) {
    const { t } = useTranslation();
    if (!job) return null;

    return (
        <View style={styles.overlay}>
            <TouchableOpacity onPress={onReject} style={styles.rejectBtn}>
                <X size={20} color="white" />
                <Text style={styles.rejectText}>{t('jobPopup.reject')}</Text>
            </TouchableOpacity>

            <View style={styles.card}>
                <View style={styles.header}>
                    <View style={styles.headerContent}>
                        <View style={styles.iconBox}><Wrench size={24} color="white" /></View>
                        <View>
                            <Text style={styles.headerTitle}>{t('jobPopup.newRequest')}</Text>
                            <View style={styles.headerSubtitleRow}>
                                <Clock size={12} color="#bfdbfe" />
                                <Text style={styles.headerSubtitle}> {t('jobPopup.justNow')}</Text>
                            </View>
                        </View>
                    </View>
                    <View style={styles.pulsingDot} />
                </View>

                <View style={styles.body}>
                    <View style={[styles.infoRow, { backgroundColor: '#eff6ff', borderColor: '#dbeafe' }]}>
                        <View style={[styles.infoIconBox, { backgroundColor: '#dbeafe' }]}>{getVehicleIcon(job.vehical_type)}</View>
                        <View>
                            <Text style={styles.infoLabel}>{t('jobPopup.vehicleType')}</Text>
                            <Text style={styles.infoValue}>{job.vehical_type || t('jobPopup.unknown')}</Text>
                        </View>
                    </View>

                    <View style={[styles.infoRow, { backgroundColor: '#fffbeb', borderColor: '#fef3c7' }]}>
                        <View style={[styles.infoIconBox, { backgroundColor: '#fef3c7' }]}><Wrench size={20} color="#d97706" /></View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.infoLabel}>{t('jobPopup.problem')}</Text>
                            <Text style={styles.infoValue} numberOfLines={2}>{job.problem || t('jobPopup.noDescription')}</Text>
                        </View>
                    </View>

                    <View style={[styles.infoRow, { backgroundColor: '#f0fdf4', borderColor: '#dcfce7' }]}>
                        <View style={[styles.infoIconBox, { backgroundColor: '#dcfce7' }]}><MapPin size={20} color="#16a34a" /></View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.infoLabel}>{t('jobPopup.location')}</Text>
                            <Text style={styles.infoValue} numberOfLines={1}>{job.location || t('jobPopup.locationShared')}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.footer}>
                    <SwipeButton onToggle={onAccept} t={t} />
                    <View style={styles.timerContainer}>
                        <CountdownTimer seconds={30} onExpire={onReject} t={t} />
                    </View>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 2000, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 40 },
    rejectBtn: { position: 'absolute', top: 60, right: 20, backgroundColor: '#4b5563', flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 30, zIndex: 2001 },
    rejectText: { color: 'white', fontWeight: 'bold', marginLeft: 8 },
    card: { width: width - 32, backgroundColor: 'white', borderRadius: 24, overflow: 'hidden', elevation: 10 },
    header: { backgroundColor: '#2563eb', padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerContent: { flexDirection: 'row', alignItems: 'center' },
    iconBox: { backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 12, marginRight: 12 },
    headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    headerSubtitleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
    headerSubtitle: { color: '#bfdbfe', fontSize: 12 },
    pulsingDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#4ade80', borderWidth: 2, borderColor: '#2563eb' },
    body: { padding: 20, gap: 12 },
    infoRow: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1 },
    infoIconBox: { padding: 8, borderRadius: 8, marginRight: 12 },
    infoLabel: { fontSize: 12, color: '#64748b', fontWeight: '600' },
    infoValue: { fontSize: 15, color: '#1e293b', fontWeight: 'bold' },
    footer: { padding: 20, paddingTop: 0, alignItems: 'center' },
    swipeContainer: { width: BUTTON_WIDTH, height: BUTTON_HEIGHT, backgroundColor: '#f1f5f9', borderRadius: BUTTON_HEIGHT / 2, justifyContent: 'center', padding: BUTTON_PADDING, borderWidth: 1, borderColor: '#e2e8f0' },
    swipeable: { width: SWIPEABLE_DIMENSIONS, height: SWIPEABLE_DIMENSIONS, borderRadius: SWIPEABLE_DIMENSIONS / 2, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', zIndex: 3, elevation: 2 },
    swipeText: { position: 'absolute', alignSelf: 'center', fontSize: 16, fontWeight: 'bold', color: '#64748b', zIndex: 2 },
    colorOverlay: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: '#22c55e', borderRadius: BUTTON_HEIGHT / 2, zIndex: 1 },
    timerContainer: { marginTop: 16, backgroundColor: '#f8fafc', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0' },
    timerText: { fontSize: 12, color: '#64748b' },
});