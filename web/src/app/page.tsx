'use client';
import { useState, useCallback, useEffect, useMemo } from 'react';
import { useWallet } from '@/hooks/useWallet';
import ConnectWallet from '@/components/ConnectWallet';
import FundAccount from '@/components/FundAccount';
import BalanceCard from '@/components/BalanceCard';
import SetupFund from '@/components/SetupFund';
import FundBoard from '@/components/FundBoard';
import { contractConfigured, readFunds, type EmergencyFundRecord } from '@/lib/emergencyFund';

type Activity = {
  message: string;
  txHash?: string;
};

export default function Home() {
  const wallet = useWallet();
  const { publicKey, connecting } = wallet;

  const [refreshKey, setRefreshKey] = useState(0);

  const configured = contractConfigured();
  const [funds, setFunds] = useState<EmergencyFundRecord[]>([]);
  const [fundLoading, setFundLoading] = useState(configured);
  const [fundError, setFundError] = useState('');
  const [activity, setActivity] = useState<Activity | null>(null);

  const refreshRegistry = useCallback(() => {
    if (!configured) return;
    setFundLoading(true);
    setRefreshKey((k) => k + 1);
  }, [configured]);

  useEffect(() => {
    if (!configured) return;

    let cancelled = false;

    const load = async () => {
      setFundError('');
      try {
        const nextFunds = await readFunds();
        if (!cancelled) setFunds(nextFunds);
      } catch (e: unknown) {
        if (!cancelled) {
          setFundError(e instanceof Error ? e.message : 'Failed to read contract');
        }
      } finally {
        if (!cancelled) setFundLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [configured, refreshKey]);

  const counts = useMemo(() => {
    if (!publicKey) {
      return { total: funds.length, mine: 0, sent: 0, received: 0 };
    }

    return {
      total: funds.length,
      mine: funds.filter((fund) => fund.sender === publicKey || fund.recipient === publicKey).length,
      sent: funds.filter((fund) => fund.sender === publicKey).length,
      received: funds.filter((fund) => fund.recipient === publicKey).length,
    };
  }, [funds, publicKey]);

  const setActivityBanner = useCallback((message: string, txHash?: string) => {
    setActivity({ message, txHash });
  }, []);

  const hasWallet = Boolean(publicKey);

  return (
    <main className="min-h-screen w-full bg-[radial-gradient(circle_at_top,_#eef6ff_0%,_#f8fbff_42%,_#ffffff_100%)] text-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">

        {/* Header */}
        <header className="rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-[0_24px_80px_-40px_rgba(15,23,42,0.45)] backdrop-blur sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-700">
                Multi-fund emergency registry
              </div>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                Emergency Fund Trigger
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
                Create separate emergency funds for different people or situations.
                Each fund is independent, easy to review, and disappears from the
                active registry after it is triggered or deleted.
              </p>
            </div>
            <ConnectWallet {...wallet} />
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            <StatCard label="Active funds" value={counts.total.toString()} />
            <StatCard label="My funds" value={counts.mine.toString()} />
            <StatCard label="As sender" value={counts.sent.toString()} />
            <StatCard label="As recipient" value={counts.received.toString()} />
          </div>
        </header>

        {activity && (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">{activity.message}</p>
                <p className="text-emerald-700">
                  The active registry will refresh automatically in a moment.
                </p>
              </div>
              {activity.txHash && (
                <a
                  href={`https://stellar.expert/explorer/testnet/tx/${activity.txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold text-emerald-900 hover:underline"
                >
                  View transaction →
                </a>
              )}
            </div>
          </div>
        )}

        {/* Not connected */}
        {!hasWallet && !connecting && (
          <div className="mt-6 rounded-[2rem] border border-dashed border-slate-300 bg-white/70 px-6 py-16 text-center text-slate-500 shadow-sm backdrop-blur">
            <p className="text-4xl mb-3">🔑</p>
            <p className="mb-2 font-medium text-slate-700">
              Connect your Freighter wallet to manage funds.
            </p>
            <p className="text-sm">
              No wallet?{' '}
              <a
                href="https://freighter.app"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-sky-700 hover:underline"
              >
                Install Freighter
              </a>{' '}
              and switch to <strong>Test Net</strong>.
            </p>
          </div>
        )}

        {/* Connected */}
        {hasWallet && (
          <div className="mt-6 grid gap-6 lg:grid-cols-[390px_minmax(0,1fr)]">
            <div className="space-y-5">
              <FundAccount publicKey={publicKey!} onFunded={refreshRegistry} />
              <BalanceCard publicKey={publicKey!} refreshKey={refreshKey} />
              <button
                onClick={refreshRegistry}
                className="text-left text-sm font-medium text-slate-500 underline decoration-slate-300 underline-offset-4 transition-colors hover:text-slate-800"
              >
                ↻ Refresh registry and balances
              </button>

              {!configured ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white/75 p-6 text-sm text-slate-600 shadow-sm backdrop-blur">
                  <h2 className="text-base font-semibold text-slate-900">
                    Contract not deployed
                  </h2>
                  <p className="mt-2 text-sm text-slate-600">
                    Deploy the Rust contract and set its ID to enable the emergency fund
                    registry.
                  </p>
                  <pre className="mt-4 overflow-x-auto rounded-2xl bg-slate-950 p-3 text-xs text-slate-100">
                    .\scripts\deploy.ps1
                  </pre>
                  <p className="mt-3 text-xs text-slate-500">
                    The script writes <code>NEXT_PUBLIC_CONTRACT_ID</code> into{' '}
                    <code>web/.env.local</code>. Restart <code>npm run dev</code>{' '}
                    afterward.
                  </p>
                </div>
              ) : (
                <SetupFund publicKey={publicKey!} onSetup={refreshRegistry} />
              )}
            </div>

            <div>
              {configured ? (
                <FundBoard
                  publicKey={publicKey!}
                  funds={funds}
                  loading={fundLoading}
                  error={fundError}
                  onMutate={refreshRegistry}
                  onActivity={setActivityBanner}
                />
              ) : null}
            </div>
          </div>
        )}

        <footer className="mt-12 pb-4 text-center text-xs text-slate-400">
          StellarX Workshop · PUP QC · Emergency Fund Trigger (Project #6)
        </footer>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold text-slate-950">{value}</p>
    </div>
  );
}
