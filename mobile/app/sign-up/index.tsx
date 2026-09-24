import Ionicons from '@expo/vector-icons/Ionicons';
import type { Href } from 'expo-router';
import { Link, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';

import { AuthScreen } from '@/components/auth/AuthScreen';
import { AuthTextField } from '@/components/auth/AuthTextField';
import { authColors } from '@/components/auth/theme';
import { registerUser } from '@/lib/api';
import { saveLocationTrackingSession } from '@/lib/location-tracking-storage';

const genderOptions = ['Female', 'Male', 'Non-binary', 'Prefer not to say'] as const;
const roleOptions = ['Donor', 'Hospital'] as const;
const bloodTypes = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

type Role = (typeof roleOptions)[number];
type Gender = (typeof genderOptions)[number];
type DropdownName = 'gender' | 'role' | 'bloodType';
type IconName = keyof typeof Ionicons.glyphMap;

type SignUpErrors = Partial<
  Record<
    | 'name'
    | 'email'
    | 'phone'
    | 'dateOfBirth'
    | 'gender'
    | 'city'
    | 'role'
    | 'alerts'
    | 'bloodType'
    | 'password'
    | 'confirmPassword'
    | 'terms',
    string
  >
>;

type DropdownFieldProps = {
  error?: string;
  icon: IconName;
  label: string;
  onSelect: (value: string) => void;
  onToggle: () => void;
  open: boolean;
  options: readonly string[];
  placeholder: string;
  value?: string;
};

function DropdownField({
  error,
  icon,
  label,
  onSelect,
  onToggle,
  open,
  options,
  placeholder,
  value,
}: DropdownFieldProps) {
  return (
    <View className="gap-2">
      <Text className="text-[13px] font-bold text-ink">{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        className={`h-[54px] flex-row items-center gap-[11px] rounded-[14px] border px-[15px] active:opacity-75 ${
          error
            ? 'border-[#E7A5A0] bg-error-soft'
            : open
              ? 'border-[1.5px] border-blood-red bg-white'
              : 'border-line bg-field'
        }`}
        onPress={onToggle}>
        <Ionicons color={open ? authColors.red : authColors.muted} name={icon} size={19} />
        <Text className={`flex-1 text-[15px] ${value ? 'text-ink' : 'text-[#A5A39E]'}`}>
          {value ?? placeholder}
        </Text>
        <Ionicons
          color={authColors.muted}
          name={open ? 'chevron-up-outline' : 'chevron-down-outline'}
          size={18}
        />
      </Pressable>

      {open ? (
        <View className="overflow-hidden rounded-[14px] border border-line bg-card shadow-lg">
          {options.map((option, index) => {
            const selected = value === option;
            return (
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                className={`min-h-[48px] flex-row items-center justify-between px-[15px] active:bg-blood-red-soft ${
                  index < options.length - 1 ? 'border-b border-line' : ''
                } ${selected ? 'bg-blood-red-soft' : 'bg-card'}`}
                key={option}
                onPress={() => onSelect(option)}>
                <Text
                  className={`text-sm ${selected ? 'font-extrabold text-blood-red' : 'font-semibold text-ink'}`}>
                  {option}
                </Text>
                {selected ? (
                  <Ionicons color={authColors.red} name="checkmark-circle" size={19} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {error ? <Text className="text-xs font-semibold text-error">{error}</Text> : null}
    </View>
  );
}

function formatDateOfBirth(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function isValidDateOfBirth(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return false;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(year, month - 1, day);
  const today = new Date();

  return (
    year >= 1900 &&
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    date <= today
  );
}

function toApiDate(value: string) {
  const [day, month, year] = value.split('/');
  return `${year}-${month}-${day}T00:00:00.000Z`;
}

const apiGenderValues: Record<Gender, 'female' | 'male' | 'non-binary' | 'prefer-not-to-say'> = {
  Female: 'female',
  Male: 'male',
  'Non-binary': 'non-binary',
  'Prefer not to say': 'prefer-not-to-say',
};

export default function SignUpScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<Gender>();
  const [city, setCity] = useState('');
  const [role, setRole] = useState<Role>();
  const [bloodType, setBloodType] = useState<string>();
  const [openDropdown, setOpenDropdown] = useState<DropdownName>();
  const [acceptedAlerts, setAcceptedAlerts] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [errors, setErrors] = useState<SignUpErrors>({});
  const [serverError, setServerError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const canEnterPassword = role === 'Hospital' || acceptedAlerts;

  const clearError = (field: keyof SignUpErrors) => {
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const toggleDropdown = (dropdown: DropdownName) => {
    setOpenDropdown((current) => (current === dropdown ? undefined : dropdown));
  };

  const selectRole = (value: string) => {
    const nextRole = value as Role;
    setRole(nextRole);
    setOpenDropdown(undefined);
    clearError('role');

    if (nextRole === 'Hospital') {
      setDateOfBirth('');
      setGender(undefined);
      setAcceptedAlerts(false);
      setBloodType(undefined);
      clearError('dateOfBirth');
      clearError('gender');
      clearError('alerts');
      clearError('bloodType');
    }
  };

  const submit = async () => {
    if (submitting) return;
    setOpenDropdown(undefined);

    const nextErrors: SignUpErrors = {};
    if (name.trim().length < 2) nextErrors.name = 'Enter your full name.';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) nextErrors.email = 'Enter a valid email address.';
    if (phone.replace(/\D/g, '').length < 8) nextErrors.phone = 'Enter a valid phone number.';
    if (role === 'Donor' && !isValidDateOfBirth(dateOfBirth)) {
      nextErrors.dateOfBirth = 'Enter a valid past date using DD/MM/YYYY.';
    }
    if (role === 'Donor' && !gender) nextErrors.gender = 'Choose your sex or gender.';
    if (city.trim().length < 2) nextErrors.city = 'Enter your city or region.';
    if (!role) nextErrors.role = 'Choose Donor or Hospital.';
    if (role === 'Donor' && !acceptedAlerts) {
      nextErrors.alerts = 'You must agree to receive alerts and notifications.';
    }
    if (role === 'Donor' && !bloodType) nextErrors.bloodType = 'Choose your blood type.';
    if (password.length < 8) nextErrors.password = 'Use at least 8 characters.';
    if (!confirmPassword) nextErrors.confirmPassword = 'Confirm your password.';
    else if (confirmPassword !== password) nextErrors.confirmPassword = 'Passwords do not match.';
    if (!acceptedTerms) nextErrors.terms = 'Accept the terms to continue.';
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0 || !role || (role === 'Donor' && !gender)) return;

    setSubmitting(true);
    setServerError('');

    try {
      const locationTrackingSession = await registerUser({
        fullName: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        cityRegion: city.trim(),
        role: role.toLowerCase() as 'donor' | 'hospital',
        ...(role === 'Donor' && gender
          ? {
              dateOfBirth: toApiDate(dateOfBirth),
              gender: apiGenderValues[gender],
              bloodType,
              receivesAlerts: true as const,
            }
          : {}),
        termsAccepted: true,
        password,
      });
      await saveLocationTrackingSession(locationTrackingSession);
      router.replace('/location-setup' as Href);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Unable to create your account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <StatusBar style="dark" />
      <AuthScreen
        eyebrow="Join the network"
        footer={
          <Text className="text-sm text-muted">
            Already have an account?{' '}
            <Link className="font-extrabold text-blood-red" href="/login">
              Sign in
            </Link>
          </Text>
        }
        subtitle="Create your account as a donor or hospital and help make blood access faster."
        title="Join BloodBridge">
        <View className="gap-[19px]">
          <View className="flex-row items-center gap-[9px]">
            <View className="h-[27px] w-[27px] items-center justify-center rounded-lg bg-blood-red-soft">
              <Text className="text-xs font-extrabold text-blood-red">1</Text>
            </View>
            <Text className="text-[15px] font-extrabold text-ink">Account information</Text>
          </View>

          <AuthTextField
            autoCapitalize="words"
            autoComplete="name"
            error={errors.name}
            icon="person-outline"
            label="Full name"
            onChangeText={(value) => {
              setName(value);
              clearError('name');
            }}
            placeholder="Your full name"
            value={name}
          />
          <AuthTextField
            autoCapitalize="none"
            autoComplete="email"
            error={errors.email}
            icon="mail-outline"
            keyboardType="email-address"
            label="Email"
            onChangeText={(value) => {
              setEmail(value);
              clearError('email');
            }}
            placeholder="you@example.com"
            value={email}
          />
          <AuthTextField
            autoComplete="tel"
            error={errors.phone}
            icon="call-outline"
            keyboardType="phone-pad"
            label="Phone number"
            onChangeText={(value) => {
              setPhone(value);
              clearError('phone');
            }}
            placeholder="e.g. +237 6 00 00 00 00"
            value={phone}
          />
          <DropdownField
            error={errors.role}
            icon="briefcase-outline"
            label="Role"
            onSelect={selectRole}
            onToggle={() => toggleDropdown('role')}
            open={openDropdown === 'role'}
            options={roleOptions}
            placeholder="Select Donor or Hospital"
            value={role}
          />
          {role !== 'Hospital' ? (
            <>
              <AuthTextField
                error={errors.dateOfBirth}
                icon="calendar-outline"
                keyboardType="number-pad"
                label="Date of birth"
                maxLength={10}
                onChangeText={(value) => {
                  setDateOfBirth(formatDateOfBirth(value));
                  clearError('dateOfBirth');
                }}
                placeholder="DD/MM/YYYY"
                value={dateOfBirth}
              />
              <DropdownField
                error={errors.gender}
                icon="people-outline"
                label="Sex / Gender"
                onSelect={(value) => {
                  setGender(value as Gender);
                  setOpenDropdown(undefined);
                  clearError('gender');
                }}
                onToggle={() => toggleDropdown('gender')}
                open={openDropdown === 'gender'}
                options={genderOptions}
                placeholder="Select sex or gender"
                value={gender}
              />
            </>
          ) : null}
          <AuthTextField
            autoCapitalize="words"
            error={errors.city}
            icon="location-outline"
            label="City / Region"
            onChangeText={(value) => {
              setCity(value);
              clearError('city');
            }}
            placeholder="Your city or region"
            value={city}
          />
          {role !== 'Hospital' ? (
            <View className="gap-3 rounded-2xl border border-[#E3B64B] bg-[#FFF8E6] p-4">
              <View className="flex-row items-start gap-3">
                <View className="mt-0.5 h-8 w-8 items-center justify-center rounded-full bg-[#F6D881]">
                  <Ionicons color="#7A4B00" name="notifications" size={18} />
                </View>
                <View className="flex-1 gap-1">
                  <Text className="text-[13px] font-extrabold uppercase tracking-[0.7px] text-[#7A4B00]">
                    Important alert notice
                  </Text>
                  <Text className="text-sm font-bold leading-5 text-[#4E360B]">
                    You must be ready to receive loud alerts at all times
                  </Text>
                </View>
              </View>

              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: acceptedAlerts }}
                className="flex-row items-start gap-2.5 rounded-xl bg-white/70 p-3 active:opacity-75"
                onPress={() => {
                  setAcceptedAlerts((selected) => !selected);
                  clearError('alerts');
                }}>
                <View
                  className={`mt-px h-[22px] w-[22px] items-center justify-center rounded-[5px] border-[1.5px] ${
                    acceptedAlerts ? 'border-blood-red bg-blood-red' : 'border-[#9B7B37] bg-white'
                  }`}>
                  {acceptedAlerts ? (
                    <Ionicons color={authColors.white} name="checkmark" size={15} />
                  ) : null}
                </View>
                <Text className="flex-1 text-[13px] font-bold leading-5 text-[#4E360B]">
                  I agree to receive alerts and notifications
                </Text>
              </Pressable>
              {errors.alerts ? (
                <Text className="text-xs font-semibold text-error">{errors.alerts}</Text>
              ) : null}
            </View>
          ) : null}

          {role === 'Donor' ? (
            <View className="rounded-2xl border border-blood-red/20 bg-blood-red-soft/40 p-3.5">
              <DropdownField
                error={errors.bloodType}
                icon="water-outline"
                label="Blood type"
                onSelect={(value) => {
                  setBloodType(value);
                  setOpenDropdown(undefined);
                  clearError('bloodType');
                }}
                onToggle={() => toggleDropdown('bloodType')}
                open={openDropdown === 'bloodType'}
                options={bloodTypes}
                placeholder="Select your blood type"
                value={bloodType}
              />
            </View>
          ) : null}

          <View className="my-[3px] h-px bg-line" />
          <View className="flex-row items-center gap-[9px]">
            <View className="h-[27px] w-[27px] items-center justify-center rounded-lg bg-blood-red-soft">
              <Text className="text-xs font-extrabold text-blood-red">2</Text>
            </View>
            <Text className="text-[15px] font-extrabold text-ink">Secure your account</Text>
          </View>
          {!canEnterPassword ? (
            <View className="flex-row items-center gap-2 rounded-xl bg-field px-3.5 py-3">
              <Ionicons color={authColors.muted} name="lock-closed-outline" size={17} />
              <Text className="flex-1 text-xs font-semibold leading-[18px] text-muted">
                Accept the alert notice above to create your password.
              </Text>
            </View>
          ) : null}
          <View className={`gap-[19px] ${canEnterPassword ? '' : 'opacity-45'}`}>
            <AuthTextField
              autoCapitalize="none"
              autoComplete="new-password"
              editable={canEnterPassword}
              error={errors.password}
              icon="lock-closed-outline"
              label="Password"
              onChangeText={(value) => {
                setPassword(value);
                clearError('password');
              }}
              password
              placeholder="At least 8 characters"
              value={password}
            />
            <AuthTextField
              autoCapitalize="none"
              autoComplete="new-password"
              editable={canEnterPassword}
              error={errors.confirmPassword}
              icon="shield-checkmark-outline"
              label="Confirm password"
              onChangeText={(value) => {
                setConfirmPassword(value);
                clearError('confirmPassword');
              }}
              onSubmitEditing={submit}
              password
              placeholder="Enter it again"
              returnKeyType="done"
              value={confirmPassword}
            />
          </View>

          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: acceptedTerms }}
            className="flex-row items-start gap-2.5 active:opacity-75"
            onPress={() => {
              setAcceptedTerms((selected) => !selected);
              clearError('terms');
            }}>
            <View
              className={`mt-px h-[21px] w-[21px] items-center justify-center rounded-[5px] border-[1.5px] ${
                acceptedTerms ? 'border-blood-red bg-blood-red' : 'border-[#C9C6C0]'
              }`}>
              {acceptedTerms ? <Ionicons color={authColors.white} name="checkmark" size={14} /> : null}
            </View>
            <Text className="flex-1 text-xs leading-[19px] text-muted">
              I agree to the{' '}
              <Text className="font-bold text-blood-red">Terms of Service</Text> and{' '}
              <Text className="font-bold text-blood-red">Privacy Policy</Text>.
            </Text>
          </Pressable>
          {errors.terms ? (
            <Text className="text-xs font-semibold text-error">{errors.terms}</Text>
          ) : null}

          {serverError ? (
            <View className="flex-row items-start gap-2.5 rounded-xl bg-error-soft p-3.5">
              <Ionicons color={authColors.error} name="alert-circle" size={19} />
              <Text className="flex-1 text-xs font-semibold leading-[19px] text-error">
                {serverError}
              </Text>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canEnterPassword || submitting }}
            className={`h-14 flex-row items-center justify-center gap-[9px] rounded-[15px] ${
              canEnterPassword && !submitting ? 'bg-ink active:opacity-75' : 'bg-[#C9C6C0]'
            }`}
            disabled={!canEnterPassword || submitting}
            onPress={() => void submit()}>
            {submitting ? <ActivityIndicator color={authColors.white} /> : null}
            <Text className="text-[15px] font-extrabold text-white">
              {submitting ? 'Creating account…' : 'Create account'}
            </Text>
            {!submitting ? (
              <Ionicons color={authColors.white} name="arrow-forward" size={19} />
            ) : null}
          </Pressable>
        </View>
      </AuthScreen>
    </>
  );
}
