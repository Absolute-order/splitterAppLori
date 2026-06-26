// app/tabs/_layout.tsx

import React, { useCallback, useEffect, useState } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Pressable, useColorScheme, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack, XStack, Text, View, Theme, Button } from 'tamagui';
import { Home, Settings, Bell, ChevronLeft, Sun, Moon, History, User, Plus, ScanLine, PenLine, Users } from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';

import { useAppStore } from '@/shared/lib/stores/app-store';
import UserAvatar from '@/shared/ui/UserAvatar';
import { useFriendsStore } from '@/features/friends/model/friends.store';
import { useNotificationsStore } from '@/features/notifications/model/notifications.store';

// --- Reusable Badge Component ---
function DotBadge({ value }: { value?: number }) {
  if (!value || value <= 0) return null;
  return (
    <View
      position="absolute"
      top={-4} right={-4}
      w={20} h={20}
      br={999}
      ai="center" jc="center"
      backgroundColor="$primary"
    >
      <Text color="white" fontSize={10} fontWeight="700">
        {value}
      </Text>
    </View>
  );
}

// --- Global Header for all Tabs ---
// FIX: ранее здесь были useEffect + useFocusEffect + AppState.addEventListener,
// которые вызывали fetchAll() (загрузку списка друзей и запросов) при каждом
// переключении таба. Поскольку этот хедер общий для ВСЕХ экранов, каждая
// навигация → fetchAll → обновление стора → перерисовка → useFocusEffect →
// снова fetchAll → бесконечный цикл запросов GET /friends и GET /friends/requests
// теперь хедер только ЧИТАЕТ requestsCount из стора через selector.
// загрузку данных выполняют сами экраны друзей при своём монтировании
function GlobalTabsHeader(props: any) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAppStore();
  const { t } = useTranslation();
  const routeName = props?.route?.name ?? '';
  const showHomeShortcut =
    routeName !== 'profile' &&
    routeName !== 'sessions/history/index' &&
    routeName !== 'friends/index' &&
    routeName !== 'notifications' &&
    routeName !== 'profile-details' &&
    (routeName.startsWith('friends') ||
      routeName.startsWith('groups') ||
      routeName.startsWith('sessions'));

  const showBackButton =
    routeName === 'notifications' ||
    routeName === 'profile-details';

  const showProfileButton =
    routeName !== 'profile' &&
    routeName !== 'profile-details' &&
    routeName !== 'index' &&
    !routeName.startsWith('friends') &&
    !routeName.startsWith('sessions/history');

  const showRightIcons =
    routeName !== 'notifications' &&
    routeName !== 'profile-details';

  const onBackToHome = () => router.replace({ pathname: '/tabs' });
  const onBack = () => router.back();

  const requestsCount = useFriendsStore((s) => s.requestsRaw?.incoming?.length ?? 0);
  const notifUnread = useNotificationsStore((s) => s.unreadCount);
  const badgeTotal = requestsCount + notifUnread;



  const displayName = user?.username || t('profile.labels.guest', 'Guest');
  const userInitial = displayName.slice(0, 1).toUpperCase();

  const handleOpenProfile = useCallback(() => {
    router.push({ pathname: '/tabs/profile' });
  }, [router]);

  return (
    <YStack bg="$background" pt={insets.top}>
      <XStack h={50} ai="center" jc="space-between" px="$4">
        <XStack ai="center" gap="$2" f={1} flexShrink={1}>
          {showHomeShortcut && (
            <Pressable onPress={onBackToHome} hitSlop={10}>
              <XStack ai="center" gap="$1">
                <ChevronLeft size={20} color="$gray11" />
                <Text fontSize={14} color="$gray11">
                  {t('navigation.mainMenu', 'Main menu')}
                </Text>
              </XStack>
            </Pressable>
          )}
          {showBackButton && (
            <Pressable onPress={onBack} hitSlop={10}>
              <XStack ai="center" gap="$1">
                <ChevronLeft size={20} color="$gray11" />
                <Text fontSize={14} color="$gray11">
                  {t('common.back', 'Back')}
                </Text>
              </XStack>
            </Pressable>
          )}
          <Text fontSize={18} fontWeight="600" numberOfLines={1} flexShrink={1} color="$color">
            {props.options.title}
          </Text>
        </XStack>

        {showRightIcons && (
          <XStack ai="center" gap="$3" flexShrink={0}>
            <Pressable onPress={() => router.push('/tabs/notifications')}>
              <View>
                <Bell size={22} color="$gray11" />
                <DotBadge value={badgeTotal} />
              </View>
            </Pressable>

            {showProfileButton && (
              <Pressable onPress={handleOpenProfile} hitSlop={10}>
                <UserAvatar uri={user?.avatarUrl ?? undefined} label={userInitial} size={36} textSize={14} />
              </Pressable>
            )}
          </XStack>
        )}
      </XStack>
    </YStack>
  );
}

