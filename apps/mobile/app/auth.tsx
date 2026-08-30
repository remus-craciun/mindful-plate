import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ShieldCheck, LogIn, UserPlus, Sparkles, Mail, Lock, Eye, EyeOff } from 'lucide-react-native';
import { api } from '../src/services/api';
import { useStore } from '../src/store/useStore';

export default function AuthScreen() {
  const router = useRouter();
  const { setAuth } = useStore();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [hasAccount, setHasAccount] = useState<boolean | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Check whether an account exists in the database
  useEffect(() => {
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const res = await api.checkAuthStatus();
      setHasAccount(res.hasAccount);
      if (res.email) {
        setRegisteredEmail(res.email);
        setEmail(res.email);
      }
    } catch (err: any) {
      // If server is unreachable or offline, default to showing login or register with retry option
      setHasAccount(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Please enter both email and password.');
      return;
    }

    if (!hasAccount && password !== confirmPassword) {
      Alert.alert('Passwords do not match', 'Please make sure your passwords match.');
      return;
    }

    if (!hasAccount && password.length < 6) {
      Alert.alert('Password too short', 'Password must be at least 6 characters long.');
      return;
    }

    setSubmitting(true);
    try {
      if (hasAccount) {
        // Log in to the existing account
        const res = await api.login(email.trim(), password);
        await setAuth(res.token, res.user);
        router.replace('/(tabs)');
      } else {
        // Register the single initial account
        const res = await api.register(email.trim(), password);
        await setAuth(res.token, res.user);
        Alert.alert('Welcome to Mindful Plate!', 'Your account has been created. Let us configure your nutrition targets next!');
        router.replace('/(tabs)');
      }
    } catch (err: any) {
      Alert.alert('Authentication failed', err.message || 'Please check your credentials and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950 items-center justify-center">
        <ActivityIndicator size="large" color="#10b981" />
        <Text className="text-slate-400 text-sm mt-3">Connecting to Mindful Plate...</Text>
      </SafeAreaView>
    );
  }

  const isRegistration = !hasAccount;

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <KeyboardAvoidingView
        behavior="padding"
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          className="px-6"
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo / Brand Header */}
          <View className="items-center mb-8">
            <View className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/30 items-center justify-center mb-4 shadow-lg">
              <ShieldCheck size={32} color="#10b981" />
            </View>
            <Text className="text-white text-3xl font-black tracking-tight">Mindful Plate</Text>
            <Text className="text-slate-400 text-xs mt-1 uppercase tracking-widest font-semibold">
              {isRegistration ? 'Initial Account Setup' : 'Secure Sign In'}
            </Text>
          </View>

          {/* Form Card */}
          <View className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <Text className="text-white text-lg font-bold mb-1">
              {isRegistration ? 'Create Your Account' : 'Welcome Back'}
            </Text>
            <Text className="text-slate-400 text-xs mb-6">
              {isRegistration
                ? 'No account was found in the database. As this is a self-hosted single-account setup, create your credentials now.'
                : 'Sign in to access your nutrition diary and macro progress.'}
            </Text>

            {/* Email Field */}
            <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Email</Text>
            <View className="flex-row items-center bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-3 mb-4">
              <Mail size={18} color="#64748b" />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#64748b"
                autoCapitalize="none"
                keyboardType="email-address"
                className="flex-1 text-white ml-3 text-sm"
              />
            </View>

            {/* Password Field */}
            <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Password</Text>
            <View className="flex-row items-center bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-3 mb-4">
              <Lock size={18} color="#64748b" />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••"
                placeholderTextColor="#64748b"
                secureTextEntry={!showPassword}
                className="flex-1 text-white ml-3 text-sm"
              />
              <TouchableOpacity
                onPress={() => setShowPassword((prev) => !prev)}
                hitSlop={8}
              >
                {showPassword ? (
                  <EyeOff size={18} color="#64748b" />
                ) : (
                  <Eye size={18} color="#64748b" />
                )}
              </TouchableOpacity>
            </View>

            {/* Confirm Password (Registration only) */}
            {isRegistration && (
              <>
                <Text className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Confirm Password</Text>
                <View className="flex-row items-center bg-slate-950/80 border border-slate-800 rounded-2xl px-4 py-3 mb-6">
                  <Lock size={18} color="#64748b" />
                  <TextInput
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="••••••••"
                    placeholderTextColor="#64748b"
                    secureTextEntry={!showConfirmPassword}
                    className="flex-1 text-white ml-3 text-sm"
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword((prev) => !prev)}
                    hitSlop={8}
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} color="#64748b" />
                    ) : (
                      <Eye size={18} color="#64748b" />
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}

            {/* Action Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              className="bg-emerald-500 active:bg-emerald-600 rounded-2xl py-4 items-center flex-row justify-center shadow-lg mt-2"
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : isRegistration ? (
                <>
                  <UserPlus size={18} color="#ffffff" />
                  <Text className="text-white font-bold text-base ml-2">Create Account</Text>
                </>
              ) : (
                <>
                  <LogIn size={18} color="#ffffff" />
                  <Text className="text-white font-bold text-base ml-2">Sign In</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
