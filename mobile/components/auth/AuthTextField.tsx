import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import type { TextInputProps } from 'react-native';
import { Pressable, Text, TextInput, View } from 'react-native';

import { authColors } from './theme';

type IconName = keyof typeof Ionicons.glyphMap;

type AuthTextFieldProps = TextInputProps & {
  error?: string;
  icon: IconName;
  label: string;
  password?: boolean;
};

export function AuthTextField({
  error,
  icon,
  label,
  onBlur,
  onFocus,
  password = false,
  ...inputProps
}: AuthTextFieldProps) {
  const [focused, setFocused] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  return (
    <View className="gap-2">
      <Text className="text-[13px] font-bold text-ink">{label}</Text>
      <View
        className={`h-[54px] flex-row items-center gap-[11px] rounded-[14px] border px-[15px] ${
          error
            ? 'border-[#E7A5A0] bg-error-soft'
            : focused
              ? 'border-[1.5px] border-blood-red bg-white'
              : 'border-line bg-field'
        }`}>
        <Ionicons color={focused ? authColors.red : authColors.muted} name={icon} size={19} />
        <TextInput
          {...inputProps}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          placeholderTextColor="#A5A39E"
          secureTextEntry={password && !passwordVisible}
          selectionColor={authColors.red}
          className="flex-1 py-0 text-[15px] text-ink"
        />
        {password ? (
          <Pressable
            accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
            className="active:opacity-75"
            hitSlop={10}
            onPress={() => setPasswordVisible((visible) => !visible)}>
            <Ionicons
              color={authColors.muted}
              name={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text className="text-xs font-semibold text-error">{error}</Text> : null}
    </View>
  );
}
