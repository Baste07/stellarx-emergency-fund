'use client';
import { useState } from 'react';
import { buildSetupXDR } from '@/lib/emergencyFund';
import { signAndSubmit } from '@/lib/sign';

type Status = 'idle' | 'building' | 'signing' | 'submitting' | 'success' | 'error';

export default function SetupFund({
  publicKey,
  onSetup,
}: {
  publicKey: string;
  onSetup: () => void;
}) {
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [label, setLabel] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');

  const busy = ['building', 'signing', 'submitting'].includes(status);

  const handleSetup = async () => {
    setError('');
    setTxHash('');
    setStatus('building');
    try {
      // Convert amount to bigint (7 decimal places for Stellar = multiply by 10^7)
      const amountUnits = BigInt(Math.trunc(parseFloat(amount) * 10_000_000));
      const xdr = await buildSetupXDR(publicKey, recipient.trim(), amountUnits, label.trim());

      setStatus('signing');
      const hash = await signAndSubmit(xdr, publicKey);
      setTxHash(hash);
      setStatus('success');
      onSetup();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Setup failed');
      setStatus('error');
    }
  };

  return (
    <div className="rounded-xl border border-blue-100 bg-blue-50 p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-2xl">🔐</span>
        <h2 className="text-lg font-bold text-blue-900">Setup Emergency Fund</h2>
      </div>
      <p className="mb-4 text-sm text-blue-700">
        Pre-authorise a trusted family member to trigger an emergency transfer. You sign
        once now — they can activate it any time, even at odd hours.
      </p>

      <div className="space-y-3">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Recipient address (family member)
          </label>
          <input
            type="text"
            placeholder="G… testnet address"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm text-gray-900 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Max amount (XLM)
          </label>
          <input
            type="number"
            placeholder="e.g. 500"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Label / reason
          </label>
          <input
            type="text"
            placeholder="e.g. Hospital emergency fund — up to 500 XLM"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none"
          />
        </div>

        <button
          onClick={handleSetup}
          disabled={busy || !recipient || !amount || !label}
          className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
        >
          {busy
            ? status === 'building'
              ? 'Building transaction…'
              : status === 'signing'
                ? 'Waiting for Freighter…'
                : 'Submitting…'
            : '🔒 Arm Emergency Fund'}
        </button>
      </div>

      {status === 'success' && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3">
          <p className="font-semibold text-green-700">✅ Emergency fund armed!</p>
          <p className="mt-1 text-xs text-green-600">
            Your family member can now trigger it any time.
          </p>
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

      {status === 'error' && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
