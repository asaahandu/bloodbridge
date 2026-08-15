import Ionicons from '@expo/vector-icons/Ionicons';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { AuthScreen } from '@/components/auth/AuthScreen';
import { AuthTextField } from '@/components/auth/AuthTextField';
import { authColors } from '@/components/auth/theme';

type LoginErrors = Partial<Record<'email' | 'password', string>>;

export default function LoginScreen() {
  const router = useRouter();
  const { created } = useLocalSearchParams<{ created?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState<LoginErrors>({});

  const submit = () => {
    const nextErrors: LoginErrors = {};
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) nextErrors.email = 'Enter a valid email address.';
    if (!password) nextErrors.password = 'Enter your password.';
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length === 0) {
      router.replace('/home');
    }
  };

  return (
    <>
      <StatusBar style="dark" />
      <AuthScreen
        eyebrow="Donor access"
        footer={
          <Text className="text-sm text-muted">
            New to BloodBridge?{' '}
            <Link className="font-extrabold text-blood-red" href="/sign-up">
              Create an account
            </Link>
          </Text>
        }
        subtitle="Sign in to manage your availability and respond to nearby requests."
        title="Welcome back">
        <View className="gap-[19px]">
          {created === '1' ? (
            <View className="flex-row items-center gap-[9px] rounded-xl bg-success-soft p-3">
              <Ionicons color={authColors.success} name="checkmark-circle" size={19} />
              <Text className="flex-1 text-[13px] font-bold leading-[18px] text-success">
                Account details saved. You can now sign in.
              </Text>
            </View>
          ) : null}

          <AuthTextField
            autoCapitalize="none"
            autoComplete="email"
            error={errors.email}
            icon="mail-outline"
            keyboardType="email-address"
            label="Email address"
            onChangeText={(value) => {
              setEmail(value);
              if (errors.email) setErrors((current) => ({ ...current, email: undefined }));
            }}
            placeholder="you@example.com"
            returnKeyType="next"
            value={email}
          />
          <AuthTextField
            autoCapitalize="none"
            autoComplete="current-password"
            error={errors.password}
            icon="lock-closed-outline"
            label="Password"
            onChangeText={(value) => {
              setPassword(value);
              if (errors.password) setErrors((current) => ({ ...current, password: undefined }));
            }}
            onSubmitEditing={submit}
            password
            placeholder="Enter your password"
            returnKeyType="done"
            value={password}
          />

          <View className="flex-row items-center justify-between">
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: rememberMe }}
              className="flex-row items-center gap-2 active:opacity-75"
              onPress={() => setRememberMe((selected) => !selected)}
              >
              <View
                className={`h-5 w-5 items-center justify-center rounded-[5px] border-[1.5px] ${
                  rememberMe ? 'border-blood-red bg-blood-red' : 'border-[#C9C6C0]'
                }`}>
                {rememberMe ? <Ionicons color={authColors.white} name="checkmark" size={14} /> : null}
              </View>
              <Text className="text-[13px] font-semibold text-muted">Remember me</Text>
            </Pressable>
            <Pressable
              className="active:opacity-75"
              onPress={() =>
                Alert.alert(
                  'Password recovery',
                  'Password recovery will be connected when backend authentication is added.',
                )
              }>
              <Text className="text-[13px] font-bold text-blood-red">Forgot password?</Text>
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            className="h-14 flex-row items-center justify-center gap-[9px] rounded-[15px] bg-ink shadow-lg active:opacity-75"
            onPress={submit}>
            <Text className="text-[15px] font-extrabold text-white">Sign in</Text>
            <Ionicons color={authColors.white} name="arrow-forward" size={19} />
          </Pressable>

          <View className="flex-row items-center justify-center gap-[7px]">
            <Ionicons color={authColors.muted} name="shield-checkmark-outline" size={17} />
            <Text className="text-xs text-muted">
              Your donor information stays private and secure.
            </Text>
          </View>
        </View>
      </AuthScreen>
    </>
  );
}
