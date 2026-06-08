'use client';
import { useState } from 'react';
import { buildDeleteXDR, type EmergencyFundState } from '@/lib/emergencyFund';
import { signAndSubmit } from '@/lib/sign';

export default function DeleteFund({
  publicKey,
  fundState,
  onDeleted,
}: {
  publicKey: string;
  fundState: EmergencyFundState;
  onDeleted: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const isSender = publicKey === fundState.sender;

  const handleDelete = async () => {
    if (!isSender) return;

    const confirmed = window.confirm(
      'Delete this emergency fund? This removes the current fund configuration from the contract.',
    );
    if (!confirmed) return;

    setBusy(true);
    setError('');
    try {
      const xdr = await buildDeleteXDR(publicKey);
      const hash = await signAndSubmit(xdr, publicKey);
      setTxHash(hash);
      setDone(true);
      onDeleted();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-6">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-2xl">🗑️</span>
        <h2 className="text-lg font-bold text-red-900">Delete Current Fund</h2>
      </div>
      <p className="mb-4 text-sm text-red-800">
        This permanently removes the current fund setup from the contract. You can set up a new fund afterward.
      </p>

      {!isSender && (
        <p className="mb-4 text-sm text-red-700">
          Only the original sender can delete this fund.
        </p>
      )}

      {!done && (
        <button
          onClick={handleDelete}
          disabled={busy || !isSender}
          className="w-full rounded-lg bg-red-600 py-3 font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
        >
          {busy ? 'Deleting…' : isSender ? 'Delete Fund' : 'Delete Fund (Sender only)'}
        </button>
      )}

      {done && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3">
          <p className="font-semibold text-green-700">✅ Fund deleted successfully!</p>
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
        <div className="mt-3 rounded-lg border border-red-300 bg-white p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
