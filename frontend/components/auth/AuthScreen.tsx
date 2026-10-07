import Ionicons from '@expo/vector-icons/Ionicons';
import type { PropsWithChildren, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { authColors } from './theme';

type AuthScreenProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  subtitle: string;
  footer: ReactNode;
}>;

export function AuthScreen({ children, eyebrow, footer, subtitle, title }: AuthScreenProps) {
  const { width } = useWindowDimensions();
  const isWide = width >= 920;

  return (
    <SafeAreaView
      className="flex-1 bg-canvas"
      style={{ backgroundColor: authColors.background, flex: 1 }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
        style={{ flex: 1 }}>
        <ScrollView
          contentContainerClassName={
            isWide
              ? 'min-h-full flex-grow flex-row'
              : `min-h-full flex-grow items-center px-5 pb-5 ${Platform.OS === 'android' ? 'pt-[30px]' : 'pt-[18px]'}`
          }
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {isWide ? (
            <View className="min-h-[700px] flex-1 justify-between overflow-hidden bg-ink p-14">
              <View className="absolute -right-60 -top-44 h-[440px] w-[440px] rounded-full bg-[#A72A35] opacity-30" />
              <Brand />
              <View className="max-w-[460px] gap-5">
                <View className="h-[52px] w-[52px] items-center justify-center rounded-[15px] border border-white/15 bg-white/10">
                  <Ionicons color={authColors.white} name="pulse" size={24} />
                </View>
                <Text className="text-[44px] font-extrabold leading-[50px] tracking-[-1.5px] text-white">
                  One account.{`\n`}A bridge to more lives.
                </Text>
                <Text className="max-w-[440px] text-[17px] leading-7 text-[#C9C6C1]">
                  Stay ready for nearby blood requests, manage your availability, and see the
                  difference every donation makes.
                </Text>
              </View>
              <View className="flex-row items-center gap-[9px]">
                <Ionicons color="#D7A8AC" name="shield-checkmark" size={18} />
                <Text className="text-[13px] font-semibold text-[#A9A5A0]">
                  Private donor information, handled with care
                </Text>
              </View>
            </View>
          ) : null}

          <View
            className={
              isWide
                ? 'w-full max-w-[520px] justify-center px-14 py-14'
                : 'w-full max-w-[520px]'
            }>
            {!isWide ? <Brand /> : null}
            <View className="gap-2 pb-6 pt-11">
              <Text className="text-xs font-extrabold uppercase tracking-[1.5px] text-blood-red">
                {eyebrow}
              </Text>
              <Text className="text-[34px] font-extrabold leading-10 tracking-[-1.1px] text-ink">
                {title}
              </Text>
              <Text className="max-w-[440px] text-[15px] leading-[23px] text-muted">
                {subtitle}
              </Text>
            </View>

            <View className="rounded-3xl border border-line bg-card p-[22px] shadow-lg">
              {children}
            </View>
            <View className="items-center py-5">{footer}</View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Brand() {
  return (
    <View className="flex-row items-center gap-[11px]">
      <View className="h-[42px] w-[42px] items-center justify-center rounded-xl bg-blood-red shadow-md">
        <Ionicons color={authColors.white} name="heart" size={20} />
      </View>
      <Text className="text-xl font-extrabold tracking-[-0.5px] text-ink">BloodBridge</Text>
    </View>
  );
}
