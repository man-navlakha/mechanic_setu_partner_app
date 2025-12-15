import { X } from 'lucide-react-native';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';

interface LanguageModalProps {
    visible: boolean;
    onClose: () => void;
}

export default function LanguageModal({ visible, onClose }: LanguageModalProps) {
    const { i18n, t } = useTranslation();

    const changeLanguage = (lang: string) => {
        i18n.changeLanguage(lang);
        onClose();
    };

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <Pressable
                className="flex-1 bg-black/50 justify-center items-center p-4"
                onPress={onClose}
            >
                <Pressable
                    className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl"
                    onPress={e => e.stopPropagation()}
                >
                    <View className="flex-row justify-between items-center mb-6">
                        <Text className="text-xl font-bold text-slate-800">{t('language.select') || 'Select Language'}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <X size={24} color="#64748b" />
                        </TouchableOpacity>
                    </View>

                    <View className="space-y-3">
                        <TouchableOpacity
                            onPress={() => changeLanguage('en')}
                            className={`p-4 rounded-xl border flex-row items-center justify-between ${i18n.language === 'en' ? 'bg-blue-50 border-blue-500' : 'bg-slate-50 border-slate-200'
                                }`}
                        >
                            <View className="flex-row items-center">
                                <Text className="text-2xl mr-3">🇺🇸</Text>
                                <View>
                                    <Text className={`font-bold ${i18n.language === 'en' ? 'text-blue-700' : 'text-slate-700'}`}>English</Text>
                                    <Text className="text-slate-500 text-xs text-left">Default</Text>
                                </View>
                            </View>
                            {i18n.language === 'en' && <View className="w-3 h-3 bg-blue-500 rounded-full" />}
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={() => changeLanguage('hi')}
                            className={`p-4 rounded-xl border flex-row items-center justify-between ${i18n.language === 'hi' ? 'bg-blue-50 border-blue-500' : 'bg-slate-50 border-slate-200'
                                }`}
                        >
                            <View className="flex-row items-center">
                                <Text className="text-2xl mr-3">🇮🇳</Text>
                                <View>
                                    <Text className={`font-bold ${i18n.language === 'hi' ? 'text-blue-700' : 'text-slate-700'}`}>हिंदी</Text>
                                    <Text className="text-slate-500 text-xs text-left">Hindi</Text>
                                </View>
                            </View>
                            {i18n.language === 'hi' && <View className="w-3 h-3 bg-blue-500 rounded-full" />}
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => changeLanguage('eh')}
                            className={`p-4 rounded-xl border flex-row items-center justify-between ${i18n.language === 'eh' ? 'bg-blue-50 border-blue-500' : 'bg-slate-50 border-slate-200'
                                }`}
                        >
                            <View className="flex-row items-center">
                                <Text className="text-2xl mr-3">🇮🇳</Text>
                                <View>
                                    <Text className={`font-bold ${i18n.language === 'eh' ? 'text-blue-700' : 'text-slate-700'}`}>Whatsappp Language </Text>
                                    <Text className="text-slate-500 text-xs text-left">(English to Hindi) </Text>
                                </View>
                            </View>
                            {i18n.language === 'eh' && <View className="w-3 h-3 bg-blue-500 rounded-full" />}
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => changeLanguage('he')}
                            className={`p-4 rounded-xl border flex-row items-center justify-between ${i18n.language === 'he' ? 'bg-blue-50 border-blue-500' : 'bg-slate-50 border-slate-200'
                                }`}
                        >
                            <View className="flex-row items-center">
                                <Text className="text-2xl mr-3">🇮🇳</Text>
                                <View>
                                    <Text className={`font-bold ${i18n.language === 'he' ? 'text-blue-700' : 'text-slate-700'}`}>Whatsappp Language </Text>
                                    <Text className="text-slate-500 text-xs text-left">(Hindi to English) </Text>
                                </View>
                            </View>
                            {i18n.language === 'he' && <View className="w-3 h-3 bg-blue-500 rounded-full" />}
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => changeLanguage('gu')}
                            className={`p-4 rounded-xl border flex-row items-center justify-between ${i18n.language === 'gu' ? 'bg-blue-50 border-blue-500' : 'bg-slate-50 border-slate-200'
                                }`}
                        >
                            <View className="flex-row items-center">
                                <Text className="text-2xl mr-3">🇮🇳</Text>
                                <View>
                                    <Text className={`font-bold ${i18n.language === 'gu' ? 'text-blue-700' : 'text-slate-700'}`}>Gujarati</Text>
                                    <Text className="text-slate-500 text-xs text-left">Gujarati </Text>
                                </View>
                            </View>
                            {i18n.language === 'gu' && <View className="w-3 h-3 bg-blue-500 rounded-full" />}
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => changeLanguage('gue')}
                            className={`p-4 rounded-xl border flex-row items-center justify-between ${i18n.language === 'gue' ? 'bg-blue-50 border-blue-500' : 'bg-slate-50 border-slate-200'
                                }`}
                        >
                            <View className="flex-row items-center">
                                <Text className="text-2xl mr-3">🇮🇳</Text>
                                <View>
                                    <Text className={`font-bold ${i18n.language === 'gue' ? 'text-blue-700' : 'text-slate-700'}`}>Whatsappp Language</Text>
                                    <Text className="text-slate-500 text-xs text-left">(Gujarati to English) </Text>
                                </View>
                            </View>
                            {i18n.language === 'gue' && <View className="w-3 h-3 bg-blue-500 rounded-full" />}
                        </TouchableOpacity>
                    </View>
                </Pressable>
            </Pressable>
        </Modal>
    );
}
