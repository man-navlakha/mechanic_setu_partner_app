import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { ArrowRight, Globe, Mail } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LanguageModal from '../components/LanguageModal';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function LoginScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { user, error: authError } = useAuth() as any;
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  useEffect(() => {
    if (user) {
      router.replace('/dashboard');
    }
  }, [user]);

  // Sync auth error to local state
  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  if (user) {
    return (
      <View className="flex-1 justify-center items-center bg-slate-100">
        <ActivityIndicator size="large" color="#0f172a" />
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
      // Calling your existing backend endpoint
      const res = await api.post('/users/Login_SignUp/', { email: email });

      console.log("Login Response:", res.data);
      console.log("Login Response Headers:", res.headers); // Debugging
      let cookie: any = res.headers['set-cookie'];

      // If it's an array (common in React Native), join it into a string
      if (Array.isArray(cookie)) {
        cookie = cookie.join('; ');
      }
      // Navigate to Verify screen (You need to create this later)
      router.push({
        pathname: "/verify",
        params: {
          key: res.data.key,
          id: res.data.id,
          email: email,
          cookie: cookie || '' // <--- Pass the cookie here
        }
      });

    } catch (err: any) {
      console.error("Login failed:", err);
      const errorMessage = err?.res?.data?.error || t('error.connection');
      setError(errorMessage);
      Alert.alert("Error", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient
      // Background Gradient similar to your web version
      colors={['#f8fafc', '#e2e8f0', '#cbd5e1']}
      className="flex-1"
    >
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          className="flex-1 justify-center px-6"
        >
          {/* Language Switcher Button (Top Right) */}
          <View className="absolute top-4 right-0 z-50">
            <TouchableOpacity
              onPress={() => setShowLanguageModal(true)}
              className="bg-white/80 p-2 rounded-full shadow-sm border border-slate-200"
            >
              <Globe size={24} color="#475569" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>

            {/* Main Card Container */}
            <View className="bg-white/90 p-6 rounded-3xl shadow-xl backdrop-blur-md border border-white/20">

              {/* Header / Logo Section */}
              <View className="items-center mb-8">
                <View className="bg-blue-100 p-1 rounded-full mb-4">
                  <Image
                    source={require('../assets/logo.png')} // Replace with your ms.png
                    className="w-[100px] h-[100px] p-4 "
                    resizeMode="contain"
                  />
                </View>
                <Text className="text-3xl font-bold text-slate-800 text-center">
                  Setu Partner
                </Text>
                <Text className="text-slate-500 italic mt-1">
                  {t('slogan')}
                </Text>

                <View className="bg-slate-100 px-3 py-1 rounded-full mt-4 border border-slate-200">
                  <Text className="text-xs font-semibold text-slate-700">
                    {t('welcomeBack')}
                  </Text>
                </View>
              </View>

              {/* Error Message Display */}
              {error ? (
                <View className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded-r">
                  <Text className="text-red-700 font-medium">{error}</Text>
                </View>
              ) : null}

              {/* Form Section */}
              <View className="space-y-4">

                {/* DEBUG TOOL: Remove in production */}
                <TouchableOpacity
                  onPress={async () => {
                    const cookie = await import('expo-secure-store').then(s => s.getItemAsync('session_cookie'));
                    console.log("=== DIAGNOSTICS ===");
                    console.log("SecureStore Cookie:", cookie);
                    const isApiHealthy = await api.get('').catch(e => e.message);
                    console.log("API Health Check:", isApiHealthy);
                    Alert.alert("Debug Info", `Cookie present: ${!!cookie}\nSee logs for details.`);
                  }}
                  className="self-center mb-2 bg-gray-200 px-3 py-1 rounded"
                >
                  <Text className="text-xs text-gray-600">Run Diagnostics</Text>
                </TouchableOpacity>

                <View>
                  <Text className="text-slate-700 font-semibold mb-2 ml-1">
                    {t('enterEmail')}
                  </Text>
                  <View className="relative flex-row items-center">
                    <View className="absolute left-4 z-10 ">
                      <Mail size={20} color="#64748b" />
                    </View>
                    <TextInput
                      className="w-full bg-slate-50 border  border-slate-300 rounded-xl py-4 pl-12 pr-4 text-slate-800 text-base focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      placeholder={t('emailPlaceholder')}
                      placeholderTextColor="#94a3b8"
                      value={email}
                      onChangeText={setEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      editable={!loading}
                    />
                  </View>
                  <Text className="text-xs text-slate-400 mt-2 ml-1">
                    {t('emailHint')}
                  </Text>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  onPress={handleEmailLogin}
                  disabled={loading}
                  className={`w-full py-4 rounded-xl flex-row justify-center items-center mt-4 ${loading || !email ? 'bg-slate-400' : 'bg-slate-900'}`}
                >
                  {loading ? (
                    <>
                      <ActivityIndicator color="white" className="mr-2" />
                      <Text className="text-white font-bold text-lg">{t('sending')}</Text>
                    </>
                  ) : (
                    <>
                      <Text className="text-white font-bold text-lg mr-2">{t('continue')}</Text>
                      <ArrowRight size={20} color="white" />
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {/* Footer Links */}
              <View className="mt-8 pt-6 border-t border-slate-200">
                <Text className="text-center text-slate-500 text-sm leading-5">
                  {t('agree')}{"\n"}
                  <Text className="text-blue-600 font-bold">{t('terms')}</Text> {t('and')} <Text className="text-blue-600 font-bold">{t('privacy')}</Text>
                </Text>
              </View>
            </View>

            {/* Copyright Footer */}
            <Text className="text-center text-slate-400 text-xs mt-8">
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