function CustomTabBar({ state, onAddPress }: any) {
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const currentRouteName = state.routes[state.index].name;

  const currentTheme = useAppStore((s) => s.theme);
  const systemScheme = useColorScheme();
  const isDark =
    currentTheme === 'system'
      ? systemScheme === 'dark'
      : currentTheme === 'dark';

  // We only show bottom navigation bar on 'sessions/history/index', 'profile', 'index', and 'friends/index' screens
  const isMainScreen = ['sessions/history/index', 'profile', 'index', 'friends/index'].includes(currentRouteName);
  if (!isMainScreen) return null;

  return (
    <View
      position="absolute"
      bottom={insets.bottom > 0 ? insets.bottom + 8 : 16}
      left={16}
      right={16}
      height={64}
      borderRadius={32}
      backgroundColor="$backgroundStrong"
      borderWidth={isDark ? 1 : 0}
      borderColor={isDark ? "$gray5" : "transparent"}
      shadowColor="$gray8"
      shadowOffset={{ width: 0, height: 4 }}
      shadowOpacity={0.06}
      shadowRadius={8}
      style={{ elevation: 3 } as any}
      flexDirection="row"
      alignItems="center"
      justifyContent="space-between"
      paddingHorizontal="$3"
      zIndex={100}
    >
      {/* Item 0: Home */}
      <TabBarItem
        label={t('navigation.tabs.home', 'Home')}
        active={currentRouteName === 'index'}
        icon={<Home size={20} />}
        onPress={() => router.push('/tabs')}
      />

      {/* Item 1: History */}
      <TabBarItem
        label={t('navigation.historyTab', 'History')}
        active={currentRouteName === 'sessions/history/index'}
        icon={<History size={20} />}
        onPress={() => router.push('/tabs/sessions/history')}
      />

      {/* Item 2: Central Add/Scan Button */}
      <View
        onPress={onAddPress}
        width={48}
        height={48}
        borderRadius={24}
        backgroundColor="$primary"
        alignItems="center"
        justifyContent="center"
        shadowColor="$primary"
        shadowOffset={{ width: 0, height: 4 }}
        shadowOpacity={0.3}
        shadowRadius={6}
        style={{ elevation: 4 } as any}
        pressStyle={{ scale: 0.92, opacity: 0.9 }}
      >
        <Plus size={24} color="white" />
      </View>

      {/* Item 3: Friends */}
      <TabBarItem
        label={t('friends.title', 'Friends')}
        active={currentRouteName === 'friends/index'}
        icon={<Users size={20} />}
        onPress={() => router.push('/tabs/friends')}
      />

      {/* Item 4: Profile */}
      <TabBarItem
        label={t('profile.title', 'Profile')}
        active={currentRouteName === 'profile'}
        icon={<User size={20} />}
        onPress={() => router.push('/tabs/profile')}
      />
    </View>
  );
}

