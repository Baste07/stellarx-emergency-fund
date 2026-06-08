'use client';
import { useState } from 'react';
import { buildResetXDR, type EmergencyFundState } from '@/lib/emergencyFund';
import { signAndSubmit } from '@/lib/sign';

export default function ResetFund({
  publicKey,
  fundState,
  onReset,
}: {
  publicKey: string;
  fundState: EmergencyFundState;
  onReset: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const isSender = publicKey === fundState.sender;
  if (!isSender || fundState.status !== 'Triggered') return null;

  const handleReset = async () => {
    setBusy(true);
    setError('');
    try {
      const xdr = await buildResetXDR(publicKey);
      const hash = await signAndSubmit(xdr, publicKey);
      setTxHash(hash);
      setDone(true);
      onReset();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Reset failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-2xl">🔄</span>
        <h2 className="text-lg font-bold text-gray-900">Re-arm Emergency Fund</h2>
      </div>
      <p className="mb-4 text-sm text-gray-600">
        The fund has been triggered. Once you have reviewed the emergency, reset it so
        your family member can use it again in the future.
      </p>

      {!done && (
        <button
          onClick={handleReset}
          disabled={busy}
          className="w-full rounded-lg bg-gray-800 py-3 font-semibold text-white transition-colors hover:bg-gray-900 disabled:opacity-50"
        >
          {busy ? 'Resetting…' : '🔄 Reset & Re-arm Fund'}
        </button>
      )}

      {done && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3">
          <p className="font-semibold text-green-700">✅ Fund re-armed successfully!</p>
          <a
            href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block break-all text-xs text-indigo-600 hover:underline"
          >
            View on Stellar Expert →
          </a>
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
