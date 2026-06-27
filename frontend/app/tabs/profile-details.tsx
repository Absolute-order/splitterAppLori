import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, KeyboardAvoidingView, Platform, ScrollView, TextInputProps } from 'react-native';
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import * as ImagePicker from 'expo-image-picker';
import { YStack, XStack, Text, Button, Separator, Spinner, View } from 'tamagui';
import { Copy, LogOut, Upload, RotateCcw, CheckCircle, User as UserIcon, Mail, Edit3, X, Check, Languages } from '@tamagui/lucide-icons';
import { ThemedSafeArea } from '@/shared/ui/ThemedSafeArea';
import { useTranslation } from 'react-i18next';
import { ScreenContainer } from '@/shared/ui/ScreenContainer';
import UserAvatar from '@/shared/ui/UserAvatar';
import Input from '@/shared/ui/Input';
import BottomSheet from '@/shared/ui/BottomSheet';
import { useAppStore } from '@/shared/lib/stores/app-store';
import { resetAvatar, updateEmail, updateUsername, uploadAvatar } from '@/features/auth/api';
import { type LanguageCode } from '@/shared/config/languages';

type SuccessKey = 'avatar' | 'password';
type StatusState = 'idle' | 'saving' | 'success';

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: 'images',
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.9,
};

interface SectionCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  successTrigger?: number;
}

function SectionCard({ title, icon, children, successTrigger = 0 }: SectionCardProps) {
  return (
    <YStack
      borderWidth={1}
      borderColor="$gray5"
      borderRadius={16}
      padding="$4"
      gap="$3"
      backgroundColor="$background"
      position="relative"
    >
      <XStack ai="center" jc="space-between">
        <XStack ai="center" gap="$2">
          {icon}
          <Text fontSize={16} fontWeight="700" color="$color">
            {title}
          </Text>
        </XStack>
        <SuccessBadge trigger={successTrigger} />
      </XStack>
      {children}
    </YStack>
  );
}

function SuccessBadge({ trigger }: { trigger?: number }) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (!trigger) return;

    setVisible(true);
    opacity.setValue(0);
    scale.setValue(0.9);

    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
        tension: 140,
      }),
    ]).start(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: 220,
        delay: 1200,
        useNativeDriver: true,
      }).start(() => setVisible(false));
    });
  }, [trigger, opacity, scale]);

  if (!visible) return null;

  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ scale }],
        backgroundColor: 'rgba(34,197,94,0.15)',
        borderRadius: 999,
        paddingHorizontal: 12,
        paddingVertical: 4,
      }}
    >
      <XStack ai="center" gap="$1">
        <CheckCircle size={16} color="#22c55e" />
        <Text fontSize={12} fontWeight="600" color="$green10">
          {t('profile.status.saved', 'Saved')}
        </Text>
      </XStack>
    </Animated.View>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
  onCopy?: () => void;
}

function InfoRow({ label, value, onCopy }: InfoRowProps) {
  const { t } = useTranslation();
  return (
    <YStack gap="$1">
      <Text fontSize={12} color="$gray9">
        {label}
      </Text>
      <XStack ai="center" jc="space-between">
        <Text fontSize={16} fontWeight="600" color="$color">
          {value || '—'}
        </Text>
        {onCopy && (
          <Button size="$2" variant="outlined" icon={<Copy size={16} color="$gray11" />} onPress={onCopy}>
            {t('profile.actions.copy', 'Copy')}
          </Button>
        )}
      </XStack>
    </YStack>
  );
}

interface EditableFieldRowProps {
  label: string;
  value: string;
  draft: string;
  setDraft: (value: string) => void;
  placeholder: string;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  status: StatusState;
  error?: string | null;
  onCopy?: () => void;
  textInputProps?: Partial<TextInputProps>;
}

