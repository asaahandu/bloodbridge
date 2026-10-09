import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

type AccountContactEditorProps = {
  cityRegion: string;
  email: string;
  onSave: (profile: { cityRegion: string; email: string; phone: string }) => Promise<void>;
  phone: string;
};

export function AccountContactEditor({
  cityRegion: savedCityRegion,
  email: savedEmail,
  onSave,
  phone: savedPhone,
}: AccountContactEditorProps) {
  const [cityRegion, setCityRegion] = useState(savedCityRegion);
  const [email, setEmail] = useState(savedEmail);
  const [phone, setPhone] = useState(savedPhone);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const save = async () => {
    const profile = {
      cityRegion: cityRegion.trim(),
      email: email.trim(),
      phone: phone.trim(),
    };
    if (profile.cityRegion.length < 2 || profile.cityRegion.length > 120) {
      setError('City or region must contain between 2 and 120 characters.');
      setSaved(false);
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(profile.email)) {
      setError('Enter a valid email address.');
      setSaved(false);
      return;
    }
    if (profile.phone.replace(/\D/g, '').length < 8) {
      setError('Enter a valid phone number with at least 8 digits.');
      setSaved(false);
      return;
    }

    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await onSave(profile);
      setCityRegion(profile.cityRegion);
      setEmail(profile.email.toLowerCase());
      setPhone(profile.phone);
      setSaved(true);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save account details.');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'mt-2 rounded-xl border border-line bg-white px-3 py-3 text-sm font-semibold text-ink';

  return (
    <View className="rounded-[21px] border border-line bg-card px-4 py-4">
      <Text className="text-[10px] font-semibold text-muted">City or region</Text>
      <TextInput
        accessibilityLabel="City or region"
        autoCapitalize="words"
        className={inputClass}
        editable={!saving}
        maxLength={120}
        onChangeText={(value) => {
          setCityRegion(value);
          setSaved(false);
        }}
        placeholder="Enter your city or region"
        placeholderTextColor="#8B8B88"
        value={cityRegion}
      />

      <Text className="mt-4 text-[10px] font-semibold text-muted">Phone number</Text>
      <TextInput
        accessibilityLabel="Phone number"
        autoComplete="tel"
        className={inputClass}
        editable={!saving}
        keyboardType="phone-pad"
        onChangeText={(value) => {
          setPhone(value);
          setSaved(false);
        }}
        placeholder="+237..."
        placeholderTextColor="#8B8B88"
        value={phone}
      />

      <Text className="mt-4 text-[10px] font-semibold text-muted">Email address</Text>
      <TextInput
        accessibilityLabel="Email address"
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        className={inputClass}
        editable={!saving}
        keyboardType="email-address"
        onChangeText={(value) => {
          setEmail(value);
          setSaved(false);
        }}
        placeholder="name@example.com"
        placeholderTextColor="#8B8B88"
        value={email}
      />

      {error ? (
        <Text className="mt-3 text-[11px] font-semibold text-error" role="alert">
          {error}
        </Text>
      ) : null}
      {saved ? (
        <Text className="mt-3 text-[11px] font-semibold text-success">
          Account details saved.
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        className={`mt-4 h-12 flex-row items-center justify-center gap-2 rounded-[14px] bg-blood-red ${
          saving ? 'opacity-60' : 'active:opacity-75'
        }`}
        disabled={saving}
        onPress={() => void save()}>
        {saving ? <ActivityIndicator color="#FFFFFF" size="small" /> : null}
        <Text className="text-xs font-extrabold text-white">
          {saving ? 'Saving...' : 'Save account details'}
        </Text>
      </Pressable>
    </View>
  );
}
