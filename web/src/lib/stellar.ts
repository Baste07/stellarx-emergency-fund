import { rpc, Networks, Asset } from '@stellar/stellar-sdk';

export const NETWORK_PASSPHRASE = Networks.TESTNET;

export const RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC ?? 'https://soroban-testnet.stellar.org';
export const HORIZON_URL =
  process.env.NEXT_PUBLIC_HORIZON_URL ?? 'https://horizon-testnet.stellar.org';
export const USDC_ISSUER =
  process.env.NEXT_PUBLIC_USDC_ISSUER ??
  'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
export const CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID ?? '';

// v15 SDK: use `rpc` namespace (the old SorobanRpc is gone).
export const server = new rpc.Server(RPC_URL);

export const XLM = Asset.native();
export const USDC = new Asset('USDC', USDC_ISSUER);

/** Fund a testnet account via Friendbot (~10,000 XLM). */
export async function fundTestnetAccount(publicKey: string): Promise<void> {
  const res = await fetch(
    `https://friendbot.stellar.org?addr=${encodeURIComponent(publicKey)}`,
  );
  if (!res.ok && res.status !== 400) {
    throw new Error('Friendbot funding failed. Try again in a moment.');
  }
}
