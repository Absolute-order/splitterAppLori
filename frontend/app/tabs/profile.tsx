import React, { useState } from 'react';
import { useColorScheme, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import BottomSheet from '@/shared/ui/BottomSheet';
import { YStack, XStack, Text, Button } from 'tamagui';
import { Sun, Moon, Languages, ChevronRight, Lock } from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';

import { ScreenContainer } from '@/shared/ui/ScreenContainer';
import UserAvatar from '@/shared/ui/UserAvatar';
import PasswordInput from '@/shared/ui/PasswordInput';
import { useAppStore } from '@/shared/lib/stores/app-store';
import { changePassword } from '@/features/auth/api';
import { LANGUAGE_OPTIONS } from '@/shared/config/languages';

interface OptionItemProps {
  label: string;
  isActive: boolean;
  onPress: () => void;
}

function OptionItem({ label, isActive, onPress }: OptionItemProps) {
  return (
    <XStack
      onPress={onPress}
      h={54}
      br={12}
      borderWidth={isActive ? 2 : 1}
      borderColor={isActive ? '$primary' : '$gray5'}
      bg={isActive ? 'rgba(46,204,113,0.06)' : '$background'}
      ai="center"
      jc="space-between"
      px="$4"
      my="$1"
      pressStyle={{ scale: 0.98, opacity: 0.9, bg: isActive ? 'rgba(46,204,113,0.1)' : '$gray3' }}
    >
      <Text
        fontSize={15}
        fontWeight={isActive ? '600' : '500'}
        color={isActive ? '$primary' : '$color'}
      >
        {label}
      </Text>
      <XStack
        w={20}
        h={20}
        br={10}
        borderWidth={2}
        borderColor={isActive ? '$primary' : '$gray8'}
        ai="center"
        jc="center"
      >
        {isActive && (
          <XStack
            w={10}
            h={10}
            br={5}
            bg="$primary"
          />
        )}
      </XStack>
    </XStack>
  );
}

export default function ProfileOverviewScreen() {
  const router = useRouter();
  const { user } = useAppStore();
  const { t } = useTranslation();

  const language = useAppStore((s) => s.language);
  const setLanguage = useAppStore((s) => s.setLanguage);
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const systemScheme = useColorScheme();
  const isDark =
    theme === 'system' ? systemScheme === 'dark' : theme === 'dark';

  const [themeModalOpen, setThemeModalOpen] = useState(false);
  const [langModalOpen, setLangModalOpen] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const handleClosePasswordModal = () => {
    setPasswordModalOpen(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError(null);
  };

  const validatePasswordForm = () => {
    if (!currentPassword.trim()) {
      return t('profile.validation.currentPasswordRequired', 'Current password is required');
    }
    if (newPassword.length < 8) {
      return t('profile.validation.passwordLength', 'Password must be at least 8 characters');
    }
    const hasUppercase = /[A-Z]/.test(newPassword);
    const hasLowercase = /[a-z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    const hasSymbol = /[^A-Za-z0-9\s]/.test(newPassword);

    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSymbol) {
      return t(
        'profile.validation.passwordComplexity',
        'Password must include uppercase, lowercase, number, and special character'
      );
    }
    if (newPassword !== confirmPassword) {
      return t('profile.validation.passwordMismatch', 'Passwords do not match');
    }
    if (newPassword === currentPassword) {
      return t(
        'profile.validation.passwordSameAsCurrent',
        'New password must be different from current password'
      );
    }
    return null;
  };

  const handleChangePassword = async () => {
    const err = validatePasswordForm();
    if (err) {
      setPasswordError(err);
      return;
    }
    setPasswordError(null);
    setIsChangingPassword(true);
    try {
      await changePassword({ currentPassword, newPassword });
      Alert.alert(
        t('common.success', 'Success'),
        t('profile.password.successMessage', 'Password changed successfully')
      );
      handleClosePasswordModal();
    } catch (e: any) {
      console.error('Password change failed:', e);
      setPasswordError(e?.response?.data?.message || e?.message || t('common.error', 'Error'));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const displayName = user?.username || t('profile.labels.guest', 'Guest');
  const userInitial = displayName.slice(0, 1).toUpperCase();

  return (
    <ScreenContainer>
      <YStack f={1} ai="center" pt="$6" gap="$5">
        {/* Avatar + Username — tappable to go to profile details */}
        <YStack
          onPress={() => router.push('/tabs/profile-details')}
          ai="center"
          gap="$3"
          pressStyle={{ opacity: 0.8 }}
        >
          <UserAvatar
            uri={user?.avatarUrl ?? undefined}
            label={userInitial}
            size={96}
            textSize={34}
          />
          <XStack ai="center" gap="$2">
            <Text fontSize={20} fontWeight="700" color="$color">
              {displayName}
            </Text>
            <ChevronRight size={18} color="$gray10" />
          </XStack>
          {user?.email ? (
            <Text fontSize={13} color="$gray10" mt={-8}>
              {user.email}
            </Text>
          ) : null}
        </YStack>

        {/* Theme Button */}
        <YStack w="100%" px="$4" gap="$3">
          <XStack
            onPress={() => setThemeModalOpen(true)}
            h={56}
            br={14}
            borderWidth={1}
            borderColor="$gray5"
            bg="$background"
            ai="center"
            px="$4"
            gap="$3"
            pressStyle={{ bg: '$gray2' }}
          >
            {isDark ? (
              <Moon size={20} color="$primary" />
            ) : (
              <Sun size={20} color="$primary" />
            )}
            <YStack f={1}>
              <Text fontSize={15} fontWeight="600" color="$color">
                {t('settings.appearance.title', 'Appearance')}
              </Text>
              <Text fontSize={12} color="$gray10">
                {t(`settings.appearance.options.${theme}`, theme)}
              </Text>
            </YStack>
            <ChevronRight size={18} color="$gray9" />
          </XStack>

          {/* Language Button */}
          <XStack
            onPress={() => setLangModalOpen(true)}
            h={56}
            br={14}
            borderWidth={1}
            borderColor="$gray5"
            bg="$background"
            ai="center"
            px="$4"
            gap="$3"
            pressStyle={{ bg: '$gray2' }}
          >
            <Languages size={20} color="$primary" />
            <YStack f={1}>
              <Text fontSize={15} fontWeight="600" color="$color">
                {t('settings.language.title', 'Language')}
              </Text>
              <Text fontSize={12} color="$gray10">
                {t(`settings.language.options.${language}`, language)}
              </Text>
            </YStack>
            <ChevronRight size={18} color="$gray9" />
          </XStack>

          {/* Change Password Button */}
          <XStack
            onPress={() => setPasswordModalOpen(true)}
            h={56}
            br={14}
            borderWidth={1}
            borderColor="$gray5"
            bg="$background"
            ai="center"
            px="$4"
            gap="$3"
            pressStyle={{ bg: '$gray2' }}
          >
            <Lock size={20} color="$primary" />
            <YStack f={1}>
              <Text fontSize={15} fontWeight="600" color="$color">
                {t('profile.password.title', 'Change password')}
              </Text>
              <Text fontSize={12} color="$gray10">
                {t('profile.password.subtitle', 'Update your account password')}
              </Text>
            </YStack>
            <ChevronRight size={18} color="$gray9" />
          </XStack>
        </YStack>
      </YStack>

      {/* Theme Selector BottomSheet */}
      <BottomSheet
        visible={themeModalOpen}
        onClose={() => setThemeModalOpen(false)}
      >
        <YStack gap="$3">
          <Text
            fontSize={18}
            fontWeight="700"
            color="$color"
            textAlign="center"
            mb="$3"
          >
            {t('settings.appearance.title', 'Appearance')}
          </Text>

          {(['light', 'dark', 'system'] as const).map((tCode) => {
            const isActive = theme === tCode;
            const label = t(`settings.appearance.options.${tCode}`, tCode);
            return (
              <OptionItem
                key={tCode}
                label={label}
                isActive={isActive}
                onPress={() => {
                  setTheme(tCode);
                  setThemeModalOpen(false);
                }}
              />
            );
          })}

          <Button
            mt="$3"
            h={48}
            br={12}
            bg="$gray3"
            pressStyle={{ bg: '$gray4' }}
            onPress={() => setThemeModalOpen(false)}
          >
            <Text fontSize={15} fontWeight="600" color="$gray11">
              {t('common.cancel', 'Cancel')}
            </Text>
          </Button>
        </YStack>
      </BottomSheet>

      {/* Language Selector BottomSheet */}
      <BottomSheet
        visible={langModalOpen}
        onClose={() => setLangModalOpen(false)}
      >
        <YStack gap="$3">
          <Text
            fontSize={18}
            fontWeight="700"
            color="$color"
            textAlign="center"
            mb="$3"
          >
            {t('settings.language.title', 'Language')}
          </Text>

          {LANGUAGE_OPTIONS.map((option) => {
            const isActive = language === option.code;
            const label = t(`settings.language.options.${option.code}`, option.shortLabel);
            return (
              <OptionItem
                key={option.code}
                label={label}
                isActive={isActive}
                onPress={() => {
                  setLanguage(option.code);
                  setLangModalOpen(false);
                }}
              />
            );
          })}

          <Button
            mt="$3"
            h={48}
            br={12}
            bg="$gray3"
            pressStyle={{ bg: '$gray4' }}
            onPress={() => setLangModalOpen(false)}
          >
            <Text fontSize={15} fontWeight="600" color="$gray11">
              {t('common.cancel', 'Cancel')}
            </Text>
          </Button>
        </YStack>
      </BottomSheet>
      {/* Change Password BottomSheet */}
      <BottomSheet
        visible={passwordModalOpen}
        onClose={handleClosePasswordModal}
      >
        <YStack gap="$3">
          <Text
            fontSize={18}
            fontWeight="700"
            color="$color"
            textAlign="center"
            mb="$3"
          >
            {t('profile.password.title', 'Change password')}
          </Text>

          <PasswordInput
            label={t('profile.password.currentLabel', 'Current password')}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder={t('profile.password.currentPlaceholder', 'Enter current password')}
            textInputProps={{ returnKeyType: 'next' }}
          />

          <PasswordInput
            label={t('profile.password.newLabel', 'New password')}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder={t('profile.password.newPlaceholder', 'Enter new password')}
            textInputProps={{ returnKeyType: 'next' }}
          />

          <Text fontSize={12} color="$gray10">
            {t(
              'profile.password.requirements',
              'Password must be at least 8 characters and include uppercase, lowercase, number, and special symbol.'
            )}
          </Text>

          <PasswordInput
            label={t('profile.password.confirmLabel', 'Confirm new password')}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder={t('profile.password.confirmPlaceholder', 'Confirm new password')}
            error={passwordError || undefined}
            textInputProps={{ returnKeyType: 'done' }}
          />

          <Button
            mt="$3"
            h={48}
            br={12}
            bg="$green9"
            color="white"
            disabled={isChangingPassword}
            onPress={handleChangePassword}
            pressStyle={{ bg: '$green10' }}
          >
            <Text fontSize={15} fontWeight="600" color="white">
              {isChangingPassword
                ? t('profile.password.updating', 'Updating...')
                : t('profile.password.submit', 'Change password')}
            </Text>
          </Button>

          <Button
            h={48}
            br={12}
            bg="$gray3"
            pressStyle={{ bg: '$gray4' }}
            onPress={handleClosePasswordModal}
          >
            <Text fontSize={15} fontWeight="600" color="$gray11">
              {t('common.cancel', 'Cancel')}
            </Text>
          </Button>
        </YStack>
      </BottomSheet>
    </ScreenContainer>
  );
}