function TabBarItem({ label, active, icon, onPress }: { label: string; active: boolean; icon: React.ReactElement; onPress: () => void }) {
  return (
    <YStack
      f={1}
      h="100%"
      ai="center"
      jc="center"
      gap="$1"
      onPress={onPress}
      pressStyle={{ opacity: 0.7 }}
    >
      <View>
        {React.cloneElement(icon, { color: active ? '$primary' : '$gray11' } as any)}
      </View>
      <Text fontSize={10} fontWeight={active ? '700' : '500'} color={active ? '$primary' : '$gray11'}>
        {label}
      </Text>
    </YStack>
  );
}

export default function TabLayout() {
  const { user } = useAppStore();
  const { t } = useTranslation();
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const currentTheme = useAppStore((s) => s.theme);
  const systemScheme = useColorScheme();
  const isDark =
    currentTheme === 'system'
      ? systemScheme === 'dark'
      : currentTheme === 'dark';

  const router = useRouter();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const poll = () => useNotificationsStore.getState().fetchUnreadCount();
    poll();
    const interval = setInterval(poll, 20_000);
    return () => clearInterval(interval);
  }, []);

  const homeTitle = user?.username || t('navigation.tabs.home', 'Home');
  const homeLabel = t('navigation.tabs.home', 'Home');
  const settingsTitle = t('navigation.tabs.settings', 'Settings');
  const profileTitle = t('profile.title', 'Profile');
  const groupsTitle = t('navigation.groups.title', 'Groups');
  const newGroupTitle = t('navigation.groups.create', 'New group');
  const groupDetailsTitle = t('navigation.groups.details', 'Group');
  const scanInviteTitle = t('navigation.scanInvite', 'Scan Invite');
  const groupQrTitle = t('navigation.groupQr', 'Group QR');
  const scanReceiptTitle = t('navigation.scanReceipt', 'Scan Receipt');
  const participantsTitle = t('navigation.participants', 'Participants');
  const itemsSplitTitle = t('navigation.itemsSplit', 'Items Split');
  const finishTitle = t('navigation.finish', 'Finish');
  const historyTitle = t('navigation.history', 'Recent bills');
  const historyDetailsTitle = t('navigation.historyDetails', 'Bill details');

  return (
    <>
      <Tabs
        tabBar={(props) => <CustomTabBar {...props} onAddPress={() => setCreateModalOpen(true)} />}
        screenOptions={{
          header: (props) => <GlobalTabsHeader {...props} />,
          tabBarStyle: { display: 'none' },
        }}
      >
        {/* Home & Settings tabs (hidden from bar) */}
        <Tabs.Screen
          name="index"
          options={{
            href: null,
            title: homeTitle,
            tabBarLabel: homeLabel,
            tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            href: null,
            title: settingsTitle,
            tabBarLabel: settingsTitle,
            tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
          }}
        />

        <Tabs.Screen
          name="profile"
          options={{
            href: null,
            title: profileTitle,
          }}
        />

        <Tabs.Screen name="profile-details" options={{ href: null, title: t('profile.details', 'Profile Details') }} />

        {/* Friends stack (hidden) */}
        <Tabs.Screen name="friends/index" options={{ href: null, title: t('friends.title', 'Friends') }} />
        <Tabs.Screen name="friends/search" options={{ href: null, title: t('friends.searchTab', 'Search') }} />
        <Tabs.Screen name="friends/requests" options={{ href: null, title: t('friends.requests', 'Requests') }} />

        {/* HIDDEN: Groups */}
        <Tabs.Screen name="groups/index"   options={{ href: null, title: groupsTitle }} />
        <Tabs.Screen name="groups/create"  options={{ href: null, title: newGroupTitle }} />
        <Tabs.Screen name="groups/[groupId]" options={{ href: null, title: groupDetailsTitle }} />

        <Tabs.Screen name="scan-invite" options={{ href: null, title: scanInviteTitle }} />
        <Tabs.Screen name="groups/invite" options={{ href: null, title: groupQrTitle }} />

        <Tabs.Screen name="scan-receipt" options={{ href: null, title: scanReceiptTitle }} />
        <Tabs.Screen name="manual-receipt" options={{ href: null, title: t('navigation.manualReceipt', 'Manual Entry') }} />
        <Tabs.Screen name="notifications" options={{ href: null, title: t('navigation.notifications', 'Notifications') }} />
        <Tabs.Screen name="features-guide" options={{ href: null, title: t('billFeatures.guide.title', 'How to use') }} />
        <Tabs.Screen name="sessions/participants" options={{ href: null, title: participantsTitle }} />
        <Tabs.Screen name="sessions/items-split" options={{ href: null, title: itemsSplitTitle }} />
        <Tabs.Screen name="sessions/finish" options={{ href: null, title: finishTitle }} />
        <Tabs.Screen name="sessions/history/index" options={{ href: null, title: historyTitle }} />
        <Tabs.Screen name="sessions/history/[historyId]" options={{ href: null, title: historyDetailsTitle }} />

      </Tabs>

      {/* Central Modal for Manual input & Scan */}
      <Modal
        visible={createModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setCreateModalOpen(false)}
      >
        <Pressable
          style={{ flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end' }}
          onPress={() => setCreateModalOpen(false)}
        >
          <Theme name={isDark ? 'dark' : 'light'}>
            <Pressable
              style={{
                backgroundColor: isDark ? '#161616' : '#ffffff',
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                padding: 24,
                paddingBottom: insets.bottom > 0 ? insets.bottom + 16 : 24,
              }}
              onPress={(e) => e.stopPropagation()}
            >
              <View width={40} height={4} borderRadius={2} backgroundColor="$gray6" alignSelf="center" marginBottom="$4" />
              
              <Text fontSize={18} fontWeight="700" color="$color" textAlign="center" marginBottom="$5">
                {t('common.addReceipt', 'New Bill')}
              </Text>

              <YStack gap="$3">
                {/* Option 1: Scan Receipt */}
                <XStack
                  onPress={() => {
                    setCreateModalOpen(false);
                    router.push('/tabs/scan-receipt');
                  }}
                  backgroundColor="$primary"
                  height={52}
                  borderRadius={12}
                  alignItems="center"
                  paddingHorizontal="$4"
                  gap="$3"
                  pressStyle={{ opacity: 0.9 }}
                >
                  <ScanLine size={22} color="white" />
                  <Text fontSize={16} fontWeight="600" color="white">
                    {t('home.scan.cta', 'Scan receipt')}
                  </Text>
                </XStack>

                {/* Option 2: Manual Entry */}
                <XStack
                  onPress={() => {
                    setCreateModalOpen(false);
                    router.push('/tabs/manual-receipt');
                  }}
                  borderWidth={1}
                  borderColor="$gray6"
                  backgroundColor="$background"
                  height={52}
                  borderRadius={12}
                  alignItems="center"
                  paddingHorizontal="$4"
                  gap="$3"
                  pressStyle={{ backgroundColor: '$gray2' }}
                >
                  <PenLine size={22} color="$color" />
                  <Text fontSize={16} fontWeight="600" color="$color">
                    {t('home.manual.cta', 'Manual entry')}
                  </Text>
                </XStack>

                {/* Cancel Button */}
                <Button
                  marginTop="$2"
                  height={48}
                  borderRadius={12}
                  backgroundColor="$gray3"
                  pressStyle={{ backgroundColor: '$gray4' }}
                  onPress={() => setCreateModalOpen(false)}
                >
                  <Text fontSize={15} fontWeight="600" color="$gray11">
                    {t('common.cancel', 'Cancel')}
                  </Text>
                </Button>
              </YStack>
            </Pressable>
          </Theme>
        </Pressable>
      </Modal>
    </>
  );
}
