import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Dimensions } from 'react-native';
import { YStack, XStack, Text, View, ScrollView, Button, Spinner } from 'tamagui';
import {
  ScanLine,
  PenLine,
  Users,
  Receipt,
  TrendingUp,
  Clock,
  BarChart3,
  Activity,
  ChevronRight,
  Zap,
} from '@tamagui/lucide-icons';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useAppStore } from '@/shared/lib/stores/app-store';
import { useSessionsHistoryStore } from '@/features/sessions/model/history.store';
import {
  computeHomeStats,
  type PeriodMode,
  type HomeStats,
} from '@/features/sessions/lib/analytics.service';
import { formatCurrencyAmount, DEFAULT_CURRENCY } from '@/shared/lib/currency';
import Svg, {
  Rect,
  Circle as SvgCircle,
  Path,
  Text as SvgText,
  G,
} from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/* ------------------------------------------------------------------ */
/*  Helpers & Config                                                  */
/* ------------------------------------------------------------------ */

const CHART_WIDTH = Dimensions.get('window').width - 48;

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number,
) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad),
  };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number,
) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
  return [
    'M',
    start.x,
    start.y,
    'A',
    r,
    r,
    0,
    largeArc,
    0,
    end.x,
    end.y,
  ].join(' ');
}

/* ------------------------------------------------------------------ */
/*  Stat Card                                                          */
/* ------------------------------------------------------------------ */

interface StatCardProps {
  icon: React.ReactNode;
  iconBg: string;
  value: string;
  label: string;
}

function StatCard({ icon, iconBg, value, label }: StatCardProps) {
  return (
    <YStack
      f={1}
      minWidth={150}
      p="$3"
      borderRadius={12}
      borderWidth={1}
      borderColor="$gray5"
      bg="$backgroundPress"
      gap="$1.5"
    >
      <View
        w={32}
        h={32}
        borderRadius={16}
        ai="center"
        jc="center"
        bg={iconBg}
      >
        {icon}
      </View>
      <Text fontSize={18} fontWeight="800" color="$color" numberOfLines={1}>
        {value}
      </Text>
      <Text fontSize={11} color="$gray10" numberOfLines={2}>
        {label}
      </Text>
    </YStack>
  );
}

/* ------------------------------------------------------------------ */
/*  Chart Card wrapper                                                 */
/* ------------------------------------------------------------------ */

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <YStack
      borderRadius={12}
      borderWidth={1}
      borderColor="$gray5"
      bg="$backgroundPress"
      p="$3"
      gap="$3"
    >
      <Text fontSize={14} fontWeight="700" color="$color">
        {title}
      </Text>
      {children}
    </YStack>
  );
}

/* ------------------------------------------------------------------ */
/*  Line Chart                                                         */
/* ------------------------------------------------------------------ */

