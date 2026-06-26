// src/features/sessions/lib/analytics.service.ts

import { useFriendsStore } from '@/features/friends/model/friends.store';

export type PeriodMode = 'day' | 'week' | 'month';

export interface ActivityItem {
  type: 'ocr_imported' | 'manual_created' | 'friend_added';
  targetName: string;
  date: string;
  amount: number;
}

export interface HomeStats {
  totalBills: number;
  totalAmount: number;
  avgParticipants: number;
  ocrRate: number;
  billsPerDay: { label: string; value: number }[];
  dailyAmounts: { label: string; value: number }[];
  ocrCount: number;
  manualCount: number;
  uniqueParticipants: number;
  maxParticipantsInOne: number;
  paidBills: number;
  unpaidBills: number;
  manualEntries: number;
  lastActivity: ActivityItem[];
  avgCreationTimeSec: number;
  timeSavedMin: number;
}

function isOcrSession(session: any): boolean {
  const items = session.payload?.totals?.byItem || [];
  if (items.length === 0) return false;
  return items.some((item: any) => item.itemId && !item.itemId.startsWith('m-'));
}

function isSessionPaid(session: any): boolean {
  const paymentStatus = session.payload?.paymentStatus;
  if (!paymentStatus) return false;
  const statuses = Object.values(paymentStatus) as { paid: boolean }[];
  if (statuses.length === 0) return true;
  return statuses.every((status) => status.paid);
}

function isWithinPeriod(dateStr: string | undefined, period: PeriodMode): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return false;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  if (period === 'day') {
    return date >= startOfToday;
  } else if (period === 'week') {
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return date >= sevenDaysAgo;
  } else if (period === 'month') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    return date >= startOfMonth;
  }
  return true;
}

