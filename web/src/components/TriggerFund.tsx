'use client';
import { useState } from 'react';
import { buildTriggerXDR, type EmergencyFundState } from '@/lib/emergencyFund';
import { signAndSubmit } from '@/lib/sign';
import { buildPaymentXDR, submitSignedXDR, pollTransaction } from '@/lib/payment';
import { NETWORK_PASSPHRASE } from '@/lib/stellar';

type Phase = 'idle' | 'triggering' | 'paying' | 'success' | 'error';

export default function TriggerFund({
  publicKey,
  fundState,
  onTriggered,
}: {
  publicKey: string;
  fundState: EmergencyFundState;
  onTriggered: () => void;
}) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [txHash, setTxHash] = useState('');
  const [payHash, setPayHash] = useState('');
  const [error, setError] = useState('');

  const isRecipient = publicKey === fundState.recipient;
  const isSender = publicKey === fundState.sender;
  const alreadyTriggered = fundState.status === 'Triggered';
  const busy = phase === 'triggering' || phase === 'paying';

  // Format the max amount from Stellar units (1 XLM = 10^7 stroops)
  const maxXlm = (Number(fundState.maxAmount) / 10_000_000).toFixed(2);
  const triggeredDate = fundState.triggeredAt
    ? new Date(fundState.triggeredAt * 1000).toLocaleString()
    : null;

  const handleTrigger = async () => {
    if (!isRecipient) return;
    setError('');
    setPhase('triggering');
    try {
      // Step 1: Trigger the Soroban contract (records on-chain)
      const triggerXdr = await buildTriggerXDR(publicKey);
      const hash = await signAndSubmit(triggerXdr, publicKey);
      setTxHash(hash);

      // Step 2: Send the actual XLM payment from sender → recipient
      // In a real deployment the pre-signed XDR would be stored/retrieved;
      // here we simulate by building a fresh payment and having the
      // recipient request the transfer. (OFW pre-authorises via Soroban.)
      setPhase('paying');
      const paymentXdr = await buildPaymentXDR(
        fundState.sender,
        publicKey,
        maxXlm,
        'XLM',
      );

      // Sign as the recipient using the pre-authorised flow
      const freighter = await import('@stellar/freighter-api');
      const signed = await freighter.signTransaction(paymentXdr, {
        networkPassphrase: NETWORK_PASSPHRASE,
        address: fundState.sender,
      });
      if (signed.error) throw new Error(typeof signed.error === 'string' ? signed.error : 'Signing rejected');

      const pHash = await submitSignedXDR(signed.signedTxXdr);
      await pollTransaction(pHash);
      setPayHash(pHash);
      setPhase('success');
      onTriggered();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Trigger failed');
      setPhase('error');
    }
  };

  return (
    <div
      className={`rounded-xl border p-6 ${
        alreadyTriggered
          ? 'border-orange-200 bg-orange-50'
          : 'border-red-100 bg-red-50'
      }`}
    >
      <div className="mb-3 flex items-center gap-2">
        <span className="text-2xl">{alreadyTriggered ? '✅' : '🚨'}</span>
        <h2 className="text-lg font-bold text-gray-900">
          {alreadyTriggered ? 'Fund Triggered' : 'Trigger Emergency Fund'}
        </h2>
        <span
          className={`ml-auto rounded-full px-3 py-0.5 text-xs font-semibold ${
            alreadyTriggered
              ? 'bg-orange-100 text-orange-700'
              : 'bg-green-100 text-green-700'
          }`}
        >
          {alreadyTriggered ? 'TRIGGERED' : 'ARMED'}
        </span>
      </div>

      {/* Fund details */}
      <div className="mb-4 rounded-lg border border-gray-200 bg-white p-4 text-sm">
        <div className="mb-1 flex justify-between">
          <span className="text-gray-500">Label</span>
          <span className="font-medium text-gray-800 text-right max-w-[60%]">{fundState.label}</span>
        </div>
        <div className="mb-1 flex justify-between">
          <span className="text-gray-500">Max Amount</span>
          <span className="font-bold text-gray-900">{maxXlm} XLM</span>
        </div>
        <div className="mb-1 flex justify-between">
          <span className="text-gray-500">Sender</span>
          <span className="font-mono text-xs text-gray-700">
            {fundState.sender.slice(0, 8)}…{fundState.sender.slice(-6)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Recipient</span>
          <span className="font-mono text-xs text-gray-700">
            {fundState.recipient.slice(0, 8)}…{fundState.recipient.slice(-6)}
          </span>
        </div>
        {triggeredDate && (
          <div className="mt-1 flex justify-between">
            <span className="text-gray-500">Triggered at</span>
            <span className="text-xs text-orange-700">{triggeredDate}</span>
          </div>
        )}
      </div>

      {/* Trigger button — only visible to recipient when Armed */}
      {!alreadyTriggered && isRecipient && (
        <>
          <p className="mb-3 text-sm text-red-700">
            You are the registered recipient. Press the button below to release the
            emergency funds immediately — no need to contact the sender.
          </p>
          <button
            onClick={handleTrigger}
            disabled={busy}
            className="w-full rounded-lg bg-red-600 py-3 font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
          >
            {busy
              ? phase === 'triggering'
                ? '⏳ Recording on-chain…'
                : '💸 Sending funds…'
              : '🚨 Trigger Emergency Fund Now'}
          </button>
        </>
      )}

      {!alreadyTriggered && !isRecipient && !isSender && (
        <p className="text-sm text-gray-500">
          Only the registered recipient (<code className="text-xs">{fundState.recipient.slice(0, 8)}…</code>) can trigger this fund.
        </p>
      )}

      {alreadyTriggered && (
        <p className="text-sm text-orange-700">
          The emergency fund was triggered on {triggeredDate}. The OFW can reset it after
          reviewing.
        </p>
      )}

      {phase === 'success' && (
        <div className="mt-4 space-y-2 rounded-lg border border-green-200 bg-green-50 p-3">
          <p className="font-bold text-green-700">✅ Emergency funds released!</p>
          {txHash && (
            <a
              href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block break-all text-xs text-indigo-600 hover:underline"
            >
              Contract trigger tx →
            </a>
          )}
          {payHash && (
            <a
              href={`https://stellar.expert/explorer/testnet/tx/${payHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="block break-all text-xs text-indigo-600 hover:underline"
            >
              Payment tx →
            </a>
          )}
        </div>
      )}

      {phase === 'error' && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-100 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
    </div>
  );
}
