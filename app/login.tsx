import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowRight, Globe, Mail } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LanguageModal from '../components/LanguageModal';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import safeStorage from '../utils/storage';

let GoogleSignin: any = null;
let GoogleSigninButton: any = null;
let statusCodes: any = null;

try {
  const googleModule = require('@react-native-google-signin/google-signin');
  GoogleSignin = googleModule.GoogleSignin;
  GoogleSigninButton = googleModule.GoogleSigninButton;
  statusCodes = googleModule.statusCodes;
} catch (e) {}

const GOOGLE_WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
  '628591285290-agf9c8nrjbcfa9onq3tr7d6dubjjo0g9.apps.googleusercontent.com';

const GOOGLE_IOS_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ||
  '628591285290-g5sv4vic3pjqbg174go04dc2cultrpcl.apps.googleusercontent.com';

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { user, error: authError, login } = useAuth() as any;

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const revealAnim = useRef(new Animated.Value(0)).current;
  const isGoogleNativeAvailable = Boolean(
    GoogleSignin && GoogleSigninButton && statusCodes
  );

  useEffect(() => {
    if (authError) setError(authError);
  }, [authError]);

  useEffect(() => {
    Animated.timing(revealAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true
    }).start();
  }, []);

  useEffect(() => {
    if (!isGoogleNativeAvailable) return;

    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      iosClientId: GOOGLE_IOS_CLIENT_ID,
      scopes: ['profile', 'email']
    });
  }, [isGoogleNativeAvailable]);

  if (user) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#0f172a'
        }}
      >
        <StatusBar barStyle="light-content" />
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  const handleEmailLogin = async () => {
    setError('');

    if (!email) {
      setError(t('error.emptyEmail'));
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError(t('error.invalidEmail'));
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/users/Login_SignUp/', { email });

      const data = res?.data || {};
      const access =
        data.access || data.access_token || data?.tokens?.access;
      const refresh =
        data.refresh || data.refresh_token || data?.tokens?.refresh;

      if (access) await safeStorage.setItem('access', access);
      if (refresh) await safeStorage.setItem('refresh', refresh);

      router.push({
        pathname: '/verify',
        params: {
          key: res.data.key,
          id: res.data.id,
          email
        }
      });
    } catch (err: any) {
      const message =
        err?.res?.data?.error || t('error.connection');
      setError(message);
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      setError('');

      if (!isGoogleNativeAvailable) {
        Alert.alert(
          'Google Login Unavailable',
          'Requires custom dev build.'
        );
        return;
      }

      await GoogleSignin.hasPlayServices();
      await GoogleSignin.signOut().catch(() => {});

      const signInResponse = await GoogleSignin.signIn();
      const idToken = signInResponse?.idToken;

      if (!idToken) throw new Error('No ID token.');

      const res = await api.post('/users/google/', {
        id_token: idToken
      });

      const data = res?.data || {};
      const access =
        data.access || data.access_token || data?.tokens?.access;
      const refresh =
        data.refresh || data.refresh_token || data?.tokens?.refresh;

      if (access) await safeStorage.setItem('access', access);
      if (refresh) await safeStorage.setItem('refresh', refresh);

      await login(data.user || data, null);
      router.replace('/(tabs)');
    } catch (err: any) {
      const message =
        err?.response?.data?.detail ||
        err?.message ||
        'Google login failed.';
      setError(message);
      Alert.alert('Google Login Failed', message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <LinearGradient
      colors={['#0f172a', '#1e293b', '#0f172a']}
      style={{ flex: 1 }}
    >
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" />

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1, paddingHorizontal: 24 }}
        >
          {/* Language Button */}
          <View style={{ position: 'absolute', top: 16, right: 0 }}>
            <TouchableOpacity
              onPress={() => setShowLanguageModal(true)}
              style={{
                backgroundColor: '#111827',
                padding: 10,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: '#334155'
              }}
            >
              <Globe size={20} color="#f8fafc" />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: 'center'
            }}
          >
            <Animated.View
              style={{
                opacity: revealAnim,
                transform: [
                  {
                    translateY: revealAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [20, 0]
                    })
                  }
                ]
              }}
            >
              {/* Brand */}
              <View style={{ alignItems: 'center', marginBottom: 30 }}>
                <View
                  style={{
                    backgroundColor: '#111827',
                    padding: 16,
                    borderRadius: 20,
                    borderWidth: 1,
                    borderColor: '#334155'
                  }}
                >
                  <Image
                    source={require('../assets/logo.png')}
                    style={{ width: 80, height: 80 }}
                  />
                </View>

                <Text
                  style={{
                    marginTop: 18,
                    fontSize: 28,
                    fontWeight: '900',
                    color: '#f8fafc',
                    letterSpacing: 1
                  }}
                >
                  SETU PARTNER
                </Text>

                <Text
                  style={{
                    marginTop: 6,
                    color: '#94a3b8',
                    textAlign: 'center'
                  }}
                >
                  {t('slogan')}
                </Text>
              </View>

              {/* Card */}
              <View
                style={{
                  backgroundColor: '#1e293b',
                  padding: 24,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: '#334155'
                }}
              >
                {error ? (
                  <View
                    style={{
                      backgroundColor: '#7f1d1d',
                      padding: 12,
                      borderRadius: 10,
                      marginBottom: 16
                    }}
                  >
                    <Text style={{ color: '#fecaca' }}>
                      {error}
                    </Text>
                  </View>
                ) : null}

                {/* Email Input */}
                <View style={{ marginBottom: 20 }}>
                  <Text
                    style={{
                      color: '#f8fafc',
                      marginBottom: 8,
                      fontWeight: '600'
                    }}
                  >
                    {t('enterEmail')}
                  </Text>

                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#0f172a',
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: isFocused
                        ? '#f97316'
                        : '#334155'
                    }}
                  >
                    <View
                      style={{
                        padding: 14,
                        borderRightWidth: 1,
                        borderRightColor: '#334155'
                      }}
                    >
                      <Mail
                        size={18}
                        color={
                          isFocused ? '#f97316' : '#94a3b8'
                        }
                      />
                    </View>

                    <TextInput
                      style={{
                        flex: 1,
                        paddingHorizontal: 16,
                        paddingVertical: 14,
                        color: '#f8fafc'
                      }}
                      placeholder={t('emailPlaceholder')}
                      placeholderTextColor="#64748b"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                    />
                  </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  onPress={handleEmailLogin}
                  disabled={loading || googleLoading}
                  style={{
                    backgroundColor: email
                      ? '#f97316'
                      : '#475569',
                    paddingVertical: 16,
                    borderRadius: 12,
                    alignItems: 'center',
                    flexDirection: 'row',
                    justifyContent: 'center'
                  }}
                >
                  {loading ? (
                    <ActivityIndicator color="#0f172a" />
                  ) : (
                    <>
                      <Text
                        style={{
                          color: '#0f172a',
                          fontWeight: '800',
                          fontSize: 16,
                          marginRight: 8
                        }}
                      >
                        {t('continue')}
                      </Text>
                      <ArrowRight
                        size={18}
                        color="#0f172a"
                      />
                    </>
                  )}
                </TouchableOpacity>

                {/* Divider */}
                <View
                  style={{
                    marginVertical: 20,
                    flexDirection: 'row',
                    alignItems: 'center'
                  }}
                >
                  <View
                    style={{
                      flex: 1,
                      height: 1,
                      backgroundColor: '#334155'
                    }}
                  />
                  <Text
                    style={{
                      marginHorizontal: 10,
                      color: '#64748b'
                    }}
                  >
                    OR
                  </Text>
                  <View
                    style={{
                      flex: 1,
                      height: 1,
                      backgroundColor: '#334155'
                    }}
                  />
                </View>

                {/* Google Button */}
                <TouchableOpacity
                  onPress={handleGoogleLogin}
                  disabled={loading || googleLoading}
                  style={{
                    height: 50,
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: '#334155',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: '#111827'
                  }}
                >
                  <Text
                    style={{
                      color: '#f8fafc',
                      fontWeight: '600'
                    }}
                  >
                    Continue with Google
                  </Text>
                </TouchableOpacity>
              </View>
            </Animated.View>

            <Text
              style={{
                textAlign: 'center',
                color: '#64748b',
                marginTop: 30
              }}
            >
              {t('copyright')}
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <LanguageModal
        visible={showLanguageModal}
        onClose={() => setShowLanguageModal(false)}
      />
    </LinearGradient>
  );
}