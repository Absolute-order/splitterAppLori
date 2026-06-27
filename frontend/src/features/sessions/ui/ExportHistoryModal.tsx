import React, { useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { Alert, Pressable, Modal, useColorScheme, Animated } from 'react-native';
import { YStack, XStack, Text, Button, Spinner } from 'tamagui';
import { FileDown, X } from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';

import type { SessionHistoryEntry } from '@/features/sessions/api/history.api';
import { useAppStore } from '@/shared/lib/stores/app-store';
import {
  EXPORT_FORMATS,
  exportHistoryToFile,
  type HistoryExportFormat,
  type HistoryExportLabels,
} from '@/features/sessions/lib/export-history';

type Props = {
  visible: boolean;
  onClose: () => void;
  entries: SessionHistoryEntry[];
  scope: 'single' | 'all';
};

export function ExportHistoryModal({ visible, onClose, entries, scope }: Props) {
  const { t, i18n } = useTranslation();
  const [busyFormat, setBusyFormat] = useState<HistoryExportFormat | null>(null);

  const currentTheme = useAppStore((s) => s.theme);
  const systemScheme = useColorScheme();
  const isDark =
    currentTheme === 'system' ? systemScheme === 'dark' : currentTheme === 'dark';

  const slideAnim = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (visible) {
      slideAnim.setValue(400);
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 9,
      }).start();
    }
  }, [visible, slideAnim]);

  const labels = useMemo<HistoryExportLabels>(
    () => ({
      appTitle: t('billFeatures.export.title', 'Bill history export'),
      exportedAt: t('billFeatures.export.exportedAt', 'Exported at'),
      bill: t('billFeatures.export.bill', 'Bill'),
      date: t('billFeatures.export.date', 'Date'),
      total: t('billFeatures.export.total', 'Total'),
      participants: t('billFeatures.export.participants', 'Participants'),
      participant: t('billFeatures.export.participant', 'Participant'),
      amount: t('billFeatures.export.amount', 'Amount'),
      status: t('billFeatures.export.status', 'Status'),
      paid: t('billFeatures.share.paid', 'paid'),
      unpaid: t('billFeatures.share.unpaid', 'unpaid'),
      items: t('billFeatures.export.items', 'Items'),
      itemName: t('billFeatures.export.itemName', 'Item'),
      itemShare: t('billFeatures.export.itemShare', 'Share'),
      footer: t('billFeatures.export.footer', 'Exported from Receipt Splitter'),
      fileNamePrefix: t('billFeatures.export.filePrefix', 'receipt-splitter'),
    }),
    [t]
  );

  const title =
    scope === 'single'
      ? t('billFeatures.export.titleSingle', 'Export this bill')
      : t('billFeatures.export.titleAll', 'Export all bills');

  const onExport = useCallback(
    async (format: HistoryExportFormat) => {
      if (!entries.length || busyFormat) return;
      setBusyFormat(format);
      try {
        await exportHistoryToFile(format, entries, labels, { locale: i18n.language });
        onClose();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : t('billFeatures.export.error', 'Could not export file');
        Alert.alert(t('common.error', 'Error'), message);
      } finally {
        setBusyFormat(null);
      }
    },
    [entries, labels, i18n.language, busyFormat, onClose, t]
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.4)',
          justifyContent: 'flex-end',
          alignItems: 'center',
        }}
        onPress={onClose}
      >
        <Animated.View
          style={{
            width: '100%',
            maxWidth: 420,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              backgroundColor: isDark ? '#161616' : '#ffffff',
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              borderWidth: 1,
              borderColor: 'rgba(128, 128, 128, 0.1)',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -4 },
              shadowOpacity: 0.15,
              shadowRadius: 10,
              elevation: 16,
            }}
          >
          <YStack
            w="100%"
            px="$4"
            pt="$4"
            pb="$6"
            gap="$3"
          >
            <XStack ai="center" jc="space-between">
              <YStack f={1} pr="$2">
                <Text fontSize={18} fontWeight="700" color="$color">
                  {title}
                </Text>
                <Text fontSize={12} color="$gray10" mt="$1">
                  {t('billFeatures.export.hint', 'Choose a format and send via mail, chat, or cloud.')}
                </Text>
              </YStack>
              <Button unstyled circular p="$2" onPress={onClose} aria-label="Close">
                <X size={20} color="$gray11" />
              </Button>
            </XStack>

            <YStack gap="$2">
              {EXPORT_FORMATS.map((format) => {
                const busy = busyFormat === format.id;
                return (
                  <Button
                    key={format.id}
                    unstyled
                    h={56}
                    borderRadius={12}
                    borderWidth={1}
                    borderColor="$gray6"
                    bg="$backgroundPress"
                    px="$3"
                    onPress={() => onExport(format.id)}
                    disabled={Boolean(busyFormat)}
                    opacity={busyFormat && !busy ? 0.5 : 1}
                    pressStyle={{ opacity: 0.9 }}
                  >
                    <XStack ai="center" gap="$3" w="100%">
                      <YStack
                        w={36}
                        h={36}
                        br={8}
                        bg="rgba(46,204,113,0.12)"
                        ai="center"
                        jc="center"
                      >
                        {busy ? (
                          <Spinner size="small" color="$primary" />
                        ) : (
                          <FileDown size={18} color="$primary" />
                        )}
                      </YStack>
                      <YStack f={1}>
                        <XStack ai="center" gap="$2">
                          <Text fontSize={15} fontWeight="700" color="$color">
                            {t(format.labelKey)}
                          </Text>
                          <Text fontSize={11} color="$gray9">
                            {format.extension}
                          </Text>
                        </XStack>
                        <Text fontSize={12} color="$gray10" numberOfLines={2}>
                          {t(format.descKey)}
                        </Text>
                      </YStack>
                    </XStack>
                  </Button>
                );
              })}
            </YStack>
          </YStack>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
  );
}