export function computeHomeStats(
  sessions: any[],
  period: PeriodMode,
  languageCode: string = 'en'
): HomeStats {
  const periodSessions = sessions.filter((session) => {
    const dateStr = session.finalizedAt || session.createdAt || session.payload?.createdAt;
    return isWithinPeriod(dateStr, period);
  });

  const totalBills = periodSessions.length;

  let totalAmount = 0;
  let totalParticipantsCount = 0;
  let ocrCount = 0;
  let paidBills = 0;
  let unpaidBills = 0;
  let totalDuration = 0;
  let durationCount = 0;
  let totalSavedSeconds = 0;

  const uniqueParticipantsSet = new Set<string>();
  let maxParticipantsInOne = 0;

  for (const session of periodSessions) {
    const amount = session.grandTotal ?? session.payload?.totals?.grandTotal ?? 0;
    totalAmount += amount;

    const pIds = session.participantUniqueIds || [];
    pIds.forEach((id: string) => uniqueParticipantsSet.add(id));
    totalParticipantsCount += pIds.length;

    if (pIds.length > maxParticipantsInOne) {
      maxParticipantsInOne = pIds.length;
    }

    const isOcr = isOcrSession(session);
    if (isOcr) {
      ocrCount++;
    }

    if (isSessionPaid(session)) {
      paidBills++;
    } else {
      unpaidBills++;
    }

    const startStr = session.payload?.createdAt || session.createdAt;
    const endStr = session.payload?.finalizedAt || session.finalizedAt;
    if (startStr && endStr) {
      const start = new Date(startStr);
      const end = new Date(endStr);
      const diff = (end.getTime() - start.getTime()) / 1000;
      if (diff > 0 && diff < 3600) {
        totalDuration += diff;
        durationCount++;
      }
    }

    const itemsCount = session.payload?.totals?.byItem?.length || 0;
    const participantsCount = pIds.length;
    const ocrBonus = isOcr ? itemsCount * 45 : 0;
    const participantBonus = participantsCount * 60;
    const billSavings = 120 + ocrBonus + participantBonus;
    totalSavedSeconds += billSavings;
  }

  const manualCount = totalBills - ocrCount;
  const avgParticipants = totalBills > 0 ? totalParticipantsCount / totalBills : 0;
  const ocrRate = totalBills > 0 ? Math.round((ocrCount / totalBills) * 100) : 0;
  const avgCreationTimeSec = durationCount > 0 ? Math.round(totalDuration / durationCount) : 37;
  const timeSavedMin = Math.round(totalSavedSeconds / 60);
  const uniqueParticipants = uniqueParticipantsSet.size;

  // Graph buckets
  const now = new Date();
  const buckets: { label: string; start: Date; end: Date; count: number; amount: number }[] = [];

  if (period === 'day') {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    for (let i = 0; i < 6; i++) {
      const label = `${(i * 4).toString().padStart(2, '0')}:00`;
      const start = new Date(startOfToday.getTime() + i * 4 * 60 * 60 * 1000);
      const end = new Date(startOfToday.getTime() + (i + 1) * 4 * 60 * 60 * 1000);
      buckets.push({ label, start, end, count: 0, amount: 0 });
    }
  } else if (period === 'week') {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(startOfToday.getTime() - i * 24 * 60 * 60 * 1000);
      const label = dayNames[d.getDay()];
      const start = d;
      const end = new Date(d.getTime() + 24 * 60 * 60 * 1000);
      buckets.push({ label, start, end, count: 0, amount: 0 });
    }
  } else if (period === 'month') {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    for (let i = 5; i >= 0; i--) {
      const endDaysAgo = i * 5;
      const startDaysAgo = (i + 1) * 5;
      const start = new Date(startOfToday.getTime() - startDaysAgo * 24 * 60 * 60 * 1000);
      const end = new Date(startOfToday.getTime() - endDaysAgo * 24 * 60 * 60 * 1000);
      const label = `${end.getDate()}.${(end.getMonth() + 1).toString().padStart(2, '0')}`;
      buckets.push({ label, start, end, count: 0, amount: 0 });
    }
  }

  // Populate buckets
  for (const session of periodSessions) {
    const dateStr = session.finalizedAt || session.createdAt || session.payload?.createdAt;
    if (!dateStr) continue;
    const sessionTime = new Date(dateStr).getTime();

    for (const bucket of buckets) {
      if (sessionTime >= bucket.start.getTime() && sessionTime < bucket.end.getTime()) {
        bucket.count++;
        bucket.amount += session.grandTotal ?? session.payload?.totals?.grandTotal ?? 0;
        break;
      }
    }
  }

  const billsPerDay = buckets.map((b) => ({ label: b.label, value: b.count }));
  const dailyAmounts = buckets.map((b) => ({ label: b.label, value: b.amount }));

  // Unified Recent Activity
  const activities: {
    type: 'ocr_imported' | 'manual_created' | 'friend_added';
    targetName: string;
    date: string;
    amount: number;
    timestamp: number;
  }[] = [];

  // Add bill creations/scans
  for (const session of periodSessions) {
    const dateStr = session.finalizedAt || session.createdAt || session.payload?.createdAt;
    if (!dateStr) continue;
    const date = new Date(dateStr);
    const isOcr = isOcrSession(session);
    const amount = session.grandTotal ?? session.payload?.totals?.grandTotal ?? 0;
    const sessionName = session.sessionName || session.payload?.sessionName || 'Bill';

    const formattedDate = date.toLocaleDateString(languageCode, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

    activities.push({
      type: isOcr ? 'ocr_imported' : 'manual_created',
      targetName: sessionName,
      date: formattedDate,
      amount,
      timestamp: date.getTime(),
    });
  }

  // Add friend additions
  const friends = useFriendsStore.getState().friends || [];
  friends.forEach((friend: any) => {
    const username = friend.username || friend.user?.username || 'User';
    const createdAtStr = friend.createdAt || friend.joinedAt;
    const date = createdAtStr ? new Date(createdAtStr) : new Date(Date.now() - 36 * 60 * 60 * 1000);

    if (isWithinPeriod(date.toISOString(), period)) {
      const formattedDate = date.toLocaleDateString(languageCode, {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });

      activities.push({
        type: 'friend_added',
        targetName: username,
        date: formattedDate,
        amount: 0,
        timestamp: date.getTime(),
      });
    }
  });

  const lastActivity = activities
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5)
    .map(({ type, targetName, date, amount }) => ({ type, targetName, date, amount }));

  return {
    totalBills,
    totalAmount,
    avgParticipants,
    ocrRate,
    billsPerDay,
    dailyAmounts,
    ocrCount,
    manualCount,
    uniqueParticipants,
    maxParticipantsInOne,
    paidBills,
    unpaidBills,
    manualEntries: manualCount,
    lastActivity,
    avgCreationTimeSec,
    timeSavedMin,
  };
}
