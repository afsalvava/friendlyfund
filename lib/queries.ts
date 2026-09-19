import type { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { balanceOf, splitTotals, type Movement } from "@/lib/money";
import { monthKey } from "@/lib/grouping";

/**
 * Read helpers for the screens. Firestore has no cross-collection joins and
 * no arbitrary GROUP BY, so each function fetches the raw collections and
 * groups in JS — the same pattern getHomeSummary/getMonthlySeries already
 * used even under Prisma. Fetching the whole `transactions` collection once
 * per request is fine at this app's scale (a handful of friends).
 */

export const MONTHLY_AMOUNT = 1000;

export type TxType = "DEPOSIT" | "WITHDRAWAL";

export type TxView = {
  id: string;
  type: TxType;
  amount: number;
  date: Date;
  note: string | null;
  memberId: string;
  memberName: string;
  memberPhotoUrl: string | null;
};

export type MemberView = {
  id: string;
  name: string;
  photoUrl: string | null;
  balance: number;
  deposits: number;
  withdrawals: number;
  transactionCount: number;
  lastActivity: Date | null;
  paidThisMonth: boolean;
};

export type MemberRosterEntry = { id: string; name: string; photoUrl: string | null };

type MemberDoc = { name: string; photoUrl: string | null };
type TransactionDoc = {
  memberId: string;
  type: TxType;
  amount: number;
  date: Timestamp;
  note: string | null;
};

async function allMembers(): Promise<{ id: string; data: MemberDoc }[]> {
  const snap = await adminDb.collection("members").get();
  return snap.docs.map((doc) => ({ id: doc.id, data: doc.data() as MemberDoc }));
}

/** Every transaction, newest first. Single-field orderBy needs no composite index. */
async function allTransactions(): Promise<{ id: string; data: TransactionDoc }[]> {
  const snap = await adminDb.collection("transactions").orderBy("date", "desc").get();
  return snap.docs.map((doc) => ({ id: doc.id, data: doc.data() as TransactionDoc }));
}

/** Whether this month's deposits reach the fixed monthly contribution. */
function hasPaidThisMonth(transactions: { type: TxType; amount: number; date: Date }[]): boolean {
  const thisKey = monthKey(new Date());
  const depositedThisMonth = transactions
    .filter((t) => t.type === "DEPOSIT" && monthKey(t.date) === thisKey)
    .reduce((sum, t) => sum + t.amount, 0);
  return depositedThisMonth >= MONTHLY_AMOUNT;
}

function summarize(
  memberId: string,
  name: string,
  photoUrl: string | null,
  txs: { id: string; data: TransactionDoc }[]
): MemberView {
  const mine = txs
    .filter((t) => t.data.memberId === memberId)
    .map((t) => ({ ...t.data, date: t.data.date.toDate() }));

  const movements: Movement[] = mine.map((t) => ({ type: t.type, amount: t.amount }));
  const { deposits, withdrawals } = splitTotals(movements);

  return {
    id: memberId,
    name,
    photoUrl,
    balance: balanceOf(movements),
    deposits,
    withdrawals,
    transactionCount: mine.length,
    lastActivity: mine[0]?.date ?? null,
    paidThisMonth: hasPaidThisMonth(mine),
  };
}

/** The bare id/name/photo roster the entry sheet's member picker needs on every screen. */
export async function getMemberRoster(): Promise<MemberRosterEntry[]> {
  const members = await allMembers();
  return members
    .map((m) => ({ id: m.id, name: m.data.name, photoUrl: m.data.photoUrl }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getMembers(): Promise<MemberView[]> {
  const [members, txs] = await Promise.all([allMembers(), allTransactions()]);
  return members.map((m) => summarize(m.id, m.data.name, m.data.photoUrl, txs));
}

export async function getMember(
  id: string
): Promise<{ member: MemberView; transactions: TxView[] } | null> {
  const [doc, txs] = await Promise.all([
    adminDb.collection("members").doc(id).get(),
    allTransactions(),
  ]);
  if (!doc.exists) return null;

  const data = doc.data() as MemberDoc;
  const member = summarize(id, data.name, data.photoUrl, txs);

  const transactions: TxView[] = txs
    .filter((t) => t.data.memberId === id)
    .map((t) => ({
      id: t.id,
      type: t.data.type,
      amount: t.data.amount,
      date: t.data.date.toDate(),
      note: t.data.note,
      memberId: id,
      memberName: data.name,
      memberPhotoUrl: data.photoUrl,
    }));

  return { member, transactions };
}

export async function getRecentTransactions(limit = 15): Promise<TxView[]> {
  const [txs, members] = await Promise.all([allTransactions(), allMembers()]);
  const byId = new Map(members.map((m) => [m.id, m.data]));

  return txs.slice(0, limit).map((t) => {
    const member = byId.get(t.data.memberId);
    return {
      id: t.id,
      type: t.data.type,
      amount: t.data.amount,
      date: t.data.date.toDate(),
      note: t.data.note,
      memberId: t.data.memberId,
      memberName: member?.name ?? "Unknown",
      memberPhotoUrl: member?.photoUrl ?? null,
    };
  });
}

export type HomeSummary = {
  totalPool: number;
  memberCount: number;
  thisMonthNet: number;
  lastMonthNet: number;
  paidCount: number;
};

export async function getHomeSummary(): Promise<HomeSummary> {
  const [members, txs] = await Promise.all([allMembers(), allTransactions()]);
  const all = txs.map((t) => ({ ...t.data, date: t.data.date.toDate() }));

  const movements: Movement[] = all.map((t) => ({ type: t.type, amount: t.amount }));

  const now = new Date();
  const thisKey = monthKey(now);
  const lastKey = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  const netFor = (key: string) =>
    balanceOf(
      all
        .filter((t) => monthKey(t.date) === key)
        .map((t) => ({ type: t.type, amount: t.amount }))
    );

  const paidCount = members.filter((m) =>
    hasPaidThisMonth(all.filter((t) => t.memberId === m.id))
  ).length;

  return {
    totalPool: balanceOf(movements),
    memberCount: members.length,
    thisMonthNet: netFor(thisKey),
    lastMonthNet: netFor(lastKey),
    paidCount,
  };
}

export type MonthPoint = { key: string; date: Date; net: number; cumulative: number };

/** Net and running total for the last `months` calendar months. */
export async function getMonthlySeries(months = 6): Promise<MonthPoint[]> {
  const txs = await allTransactions();
  const all = txs.map((t) => ({ ...t.data, date: t.data.date.toDate() }));

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const netByMonth = new Map<string, number>();
  let carriedIn = 0;

  for (const t of all) {
    const signed = t.type === "DEPOSIT" ? t.amount : -t.amount;
    if (t.date < start) {
      carriedIn += signed;
      continue;
    }
    const key = monthKey(t.date);
    netByMonth.set(key, (netByMonth.get(key) ?? 0) + signed);
  }

  const points: MonthPoint[] = [];
  let running = carriedIn;

  for (let i = 0; i < months; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - (months - 1) + i, 1);
    const net = netByMonth.get(monthKey(date)) ?? 0;
    running += net;
    points.push({
      key: monthKey(date),
      date,
      net: Math.round(net * 100) / 100,
      cumulative: Math.round(running * 100) / 100,
    });
  }

  return points;
}