function LineChart({ data }: { data: { label: string; value: number }[] }) {
  const { t } = useTranslation();
  const HEIGHT = 140;
  const PADDING_LEFT = 16;
  const PADDING_RIGHT = 16;
  const PADDING_TOP = 16;
  const PADDING_BOTTOM = 24;
  const w = CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT;
  const h = HEIGHT - PADDING_TOP - PADDING_BOTTOM;

  const totalPoints = data.length;
  if (!totalPoints) {
    return (
      <YStack h={HEIGHT} ai="center" jc="center">
        <Text color="$gray10" fontSize={13}>
          {t('home.noData', 'No data')}
        </Text>
      </YStack>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const stepX = totalPoints > 1 ? w / (totalPoints - 1) : w / 2;

  const points = data.map((d, i) => ({
    x: PADDING_LEFT + i * stepX,
    y: PADDING_TOP + h - (d.value / maxVal) * h,
  }));

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  const areaPath =
    linePath +
    ` L ${points[points.length - 1].x} ${PADDING_TOP + h} L ${points[0].x} ${PADDING_TOP + h} Z`;

  return (
    <Svg width={CHART_WIDTH} height={HEIGHT}>
      <Path d={areaPath} fill="#2ECC71" fillOpacity={0.1} />
      <Path
        d={linePath}
        stroke="#2ECC71"
        strokeWidth={2}
        fill="none"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.map((p, i) => (
        <SvgCircle
          key={i}
          cx={p.x}
          cy={p.y}
          r={3.5}
          fill="#2ECC71"
          stroke="#fff"
          strokeWidth={1.5}
        />
      ))}
      {data.map((d, i) => (
        <SvgText
          key={`label-${i}`}
          x={PADDING_LEFT + i * stepX}
          y={HEIGHT - 4}
          fontSize={9}
          fill="#999"
          textAnchor="middle"
        >
          {d.label}
        </SvgText>
      ))}
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Pie / Donut Chart                                                  */
/* ------------------------------------------------------------------ */

function PieChart({ ocr, manual }: { ocr: number; manual: number }) {
  const { t } = useTranslation();
  const SIZE = 110;
  const CX = SIZE / 2;
  const CY = SIZE / 2;
  const R = 40;
  const STROKE = 12;
  const total = ocr + manual;

  if (total === 0) {
    return (
      <YStack ai="center" jc="center" gap="$2" py="$2">
        <Svg width={SIZE} height={SIZE}>
          <SvgCircle
            cx={CX}
            cy={CY}
            r={R}
            stroke="#555"
            strokeWidth={STROKE}
            fill="none"
            strokeOpacity={0.2}
          />
          <SvgText
            x={CX}
            y={CY + 4}
            fontSize={12}
            fill="#999"
            textAnchor="middle"
          >
            0
          </SvgText>
        </Svg>
        <Text color="$gray10" fontSize={12}>
          {t('home.noData', 'No data')}
        </Text>
      </YStack>
    );
  }

  const ocrAngle = (ocr / total) * 360;
  const ocrArc = describeArc(CX, CY, R, 0, Math.min(ocrAngle, 359.99));
  const manualArc = describeArc(
    CX,
    CY,
    R,
    ocrAngle,
    Math.min(ocrAngle + (manual / total) * 360, 359.99),
  );

  const ocrPct = Math.round((ocr / total) * 100);
  const manualPct = 100 - ocrPct;

  return (
    <XStack ai="center" jc="space-around" py="$1">
      <Svg width={SIZE} height={SIZE}>
        <Path
          d={ocrArc}
          stroke="#2ECC71"
          strokeWidth={STROKE}
          fill="none"
          strokeLinecap="round"
        />
        {manual > 0 && (
          <Path
            d={manualArc}
            stroke="#FF9800"
            strokeWidth={STROKE}
            fill="none"
            strokeLinecap="round"
          />
        )}
        <SvgText
          x={CX}
          y={CY + 4}
          fontSize={14}
          fontWeight="bold"
          fill="#888"
          textAnchor="middle"
        >
          {total}
        </SvgText>
      </Svg>

      <YStack gap="$2" jc="center">
        <XStack ai="center" gap="$2">
          <View w={8} h={8} borderRadius={4} bg="#2ECC71" />
          <Text fontSize={12} color="$color">
            {t('home.billSourcesChart.ocrPct', 'OCR: {{pct}}% ({{count}})', { pct: ocrPct, count: ocr })}
          </Text>
        </XStack>
        <XStack ai="center" gap="$2">
          <View w={8} h={8} borderRadius={4} bg="#FF9800" />
          <Text fontSize={12} color="$color">
            {t('home.billSourcesChart.manualPct', 'Manual: {{pct}}% ({{count}})', { pct: manualPct, count: manual })}
          </Text>
        </XStack>
      </YStack>
    </XStack>
  );
}

/* ------------------------------------------------------------------ */
/*  Bar Chart                                                          */
/* ------------------------------------------------------------------ */

function BarChartComponent({
  data,
}: {
  data: { label: string; value: number }[];
}) {
  const { t } = useTranslation();
  const HEIGHT = 140;
  const PADDING_TOP = 12;
  const PADDING_BOTTOM = 24;
  const PADDING_H = 16;
  const chartH = HEIGHT - PADDING_TOP - PADDING_BOTTOM;

  if (!data.length) {
    return (
      <YStack h={HEIGHT} ai="center" jc="center">
        <Text color="$gray10" fontSize={13}>
          {t('home.noData', 'No data')}
        </Text>
      </YStack>
    );
  }

  const maxVal = Math.max(...data.map((d) => d.value), 1);
  const barCount = data.length;
  const totalW = CHART_WIDTH - PADDING_H * 2;
  const gap = 8;
  const barW = Math.min(
    (totalW - gap * (barCount - 1)) / barCount,
    36,
  );
  const actualTotalW = barCount * barW + (barCount - 1) * gap;
  const offsetX = PADDING_H + (totalW - actualTotalW) / 2;

  return (
    <Svg width={CHART_WIDTH} height={HEIGHT}>
      {data.map((d, i) => {
        const barH = (d.value / maxVal) * chartH;
        const x = offsetX + i * (barW + gap);
        const y = PADDING_TOP + chartH - barH;
        return (
          <G key={i}>
            <Rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx={3}
              ry={3}
              fill="#2ECC71"
              fillOpacity={0.8}
            />
            <SvgText
              key={`label-${i}`}
              x={x + barW / 2}
              y={HEIGHT - 4}
              fontSize={8.5}
              fill="#999"
              textAnchor="middle"
            >
              {d.label}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Home Screen                                                        */
/* ------------------------------------------------------------------ */

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const username = useAppStore((s) => s.user?.username);
  const preferredCurrency = useAppStore((s) => s.currency || DEFAULT_CURRENCY);
  const { sessions, loading, initialized, fetchHistory, refreshIfStale } =
    useSessionsHistoryStore();

  const [period, setPeriod] = useState<PeriodMode>('week');

  // Load history on mount if not loaded
  useEffect(() => {
    if (!initialized) {
      fetchHistory(50, true);
    }
  }, [initialized, fetchHistory]);

  // Refresh history when page gets focus
  useFocusEffect(
    useCallback(() => {
      refreshIfStale(5000, 50, true).catch(() => {});
    }, [refreshIfStale])
  );

  const stats: HomeStats = useMemo(
    () => computeHomeStats(sessions, period, i18n.language),
    [sessions, period, i18n.language],
  );

  const greeting = useMemo(() => {
    return username
      ? `${t('home.greetingWithName', 'Hello')}, ${username}`
      : t('home.greetingWelcome', 'Welcome!');
  }, [username, t]);

  const periodDescription = useMemo(() => {
    if (period === 'day') return t('home.periodDesc.day', 'Today');
    if (period === 'week') return t('home.periodDesc.week', 'Last 7 days');
    return t('home.periodDesc.month', 'Current month');
  }, [period, t]);

  const formatTimeSaved = (minutes: number) => {
    if (minutes <= 0) return t('home.time.noTime', '0 min');
    const hrs = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);

    if (i18n.language === 'uz') {
      if (hrs > 0) {
        return mins > 0 ? `${hrs} soat ${mins} daqiqa` : `${hrs} soat`;
      }
      return `${minutes} daqiqa`;
    }
    if (i18n.language === 'ja') {
      if (hrs > 0) {
        return mins > 0 ? `${hrs}時間${mins}分` : `${hrs}時間`;
      }
      return `${minutes}分`;
    }
    // Default (English and fallback)
    if (hrs > 0) {
      return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
    }
    return `${minutes}m`;
  };

  const formatCreationTime = (seconds: number) => {
    if (i18n.language === 'uz') {
      return `${seconds} soniya`;
    }
    if (i18n.language === 'ja') {
      return `${seconds}秒`;
    }
    return `${seconds}s`;
  };

  const getActivityText = useCallback((item: any) => {
    if (item.type === 'ocr_imported') {
      return t('home.activity.ocrImported', 'Imported bill "{{name}}"', { name: item.targetName });
    }
    if (item.type === 'manual_created') {
      return t('home.activity.manualCreated', 'Created bill "{{name}}"', { name: item.targetName });
    }
    if (item.type === 'friend_added') {
      return t('home.activity.friendAdded', 'Added friend {{name}}', { name: item.targetName });
    }
    return '';
  }, [t]);

  const totalBills = stats.totalBills ?? 0;
  const totalAmount = stats.totalAmount ?? 0;
  const avgParticipants = stats.avgParticipants ?? 0;
  const ocrRate = stats.ocrRate ?? 0;
  const billsPerDay = stats.billsPerDay ?? [];
  const dailyAmounts = stats.dailyAmounts ?? [];
  const ocrCount = stats.ocrCount ?? 0;
  const manualCount = stats.manualCount ?? 0;
  const uniqueParticipants = stats.uniqueParticipants ?? 0;
  const maxParticipantsInOne = stats.maxParticipantsInOne ?? 0;
  const lastActivity = stats.lastActivity ?? [];
  const avgCreationTimeSec = stats.avgCreationTimeSec ?? 37;
  const timeSavedMin = stats.timeSavedMin ?? 0;

  const periods: { key: PeriodMode; label: string }[] = [
    { key: 'day', label: t('home.periodDay', 'Day') },
    { key: 'week', label: t('home.periodWeek', 'Week') },
    { key: 'month', label: t('home.periodMonth', 'Month') },
  ];

  const analyticsRows = [
    {
      icon: <Receipt size={16} color="#2ECC71" />,
      label: t('home.analyticsTable.totalBills', 'Bills Created'),
      value: String(totalBills),
    },
    {
      icon: <ScanLine size={16} color="#3498DB" />,
      label: t('home.analyticsTable.ocrCount', 'Recognized OCR'),
      value: String(ocrCount),
    },
    {
      icon: <PenLine size={16} color="#FF9800" />,
      label: t('home.analyticsTable.manualCount', 'Created Manually'),
      value: String(manualCount),
    },
    {
      icon: <Users size={16} color="#9B59B6" />,
      label: t('home.analyticsTable.uniqueParticipants', 'Total Participants'),
      value: String(uniqueParticipants),
    },
    {
      icon: <Users size={16} color="#1ABC9C" />,
      label: t('home.analyticsTable.avgParticipants', 'Avg Participants'),
      value: avgParticipants.toFixed(1),
    },
    {
      icon: <Users size={16} color="#E74C3C" />,
      label: t('home.analyticsTable.maxParticipants', 'Max in One Bill'),
      value: String(maxParticipantsInOne),
    },
  ];

  if (!initialized && loading) {
    return (
      <YStack f={1} ai="center" jc="center" bg="$background">
        <Spinner size="large" color="$primary" />
        <Text mt="$2" color="$gray10">{t('home.loadingStats', 'Loading statistics...')}</Text>
      </YStack>
    );
  }

  return (
    <ScrollView
      f={1}
      bg="$background"
      contentContainerStyle={{ paddingBottom: 140 }}
      showsVerticalScrollIndicator={false}
    >
      {/* ── 1. GREETING HEADER ─────────────────────────────── */}


      {/* ── 2. PERIOD SWITCHER ─────────────────────────────── */}
      <YStack px="$4" pt="$2" pb="$2" gap="$2">
        <XStack gap="$2">
          {periods.map((p) => {
            const active = period === p.key;
            return (
              <View
                key={p.key}
                h={36}
                px="$4"
                borderRadius={18}
                ai="center"
                jc="center"
                bg={active ? '$primary' : '$backgroundPress'}
                pressStyle={{ opacity: 0.8 }}
                onPress={() => setPeriod(p.key)}
              >
                <Text
                  fontSize={13}
                  fontWeight={active ? '700' : '500'}
                  color={active ? 'white' : '$gray11'}
                >
                  {p.label}
                </Text>
              </View>
            );
          })}
        </XStack>
        <Text fontSize={14} fontWeight="600" color="$primary" px="$1">
          {periodDescription}
        </Text>
      </YStack>

      {/* ── 3. STAT CARDS ──────────────────────────────────── */}
      <XStack flexWrap="wrap" gap="$3" px="$4" pt="$2">
        <StatCard
          icon={<TrendingUp size={16} color="#3498DB" />}
          iconBg="rgba(52,152,219,0.15)"
          value={formatCurrencyAmount(totalAmount, preferredCurrency)}
          label={t('home.totalAmount', 'Total Amount')}
        />
        <StatCard
          icon={<Users size={16} color="#9B59B6" />}
          iconBg="rgba(155,89,182,0.15)"
          value={avgParticipants.toFixed(1)}
          label={t('home.avgParticipants', 'Avg Participants')}
        />
        <StatCard
          icon={<ScanLine size={16} color="#E67E22" />}
          iconBg="rgba(230,126,34,0.15)"
          value={`${ocrRate}%`}
          label={t('home.ocrRate', 'OCR Rate')}
        />
        <StatCard
          icon={<PenLine size={16} color="#FF9800" />}
          iconBg="rgba(255,152,0,0.15)"
          value={`${100 - ocrRate}%`}
          label={t('home.manualRate', 'Manual Entry')}
        />
        <StatCard
          icon={<Clock size={16} color="#1ABC9C" />}
          iconBg="rgba(26,188,156,0.15)"
          value={formatCreationTime(avgCreationTimeSec)}
          label={t('home.avgCreationTime', 'Avg Creation Time')}
        />
        <StatCard
          icon={<Zap size={16} color="#F1C40F" />}
          iconBg="rgba(241,196,15,0.15)"
          value={formatTimeSaved(timeSavedMin)}
          label={t('home.timeSaved', 'Time Saved')}
        />
      </XStack>

      {/* ── 4. ANALYTICS TABLE ──────────────────────────────── */}
      <YStack px="$4" pt="$4" gap="$2">
        <Text fontSize={15} fontWeight="700" color="$color">
          {t('home.analytics', 'Analytics')}
        </Text>
        <YStack
          borderRadius={12}
          borderWidth={1}
          borderColor="$gray5"
          overflow="hidden"
        >
          {analyticsRows.map((row, idx) => (
            <XStack
              key={idx}
              h={44}
              ai="center"
              px="$4"
              gap="$3"
              bg={idx % 2 === 0 ? '$backgroundPress' : '$background'}
            >
              <View
                w={28}
                h={28}
                borderRadius={14}
                ai="center"
                jc="center"
                bg="rgba(46,204,113,0.1)"
              >
                {row.icon}
              </View>
              <Text f={1} fontSize={13} color="$gray11">
                {row.label}
              </Text>
              <Text fontSize={14} fontWeight="700" color="$color">
                {row.value}
              </Text>
            </XStack>
          ))}
        </YStack>
      </YStack>

      {/* ── 5. CHARTS ───────────────────────────────────────── */}
      <YStack px="$4" pt="$4" gap="$3">
        <ChartCard title={t('home.dailySpending', 'Spending Over Time')}>
          <BarChartComponent data={dailyAmounts} />
        </ChartCard>
      </YStack>

      {/* ── 6. RECENT ACTIVITY ─────────────────────────────── */}
      <YStack px="$4" pt="$4" gap="$2">
        <Text fontSize={15} fontWeight="700" color="$color">
          {t('home.recentActivity', 'Recent Activity')}
        </Text>

        {lastActivity.length === 0 ? (
          <YStack
            py="$4"
            ai="center"
            jc="center"
            borderRadius={12}
            borderWidth={1}
            borderColor="$gray5"
            bg="$backgroundPress"
          >
            <Text color="$gray10" fontSize={13}>
              {t('home.noRecentActivity', 'No recent activity')}
            </Text>
          </YStack>
        ) : (
          <YStack
            borderRadius={12}
            borderWidth={1}
            borderColor="$gray5"
            overflow="hidden"
          >
            {lastActivity.map((item, idx) => (
              <XStack
                key={idx}
                h={52}
                ai="center"
                px="$3"
                gap="$3"
                bg={idx % 2 === 0 ? '$backgroundPress' : '$background'}
              >
                <View
                  w={32}
                  h={32}
                  borderRadius={16}
                  ai="center"
                  jc="center"
                  bg="rgba(46,204,113,0.12)"
                >
                  <Activity size={15} color="#2ECC71" />
                </View>
                <YStack f={1} gap="$0.5">
                  <Text
                    fontSize={13}
                    fontWeight="600"
                    color="$color"
                    numberOfLines={1}
                  >
                    {getActivityText(item)}
                  </Text>
                  <Text fontSize={11} color="$gray10">
                    {item.date}
                  </Text>
                </YStack>
                {item.amount > 0 && (
                  <Text fontSize={13} fontWeight="700" color="$color">
                    {formatCurrencyAmount(item.amount, preferredCurrency)}
                  </Text>
                )}
              </XStack>
            ))}
          </YStack>
        )}
      </YStack>
    </ScrollView>
  );
}
