'use client';

import { useMemo, useState } from 'react';
import {
  buildDeleteXDR,
  buildTriggerXDR,
  type EmergencyFundRecord,
} from '@/lib/emergencyFund';
import { signAndSubmit } from '@/lib/sign';

type Filter = 'all' | 'mine' | 'sent' | 'received';

type ActionState = 'idle' | 'working' | 'done' | 'error';

function shorten(address: string): string {
  return `${address.slice(0, 8)}…${address.slice(-6)}`;
}

function formatXlm(amount: bigint): string {
  return (Number(amount) / 10_000_000).toFixed(2);
}

function FundCard({
  fund,
  publicKey,
  onMutate,
  onActivity,
}: {
  fund: EmergencyFundRecord;
  publicKey: string;
  onMutate: () => void;
  onActivity: (message: string, txHash?: string) => void;
}) {
  const [status, setStatus] = useState<ActionState>('idle');
  const [error, setError] = useState('');

  const isSender = publicKey === fund.sender;
  const isRecipient = publicKey === fund.recipient;
  const canTrigger = isRecipient;
  const canDelete = isSender;

  const roleLabel =
    isSender && isRecipient
      ? 'You are both sender and recipient'
      : isSender
        ? 'You created this fund'
        : isRecipient
          ? 'You can trigger this fund'
          : 'Observer view';

  const handleTrigger = async () => {
    if (!canTrigger || status === 'working') return;
    setError('');
    setStatus('working');
    try {
      const xdr = await buildTriggerXDR(publicKey, fund.id);
      const hash = await signAndSubmit(xdr, publicKey);
      setStatus('done');
      onActivity(`Triggered ${fund.label}`, hash);
      window.setTimeout(onMutate, 350);
    } catch (e: unknown) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Trigger failed');
    }
  };

  const handleDelete = async () => {
    if (!canDelete || status === 'working') return;
    const confirmed = window.confirm(
      `Delete "${fund.label}"? This removes the active fund from the contract.`,
    );
    if (!confirmed) return;

    setError('');
    setStatus('working');
    try {
      const xdr = await buildDeleteXDR(publicKey, fund.id);
      const hash = await signAndSubmit(xdr, publicKey);
      setStatus('done');
      onActivity(`Deleted ${fund.label}`, hash);
      window.setTimeout(onMutate, 350);
    } catch (e: unknown) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Delete failed');
    }
  };

  return (
    <article className="group rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.45)] backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
            Fund #{fund.id.toString()}
          </p>
          <h3 className="mt-1 truncate text-lg font-semibold text-slate-900">
            {fund.label}
          </h3>
          <p className="mt-1 text-sm text-slate-500">{roleLabel}</p>
        </div>
        <div className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
          {formatXlm(fund.maxAmount)} XLM
        </div>
      </div>

      <div className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Sender
          </p>
          <p className="mt-1 font-mono text-xs text-slate-700">{shorten(fund.sender)}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Recipient
          </p>
          <p className="mt-1 font-mono text-xs text-slate-700">
            {shorten(fund.recipient)}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          onClick={handleTrigger}
          disabled={!canTrigger || status === 'working'}
          className="rounded-full bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {status === 'working' && canTrigger ? 'Triggering…' : 'Trigger fund'}
        </button>
        <button
          onClick={handleDelete}
          disabled={!canDelete || status === 'working'}
          className="rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {status === 'working' && canDelete ? 'Deleting…' : 'Delete fund'}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}
    </article>
  );
}

export default function FundBoard({
  publicKey,
  funds,
  loading,
  error,
  onMutate,
  onActivity,
}: {
  publicKey: string;
  funds: EmergencyFundRecord[];
  loading: boolean;
  error: string;
  onMutate: () => void;
  onActivity: (message: string, txHash?: string) => void;
}) {
  const [filter, setFilter] = useState<Filter>('all');

  const counts = useMemo(() => {
    const mine = funds.filter(
      (fund) => fund.sender === publicKey || fund.recipient === publicKey,
    );
    return {
      total: funds.length,
      mine: mine.length,
      sent: funds.filter((fund) => fund.sender === publicKey).length,
      received: funds.filter((fund) => fund.recipient === publicKey).length,
    };
  }, [funds, publicKey]);

  const filteredFunds = useMemo(() => {
    if (filter === 'mine') {
      return funds.filter(
        (fund) => fund.sender === publicKey || fund.recipient === publicKey,
      );
    }
    if (filter === 'sent') {
      return funds.filter((fund) => fund.sender === publicKey);
    }
    if (filter === 'received') {
      return funds.filter((fund) => fund.recipient === publicKey);
    }
    return funds;
  }, [filter, funds, publicKey]);

  return (
    <section className="rounded-3xl border border-white/70 bg-white/80 p-5 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.5)] backdrop-blur sm:p-6">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
            Active registry
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-900">
            Emergency funds
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            One sender can manage many funds, each with its own recipient and amount.
            Triggering a fund removes it from the active registry automatically.
          </p>
        </div>

        {/* ✅ Fixed: flex + shrink-0 replaces the grid that caused wrapping */}
        <div className="flex shrink-0 gap-2">
          <Stat label="Active" value={counts.total.toString()} />
          <Stat label="Mine" value={counts.mine.toString()} />
          <Stat label="As sender" value={counts.sent.toString()} />
          <Stat label="As recipient" value={counts.received.toString()} />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {(['all', 'mine', 'sent', 'received'] as const).map((option) => {
          const active = filter === option;
          const label =
            option === 'all'
              ? 'All funds'
              : option === 'mine'
                ? 'My funds'
                : option === 'sent'
                  ? 'Sent by me'
                  : 'Received by me';
          return (
            <button
              key={option}
              onClick={() => setFilter(option)}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
          Loading active funds…
        </div>
      ) : error ? (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-700">
          {error}
        </div>
      ) : filteredFunds.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-500">
          <p className="font-medium text-slate-700">No active funds in this view.</p>
          <p className="mt-1 text-sm text-slate-500">
            Create a new fund on the left, or switch filter tabs to see another group.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 xl:grid-cols-2">
          {filteredFunds.map((fund) => (
            <FundCard
              key={fund.id.toString()}
              fund={fund}
              publicKey={publicKey}
              onMutate={onMutate}
              onActivity={onActivity}
            />
          ))}
        </div>
      )}
    </section>
  );
}

// ✅ Fixed: uniform w-[72px], centered layout, no min-h forcing uneven heights
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex w-[72px] flex-col items-center rounded-2xl border border-slate-200 bg-slate-50 px-2 py-3 text-center shadow-sm">
      <p className="text-[10px] font-semibold uppercase leading-tight tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold leading-none text-slate-950">
        {value}
      </p>
    </div>
  );
}