function EditableFieldRow({
  label,
  value,
  draft,
  setDraft,
  placeholder,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onSave,
  status,
  error,
  onCopy,
  textInputProps,
}: EditableFieldRowProps) {
  const { t } = useTranslation();
  const animatedScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (status === 'success' && !isEditing) {
      animatedScale.setValue(0.85);
      Animated.spring(animatedScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 5,
        tension: 120,
      }).start();
    }
  }, [animatedScale, status, isEditing]);

  const editIcon = () => {
    if (status === 'saving') {
      return <Spinner size="small" color="$gray11" />;
    }
    if (status === 'success' && !isEditing) {
      return (
        <Animated.View style={{ transform: [{ scale: animatedScale }] }}>
          <CheckCircle size={16} color="#22c55e" />
        </Animated.View>
      );
    }
    return <Edit3 size={16} color="$gray11" />;
  };

  return (
    <YStack gap="$2">
      <XStack ai="center" jc="space-between">
        <Text fontSize={12} color="$gray9">
          {label}
        </Text>
        <XStack gap="$2">
          {isEditing ? (
            <>
              <Button
                size="$2"
                variant="outlined"
                icon={<X size={16} color="$gray11" />}
                onPress={onCancelEdit}
              />
              <Button
                size="$2"
                bg="$green9"
                color="white"
                icon={status === 'saving' ? <Spinner size="small" color="white" /> : <Check size={16} color="white" />}
                onPress={onSave}
                disabled={status === 'saving'}
              />
            </>
          ) : (
            <>
              {onCopy && (
                <Button
                  size="$2"
                  variant="outlined"
                  icon={<Copy size={16} color="$gray11" />}
                  onPress={onCopy}
                >
                  {t('profile.actions.copy', 'Copy')}
                </Button>
              )}
              <Button
                size="$2"
                variant="outlined"
                onPress={onStartEdit}
                icon={editIcon()}
              />
            </>
          )}
        </XStack>
      </XStack>
      {isEditing ? (
        <Input
          value={draft}
          onChangeText={setDraft}
          placeholder={placeholder}
          error={error || undefined}
          textInputProps={{ autoCapitalize: 'none', autoCorrect: false, ...textInputProps }}
        />
      ) : (
        <Text fontSize={16} fontWeight="600" color="$color">
          {value || '—'}
        </Text>
      )}
    </YStack>
  );
}

