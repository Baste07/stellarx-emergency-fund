'use client';
import { type EmergencyFundState } from '@/lib/emergencyFund';

export default function FundStatusPanel({
  state,
  loading,
  error,
}: {
  state: EmergencyFundState | null;
  loading: boolean;
  error: string;
}) {
  if (loading) {
    return (
      <div className="rounded-xl border border-gray-100 bg-gray-50 p-6 text-center text-sm text-gray-400">
        Loading contract state…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-700">
        ⚠️ {error}
      </div>
    );
  }

  if (!state) {
    return (
      <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-6 text-center">
        <p className="text-sm text-gray-500">No emergency fund set up yet.</p>
        <p className="mt-1 text-xs text-gray-400">
          Connect as the OFW (sender) to initialise the fund.
        </p>
      </div>
    );
  }

  const maxXlm = (Number(state.maxAmount) / 10_000_000).toFixed(2);
  const triggered = state.status === 'Triggered';

  return (
    <div
      className={`rounded-xl border p-4 text-sm ${
        triggered
          ? 'border-orange-200 bg-orange-50'
          : 'border-emerald-200 bg-emerald-50'
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="font-semibold text-gray-800">Fund Status</span>
        <span
          className={`rounded-full px-3 py-0.5 text-xs font-bold ${
            triggered
              ? 'bg-orange-200 text-orange-800'
              : 'bg-emerald-200 text-emerald-800'
          }`}
        >
          {triggered ? '⚡ TRIGGERED' : '🛡️ ARMED'}
        </span>
      </div>
      <p className="text-gray-700">
        <span className="font-medium">Label:</span> {state.label}
      </p>
      <p className="text-gray-700">
        <span className="font-medium">Max:</span> {maxXlm} XLM
      </p>
    </div>
  );
}
