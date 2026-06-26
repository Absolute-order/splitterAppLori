import React, { useEffect, useState, useMemo } from 'react';
import { YStack, XStack, Paragraph, Input, ScrollView, Spinner, Separator, Text, Button } from 'tamagui';
import { useRouter } from 'expo-router';
import { Search, X, Users, Mail } from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';
import { useFriendsStore } from '@/features/friends/model/friends.store';
import { FriendListItem } from '@/features/friends/ui/FriendListItem';
import { FriendRequestActions } from '@/features/friends/ui/FriendRequestActions';
import UserAvatar from '@/shared/ui/UserAvatar';
import Fab from '@/shared/ui/Fab';
import { ScreenContainer } from '@/shared/ui/ScreenContainer';
import { useAppStore } from '@/shared/lib/stores/app-store';

export default function FriendsScreen() {
  const { friends, requestsRaw, loading, error, fetchAll, search, send } = useFriendsStore();
  const router = useRouter();
  const { t } = useTranslation();
  const myUniqueId = useAppStore((s) => s.user?.uniqueId);
  const [searchQuery, setSearchQuery] = useState('');

  // Global search state
  const [globalResults, setGlobalResults] = useState<any[]>([]);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [globalSearchError, setGlobalSearchError] = useState<string | null>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Debounced global search
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      setGlobalResults([]);
      setGlobalLoading(false);
      setGlobalSearchError(null);
      return;
    }

    setGlobalLoading(true);
    setGlobalSearchError(null);

    const delayDebounceFn = setTimeout(async () => {
      try {
        const res = await search(trimmed);
        setGlobalResults(res || []);
      } catch (err: any) {
        setGlobalSearchError(err?.message || t('friends.search.error', 'Search failed'));
      } finally {
        setGlobalLoading(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, search, t]);

  // Notice auto-dismiss
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  const handleAddFriend = async (uniqueId: string) => {
    setSendingId(uniqueId);
    try {
      await send(uniqueId);
      setNotice({
        text: t('friends.search.inviteSent', { target: uniqueId }),
        type: 'success',
      });
    } catch (err: any) {
      setNotice({
        text: err?.message || t('friends.search.inviteFailed', 'Could not send invite'),
        type: 'error',
      });
    } finally {
      setSendingId(null);
    }
  };

  const incoming = useMemo(() => requestsRaw?.incoming ?? [], [requestsRaw]);
  const outgoing = useMemo(() => requestsRaw?.outgoing ?? [], [requestsRaw]);

  const outgoingSet = useMemo(() => {
    const set = new Set<string>();
    outgoing.forEach((request: any) => {
      const uid = request?.to?.uniqueId ?? request?.toUniqueId ?? request?.uniqueId;
      if (uid) set.add(uid);
    });
    return set;
  }, [outgoing]);

  const incomingSet = useMemo(() => {
    const set = new Set<string>();
    incoming.forEach((request: any) => {
      const uid = request?.from?.uniqueId ?? request?.fromUniqueId ?? request?.uniqueId;
      if (uid) set.add(uid);
    });
    return set;
  }, [incoming]);

  const friendsSet = useMemo(() => {
    const set = new Set<string>();
    friends.forEach((friend: any) => {
      const uid = friend?.user?.uniqueId ?? friend?.uniqueId;
      if (uid) set.add(uid);
    });
    return set;
  }, [friends]);

  const filteredFriends = useMemo(() => {
    if (!searchQuery) {
      return friends;
    }
    const lowerCaseQuery = searchQuery.toLowerCase();
    return friends.filter(friend => {
      const title = (
        friend?.user?.displayName || friend?.user?.username || ''
      ).toLowerCase();
      const uniqueId = (friend?.user?.uniqueId || friend?.uniqueId || '').toLowerCase();
      return title.includes(lowerCaseQuery) || uniqueId.includes(lowerCaseQuery);
    });
  }, [friends, searchQuery]);

  if (loading && friends.length === 0 && incoming.length === 0) {
    return (
      <ScreenContainer>
        <Spinner size="large" color="$gray10" />
      </ScreenContainer>
    );
  }

  const unknownUser = t('friends.common.unknownUser', 'Unknown user');

  return (
    <YStack f={1} bg="$background">
      <YStack f={1} p="$4">
        {/* Notice feedback */}
        {notice && (
          <YStack
            p="$3"
            mb="$3"
            borderRadius={10}
            backgroundColor={notice.type === 'success' ? 'rgba(46,204,113,0.1)' : '$red3'}
            borderWidth={1}
            borderColor={notice.type === 'success' ? '$green8' : '$red8'}
          >
            <Text
              fontSize={14}
              fontWeight="600"
              color={notice.type === 'success' ? '$primary' : '$red10'}
              textAlign="center"
            >
              {notice.text}
            </Text>
          </YStack>
        )}

        {/* Beautiful Search Bar */}
        <XStack position="relative" ai="center" mb="$4">
          <Input
            placeholder={t('friends.searchPlaceholder', 'Search friends...')}
            value={searchQuery}
            onChangeText={setSearchQuery}
            f={1}
            h={44}
            pl={40}
            pr={40}
            borderRadius={12}
            bg="$backgroundPress"
            borderWidth={1}
            borderColor="$gray5"
            focusStyle={{ borderColor: '$primary' }}
          />
          <Search
            size={18}
            color="$gray9"
            position="absolute"
            left={14}
            pointerEvents="none"
          />
          {searchQuery.length > 0 && (
            <XStack
              position="absolute"
              right={14}
              onPress={() => setSearchQuery('')}
              hitSlop={10}
              pressStyle={{ opacity: 0.6 }}
            >
              <X size={18} color="$gray9" />
            </XStack>
          )}
        </XStack>

        {error && <Paragraph col="$red10" p="$4">{error}</Paragraph>}

        <ScrollView f={1} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          
          {/* Section: Incoming Requests (only if empty search or matching query) */}
          {searchQuery.length < 2 && incoming.length > 0 && myUniqueId && (
            <YStack mb="$4" gap="$2">
              <Text fontSize={15} fontWeight="700" color="$color" px="$1">
                {t('friends.incomingSection', 'Incoming requests')}
              </Text>
              <YStack borderWidth={1} borderColor="$primary" borderRadius={8} overflow="hidden">
                {incoming.map((request: any, index: number) => {
                  const name =
                    request.from?.displayName ||
                    request.from?.username ||
                    unknownUser;
                  const uid = request.from?.uniqueId;
                  const fromId = request.from?.id as number;
                  const avatarUrl = request.from?.avatarUrl ?? null;
                  const avatarLabel = (name || 'U').slice(0, 1).toUpperCase();

                  return (
                    <React.Fragment key={`req-${fromId}-${index}`}>
                      <XStack ai="center" jc="space-between" p="$3" bg="$backgroundPress" gap="$3">
                        <XStack ai="center" gap="$3" f={1}>
                          <UserAvatar
                            uri={avatarUrl ?? undefined}
                            label={avatarLabel}
                            size={40}
                            textSize={14}
                          />
                          <YStack f={1}>
                            <Text fontSize={16} fontWeight="600">{name}</Text>
                            {!!uid && (
                              <Text fontSize={13} color="$gray10">{uid}</Text>
                            )}
                          </YStack>
                        </XStack>
                        <FriendRequestActions
                          requesterId={fromId}
                          myUniqueId={myUniqueId}
                        />
                      </XStack>
                      {index < incoming.length - 1 && <Separator />}
                    </React.Fragment>
                  );
                })}
              </YStack>
            </YStack>
          )}

          {/* Section: My Friends */}
          {(!searchQuery || filteredFriends.length > 0) && (
            <YStack gap="$2" mb="$4">
              {searchQuery.length >= 2 && (
                <Text fontSize={15} fontWeight="700" color="$gray11" px="$1">
                  {t('friends.sections.myFriends', 'My Friends')}
                </Text>
              )}
              {filteredFriends.length > 0 ? (
                <YStack borderWidth={1} borderColor="$gray5" borderRadius={8} overflow="hidden">
                  {filteredFriends.map((f, index) => (
                    <React.Fragment key={f.user?.id ?? f.userId ?? f.uniqueId ?? index}>
                      <FriendListItem friend={f} />
                      {index < filteredFriends.length - 1 && <Separator />}
                    </React.Fragment>
                  ))}
                </YStack>
              ) : null}
            </YStack>
          )}

          {/* Section: Global Search Results */}
          {searchQuery.trim().length >= 2 && (
            <YStack gap="$2">
              <Text fontSize={15} fontWeight="700" color="$primary" px="$1">
                {t('friends.sections.findNewFriends', 'Search new friends')}
              </Text>

              {globalLoading ? (
                <XStack jc="center" ai="center" py="$4">
                  <Spinner size="large" color="$primary" />
                </XStack>
              ) : globalSearchError ? (
                <Paragraph col="$red10" px="$1">
                  {globalSearchError}
                </Paragraph>
              ) : globalResults.length === 0 ? (
                <Paragraph col="$gray10" px="$1" ta="center" py="$3">
                  {t('friends.search.notFound', 'User not found')}
                </Paragraph>
              ) : (
                <YStack borderWidth={1} borderColor="$gray5" borderRadius={8} overflow="hidden">
                  {globalResults.map((user, index) => {
                    const uid = user.uniqueId;
                    
                    // Filter out already added friends
                    if (uid && friendsSet.has(uid)) return null;

                    const title = user.displayName || user.username || uid || unknownUser;
                    const avatarUrl = user.avatarUrl ?? null;
                    const avatarLabel = (title || 'U').slice(0, 1).toUpperCase();

                    const isMe = !!uid && !!myUniqueId && uid === myUniqueId;
                    const isOutgoing = !!uid && outgoingSet.has(uid);
                    const isIncoming = !!uid && incomingSet.has(uid);

                    let actionComponent = null;
                    if (isMe) {
                      actionComponent = (
                        <Button size="$2.5" disabled backgroundColor="$gray3" color="$gray8" borderRadius={8}>
                          {t('friends.status.you', 'You')}
                        </Button>
                      );
                    } else if (isOutgoing) {
                      actionComponent = (
                        <Button size="$2.5" disabled backgroundColor="$gray3" color="$gray10" borderRadius={8}>
                          {t('friends.status.requested', 'Requested')}
                        </Button>
                      );
                    } else if (isIncoming) {
                      actionComponent = (
                        <FriendRequestActions
                          requesterId={user.id}
                          myUniqueId={myUniqueId || ''}
                        />
                      );
                    } else {
                      const isBusy = sendingId === uid;
                      actionComponent = (
                        <Button
                          size="$2.5"
                          borderRadius={10}
                          backgroundColor="$primary"
                          color="white"
                          fontWeight="600"
                          onPress={() => uid && handleAddFriend(uid)}
                          disabled={isBusy}
                          pressStyle={{ opacity: 0.8 }}
                        >
                          {isBusy ? <Spinner size="small" color="white" /> : `+ ${t('friends.status.add', 'Add')}`}
                        </Button>
                      );
                    }

                    return (
                      <React.Fragment key={`global-${uid ?? index}`}>
                        <XStack h={60} ai="center" jc="space-between" px="$4" bg="$background">
                          <XStack ai="center" gap="$3" f={1} mr="$2">
                            <UserAvatar
                              uri={avatarUrl ?? undefined}
                              label={avatarLabel}
                              size={36}
                              textSize={14}
                              backgroundColor="$gray5"
                            />
                            <YStack f={1}>
                              <Text fontSize={16} fontWeight="600" numberOfLines={1}>{title}</Text>
                              {!!uid && <Paragraph fontSize={13} color="$gray10" numberOfLines={1}>@{uid.toLowerCase()}</Paragraph>}
                            </YStack>
                          </XStack>
                          {actionComponent}
                        </XStack>
                        {index < globalResults.length - 1 && <Separator />}
                      </React.Fragment>
                    );
                  })}
                </YStack>
              )}
            </YStack>
          )}

          {/* Empty State when no friends and no search query active */}
          {friends.length === 0 && incoming.length === 0 && searchQuery.length < 2 && !loading && (
            <YStack ai="center" jc="center" p="$6" py="$8" gap="$3">
              <Users size={48} color="$gray8" />
              <Text fontSize={16} fontWeight="600" color="$gray11" ta="center">
                {t('friends.empty', 'No friends yet.')}
              </Text>
              <Text fontSize={14} color="$gray9" ta="center" px="$4">
                {t('friends.emptyHint', 'Start typing their Username or Unique ID in the search box above to find and add friends.')}
              </Text>
            </YStack>
          )}
        </ScrollView>
      </YStack>

      {/* FAB to view requests list (e.g. Outgoing requests history, pending requests) */}
      <Fab
        onPress={() => router.push('/tabs/friends/requests')}
        icon={<Mail size={22} color="white" />}
      />
    </YStack>
  );
}