export default function ProfileDetailsScreen() {
  const router = useRouter();
  const { user, logout, setUser } = useAppStore();

  // language from store
  const language = useAppStore((s) => s.language);
  const { t } = useTranslation();
  const setLanguage = useAppStore((s) => s.setLanguage);



  const guestLabel = t('profile.labels.guest', 'Guest');
  const notAvailableLabel = t('profile.labels.notAvailable', 'N/A');
  const avatarTitle = t('profile.avatar.title', 'Avatar');
  const avatarHint = t(
    'profile.avatar.hint',
    'Uploaded avatars are delivered via our CDN and refresh instantly.'
  );
  const avatarUploadLabel = t('profile.avatar.upload', 'Upload from phone');
  const avatarUploadingLabel = t('profile.avatar.uploading', 'Uploading...');
  const avatarResetLabel = t('profile.avatar.reset', 'Reset avatar');
  const avatarResettingLabel = t('profile.avatar.resetting', 'Resetting...');
  const userInfoTitle = t('profile.info.title', 'User information');
  const usernameLabel = t('profile.info.usernameLabel', 'Username');
  const usernamePlaceholder = t('profile.info.usernamePlaceholder', 'Enter a new username');
  const emailLabel = t('profile.info.emailLabel', 'Email');
  const emailPlaceholder = t('profile.info.emailPlaceholder', 'Enter a new email');
  const userIdLabel = t('profile.info.userId', 'User ID');

  const logoutLabel = t('profile.logout', 'Log out');

  const displayName = user?.username || guestLabel;
  const userId = user?.uniqueId ?? '';

  const [previewUri, setPreviewUri] = useState<string | null>(user?.avatarUrl ?? null);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [isResettingAvatar, setIsResettingAvatar] = useState(false);
  const [successCounters, setSuccessCounters] = useState<Record<SuccessKey, number>>({
    avatar: 0,
    password: 0,
  });

  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState(user?.username ?? '');
  const [usernameStatus, setUsernameStatus] = useState<StatusState>('idle');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const usernameResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [emailDraft, setEmailDraft] = useState(user?.email ?? '');
  const [emailStatus, setEmailStatus] = useState<StatusState>('idle');
  const [emailError, setEmailError] = useState<string | null>(null);
  const emailResetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);



  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  const [mediaPermission, requestMediaPermission] = ImagePicker.useMediaLibraryPermissions();

  useEffect(() => {
    setPreviewUri(user?.avatarUrl ?? null);
  }, [user?.avatarUrl]);

  useEffect(() => {
    setUsernameDraft(user?.username ?? '');
    setIsEditingUsername(false);
    setUsernameStatus('idle');
    setUsernameError(null);
  }, [user?.username]);

  useEffect(() => {
    setEmailDraft(user?.email ?? '');
    setIsEditingEmail(false);
    setEmailStatus('idle');
    setEmailError(null);
  }, [user?.email]);

  useEffect(() => () => {
    if (usernameResetTimer.current) clearTimeout(usernameResetTimer.current);
    if (emailResetTimer.current) clearTimeout(emailResetTimer.current);
  }, []);

  const triggerSuccess = useCallback((key: SuccessKey) => {
    setSuccessCounters((prev) => ({ ...prev, [key]: prev[key] + 1 }));
  }, []);

  const validateUsername = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return t('profile.validation.usernameRequired', 'Username cannot be empty');
      if (trimmed.length < 2) return t('profile.validation.usernameMin', 'Username must be at least 2 characters');
      if (trimmed.length > 15) return t('profile.validation.usernameMax', 'Username must be at most 15 characters');
      return null;
    },
    [t]
  );

  const validateEmail = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (!trimmed) return t('profile.validation.emailRequired', 'Email cannot be empty');
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(trimmed)) return t('profile.validation.emailInvalid', 'Enter a valid email address');
      return null;
    },
    [t]
  );
  useEffect(() => {
    if (usernameError) {
      const error = validateUsername(usernameDraft);
      if (!error) setUsernameError(null);
    }
  }, [usernameDraft, usernameError, validateUsername]);

  useEffect(() => {
    if (emailError) {
      const error = validateEmail(emailDraft);
      if (!error) setEmailError(null);
    }
  }, [emailDraft, emailError, validateEmail]);

  const ensureMediaPermission = useCallback(async () => {
    if (mediaPermission?.granted) return true;
    const response = await requestMediaPermission();
    if (response?.granted) return true;
    Alert.alert(
      t('profile.alerts.permissionTitle', 'Permission needed'),
      t(
        'profile.alerts.permissionMessage',
        'Please allow access to your photo library to pick an avatar.'
      )
    );
    return false;
  }, [mediaPermission?.granted, requestMediaPermission, t]);

  const buildAvatarFormData = useCallback(
    async (asset: ImagePicker.ImagePickerAsset) => {
      if (!asset.uri) {
        throw new Error(t('profile.alerts.imageMissing', 'Image file is missing a URI.'));
      }

      const formData = new FormData();
      const mimeType = asset.mimeType ?? 'image/jpeg';
      const extension = mimeType.split('/').pop() || 'jpg';
      const fileName = asset.fileName ?? `avatar.${extension}`;

      if (Platform.OS === 'web') {
        const response = await fetch(asset.uri);
        if (!response.ok) {
          throw new Error(
            t('profile.alerts.uploadReadFailed', 'Unable to read the selected file for upload.')
          );
        }
        const blob = await response.blob();
        formData.append('file', blob, fileName);
      } else {
        formData.append('file', {
          uri: asset.uri,
          name: fileName,
          type: mimeType,
        } as any);
      }

      return formData;
    },
    [t]
  );

  const handleUploadSelectedAsset = useCallback(
    async (asset: ImagePicker.ImagePickerAsset) => {
      if (!asset) return;
      if (!user) {
        Alert.alert(
          t('profile.alerts.unavailableTitle', 'Unavailable'),
          t('profile.alerts.avatarLoginRequired', 'Sign in to update your avatar.')
        );
        return;
      }

      try {
        setIsSavingAvatar(true);
        const formData = await buildAvatarFormData(asset);
        const { avatarUrl: uploadedUrl } = await uploadAvatar(formData);
        setPreviewUri(uploadedUrl);
        setUser({ ...user, avatarUrl: uploadedUrl });
        triggerSuccess('avatar');
      } catch (error) {
        console.error('Avatar upload error:', error);
        const fallback = t('profile.alerts.avatarUpdateFailed', 'Could not update the avatar.');
        const message = error instanceof Error && error.message ? error.message : fallback;
        Alert.alert(t('common.error', 'Error'), message);
      } finally {
        setIsSavingAvatar(false);
      }
    },
    [buildAvatarFormData, setUser, t, triggerSuccess, user]
  );

  const handlePickFromLibrary = useCallback(async () => {
    const allowed = await ensureMediaPermission();
    if (!allowed) return;
    const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
    if (!result.canceled && result.assets && result.assets.length > 0) {
      handleUploadSelectedAsset(result.assets[0]);
    }
  }, [ensureMediaPermission, handleUploadSelectedAsset]);

  const handleResetAvatar = useCallback(async () => {
    if (!user) {
      Alert.alert(
        t('profile.alerts.unavailableTitle', 'Unavailable'),
        t('profile.alerts.avatarLoginRequired', 'Sign in to update your avatar.')
      );
      return;
    }
    try {
      setIsResettingAvatar(true);
      try {
        const updatedUser = await resetAvatar();
        setUser(updatedUser);
        setPreviewUri(updatedUser.avatarUrl ?? null);
      } catch (apiError) {
        console.warn('Reset avatar API unavailable, falling back to local reset.', apiError);
        setUser({ ...user, avatarUrl: null });
        setPreviewUri(null);
      }
      triggerSuccess('avatar');
    } catch (error) {
      console.error('Reset avatar error:', error);
      Alert.alert(
        t('common.error', 'Error'),
        t('profile.alerts.avatarResetFailed', 'Could not reset the avatar.')
      );
    } finally {
      setIsResettingAvatar(false);
    }
  }, [setUser, t, triggerSuccess, user]);

  const handleCopy = useCallback(
    async (label: string, value: string | null | undefined) => {
      if (!value) {
        Alert.alert(
          t('profile.alerts.unavailableTitle', 'Unavailable'),
          t('profile.copy.unavailableMessage', {
            field: label,
            defaultValue: `${label} is not available yet.`,
          })
        );
        return;
      }
      await Clipboard.setStringAsync(value);
      Alert.alert(
        t('profile.copy.successTitle', 'Copied'),
        t('profile.copy.successMessage', {
          field: label,
          defaultValue: `${label} copied to the clipboard.`,
        })
      );
    },
    [t]
  );

  const handleSaveUsername = useCallback(async () => {
    if (!user) {
      Alert.alert(
        t('profile.alerts.unavailableTitle', 'Unavailable'),
        t('profile.alerts.profileLoginRequired', 'Sign in to update your profile.')
      );
      return;
    }

    const issue = validateUsername(usernameDraft);
    setUsernameError(issue);
    if (issue) return;

    const trimmed = usernameDraft.trim();
    if (trimmed === (user.username ?? '')) {
      setIsEditingUsername(false);
      return;
    }

    try {
      setUsernameStatus('saving');
      const updatedUser = await updateUsername({ username: trimmed });
      setUser(updatedUser);
      setUsernameStatus('success');
      setIsEditingUsername(false);
      if (usernameResetTimer.current) clearTimeout(usernameResetTimer.current);
      usernameResetTimer.current = setTimeout(() => setUsernameStatus('idle'), 1600);
    } catch (error) {
      console.error('Username update failed:', error);
      const fallback = t('profile.alerts.usernameUpdateFailed', 'Could not update the username.');
      const message = error instanceof Error && error.message ? error.message : fallback;
      Alert.alert(t('common.error', 'Error'), message);
      setUsernameStatus('idle');
    }
  }, [setUser, t, user, usernameDraft, validateUsername]);

  const handleSaveEmail = useCallback(async () => {
    if (!user) {
      Alert.alert(
        t('profile.alerts.unavailableTitle', 'Unavailable'),
        t('profile.alerts.profileLoginRequired', 'Sign in to update your profile.')
      );
      return;
    }

    const issue = validateEmail(emailDraft);
    setEmailError(issue);
    if (issue) return;

    const trimmed = emailDraft.trim();
    if (trimmed.toLowerCase() === (user.email ?? '').toLowerCase()) {
      setIsEditingEmail(false);
      return;
    }

    try {
      setEmailStatus('saving');
      const updatedUser = await updateEmail({ email: trimmed });
      setUser(updatedUser);
      setEmailStatus('success');
      setIsEditingEmail(false);
      if (emailResetTimer.current) clearTimeout(emailResetTimer.current);
      emailResetTimer.current = setTimeout(() => setEmailStatus('idle'), 1600);
    } catch (error) {
      console.error('Email update failed:', error);
      const fallback = t('profile.alerts.emailUpdateFailed', 'Could not update the email.');
      const message = error instanceof Error && error.message ? error.message : fallback;
      Alert.alert(t('common.error', 'Error'), message);
      setEmailStatus('idle');
    }
  }, [emailDraft, setUser, t, user, validateEmail]);



  const handleLogout = useCallback(() => {
    setLogoutModalOpen(true);
  }, []);

  const handleConfirmLogout = useCallback(() => {
    setLogoutModalOpen(false);
    logout()
      .then(() => router.replace({ pathname: '/' }))
      .catch(() =>
        Alert.alert(
          t('common.error', 'Error'),
          t('profile.alerts.logoutFailed', 'Could not log out. Please try again.')
        )
      );
  }, [logout, router, t]);

  const isResetDisabled = isResettingAvatar || (!user?.avatarUrl && !previewUri);

  return (
    <ThemedSafeArea>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.select({ ios: 0, android: 0 }) ?? 0}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <ScreenContainer>
            <YStack gap="$3" pb="$6">

              {/* Avatar */}
              <SectionCard
                title={avatarTitle}
                icon={<Upload size={18} color="$gray11" />}
                successTrigger={successCounters.avatar}
              >
                <YStack ai="center" gap="$3">
                  <UserAvatar
                    uri={previewUri ?? undefined}
                    label={displayName.slice(0, 1).toUpperCase()}
                    size={96}
                    textSize={34}
                  />
                  <Text fontSize={12} color="$gray10">
                    {avatarHint}
                  </Text>
                  <XStack gap="$2" w="100%">
                    <Button
                      flex={1}
                      size="$3"
                      bg="$green9"
                      color="white"
                      icon={<Upload size={18} color="white" />}
                      disabled={isSavingAvatar}
                      onPress={handlePickFromLibrary}
                    >
                      {isSavingAvatar ? avatarUploadingLabel : avatarUploadLabel}
                    </Button>
                    <Button
                      flex={1}
                      size="$3"
                      variant="outlined"
                      icon={<RotateCcw size={18} color="$gray11" />}
                      disabled={isResetDisabled}
                      onPress={handleResetAvatar}
                    >
                      {isResettingAvatar ? avatarResettingLabel : avatarResetLabel}
                    </Button>
                  </XStack>
                </YStack>
              </SectionCard>


              {/* User info */}
              <SectionCard title={userInfoTitle} icon={<UserIcon size={18} color="$gray11" />}>
                <EditableFieldRow
                  label={usernameLabel}
                  value={user?.username ?? ''}
                  draft={usernameDraft}
                  setDraft={setUsernameDraft}
                  placeholder={usernamePlaceholder}
                  isEditing={isEditingUsername}
                  onStartEdit={() => setIsEditingUsername(true)}
                  onCancelEdit={() => {
                    setUsernameDraft(user?.username ?? '');
                    setIsEditingUsername(false);
                    setUsernameError(null);
                  }}
                  onSave={handleSaveUsername}
                  status={usernameStatus}
                  error={usernameError}
                  onCopy={() => handleCopy(usernameLabel, user?.username)}
                />
                <Separator />
                <EditableFieldRow
                  label={emailLabel}
                  value={user?.email ?? ''}
                  draft={emailDraft}
                  setDraft={setEmailDraft}
                  placeholder={emailPlaceholder}
                  isEditing={isEditingEmail}
                  onStartEdit={() => setIsEditingEmail(true)}
                  onCancelEdit={() => {
                    setEmailDraft(user?.email ?? '');
                    setIsEditingEmail(false);
                    setEmailError(null);
                  }}
                  onSave={handleSaveEmail}
                  status={emailStatus}
                  error={emailError}
                  onCopy={() => handleCopy(emailLabel, user?.email)}
                  textInputProps={{ keyboardType: 'email-address', autoCapitalize: 'none', autoCorrect: false }}
                />
                <Separator />
                <InfoRow
                  label={userIdLabel}
                  value={userId || notAvailableLabel}
                  onCopy={() => handleCopy(userIdLabel, userId)}
                />
              </SectionCard>


              {/* Logout */}
              <Button
                size="$3"
                bg="$red4"
                color="$red11"
                hoverStyle={{ bg: '$red5' }}
                pressStyle={{ bg: '$red6' }}
                icon={<LogOut size={18} color="$red11" />}
                onPress={handleLogout}
              >
                {logoutLabel}
              </Button>
            </YStack>
          </ScreenContainer>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Logout Confirmation BottomSheet */}
      <BottomSheet
        visible={logoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
      >
        <YStack gap="$4" py="$2" ai="center">
          {/* A beautiful circular icon container */}
          <View
            w={64}
            h={64}
            br={32}
            bg="$red3"
            ai="center"
            jc="center"
          >
            <LogOut size={28} color="$red10" />
          </View>

          <YStack gap="$2" ai="center" px="$2">
            <Text fontSize={18} fontWeight="700" color="$color" textAlign="center">
              {t('profile.alerts.logoutConfirmTitle', 'Confirm Log Out')}
            </Text>
            <Text fontSize={14} color="$gray10" textAlign="center">
              {t('profile.alerts.logoutConfirmMessage', 'Are you sure you want to log out of your account?')}
            </Text>
          </YStack>

          <XStack gap="$3" w="100%" mt="$2">
            <Button
              flex={1}
              h={48}
              br={12}
              bg="$gray3"
              pressStyle={{ bg: '$gray4' }}
              onPress={() => setLogoutModalOpen(false)}
            >
              <Text fontSize={15} fontWeight="600" color="$gray11">
                {t('common.cancel', 'Cancel')}
              </Text>
            </Button>
            <Button
              flex={1}
              h={48}
              br={12}
              bg="$red9"
              pressStyle={{ bg: '$red10' }}
              onPress={handleConfirmLogout}
            >
              <Text fontSize={15} fontWeight="600" color="white">
                {t('profile.logout', 'Log out')}
              </Text>
            </Button>
          </XStack>
        </YStack>
      </BottomSheet>
    </ThemedSafeArea>
  );
}
