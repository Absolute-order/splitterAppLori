import React, { useState } from 'react';
import { Modal, Pressable, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { YStack, XStack, Text, Button, View } from 'tamagui';
import { Sun, Moon, Languages, Check, ChevronRight } from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';

import { ScreenContainer } from '@/shared/ui/ScreenContainer';
import UserAvatar from '@/shared/ui/UserAvatar';
import { useAppStore } from '@/shared/lib/stores/app-store';
import { LANGUAGE_OPTIONS } from '@/shared/config/languages';

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
        </YStack>
      </YStack>

      {/* Theme Selector Modal */}
      <Modal
        visible={themeModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setThemeModalOpen(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'transparent',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={() => setThemeModalOpen(false)}
        >
          <YStack
            w={300}
            bg="$background"
            br={20}
            p="$4"
            gap="$3"
            borderWidth={1}
            borderColor="$gray5"
            onPress={(e: any) => e.stopPropagation()}
          >
            <Text
              fontSize={18}
              fontWeight="700"
              color="$color"
              textAlign="center"
              mb="$2"
            >
              {t('settings.appearance.title', 'Appearance')}
            </Text>

            {(['light', 'dark', 'system'] as const).map((tCode) => {
              const isActive = theme === tCode;
              return (
                <XStack
                  key={tCode}
                  onPress={() => {
                    setTheme(tCode);
                    setThemeModalOpen(false);
                  }}
                  h={48}
                  br={10}
                  ai="center"
                  jc="space-between"
                  px="$3"
                  bg={isActive ? '$gray3' : 'transparent'}
                  pressStyle={{ bg: '$gray4' }}
                >
                  <Text
                    fontSize={15}
                    fontWeight={isActive ? '600' : '400'}
                    color={isActive ? '$primary' : '$color'}
                  >
                    {t(`settings.appearance.options.${tCode}`, tCode)}
                  </Text>
                  {isActive && <Check size={18} color="$primary" />}
                </XStack>
              );
            })}

            <Button
              mt="$2"
              h={44}
              br={10}
              bg="$gray3"
              pressStyle={{ bg: '$gray4' }}
              onPress={() => setThemeModalOpen(false)}
            >
              <Text fontSize={14} fontWeight="600" color="$gray11">
                {t('common.cancel', 'Cancel')}
              </Text>
            </Button>
          </YStack>
        </Pressable>
      </Modal>

      {/* Language Selector Modal */}
      <Modal
        visible={langModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLangModalOpen(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: 'transparent',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={() => setLangModalOpen(false)}
        >
          <YStack
            w={300}
            bg="$background"
            br={20}
            p="$4"
            gap="$3"
            borderWidth={1}
            borderColor="$gray5"
            onPress={(e: any) => e.stopPropagation()}
          >
            <Text
              fontSize={18}
              fontWeight="700"
              color="$color"
              textAlign="center"
              mb="$2"
            >
              {t('settings.language.title', 'Language')}
            </Text>

            {LANGUAGE_OPTIONS.map((option) => {
              const isActive = language === option.code;
              return (
                <XStack
                  key={option.code}
                  onPress={() => {
                    setLanguage(option.code);
                    setLangModalOpen(false);
                  }}
                  h={48}
                  br={10}
                  ai="center"
                  jc="space-between"
                  px="$3"
                  bg={isActive ? '$gray3' : 'transparent'}
                  pressStyle={{ bg: '$gray4' }}
                >
                  <Text
                    fontSize={15}
                    fontWeight={isActive ? '600' : '400'}
                    color={isActive ? '$primary' : '$color'}
                  >
                    {t(`settings.language.options.${option.code}`, option.shortLabel)}
                  </Text>
                  {isActive && <Check size={18} color="$primary" />}
                </XStack>
              );
            })}

            <Button
              mt="$2"
              h={44}
              br={10}
              bg="$gray3"
              pressStyle={{ bg: '$gray4' }}
              onPress={() => setLangModalOpen(false)}
            >
              <Text fontSize={14} fontWeight="600" color="$gray11">
                {t('common.cancel', 'Cancel')}
              </Text>
            </Button>
          </YStack>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}
