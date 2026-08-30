import React from 'react';
import { KeyboardAvoidingView, ScrollView, ScrollViewProps } from 'react-native';
import { SafeAreaView, SafeAreaViewProps } from 'react-native-safe-area-context';

interface KeyboardAvoidingScreenProps {
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
  edges?: SafeAreaViewProps['edges'];
}

// Standard wrapper for any screen with form inputs: SafeAreaView (for notch/status bar
// insets) + KeyboardAvoidingView (behavior="padding" works reliably under Expo's
// mandatory edge-to-edge Android rendering, unlike "height") + a ScrollView that keeps
// taps on buttons working while the keyboard is open. Use this instead of hand-rolling
// the three every time a screen grows a TextInput.
export function KeyboardAvoidingScreen({
  children,
  footer,
  className = 'flex-1 bg-slate-950 px-4',
  contentContainerStyle,
  edges,
}: KeyboardAvoidingScreenProps) {
  return (
    <SafeAreaView className={className} edges={edges}>
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={contentContainerStyle}
        >
          {children}
        </ScrollView>
        {footer}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
