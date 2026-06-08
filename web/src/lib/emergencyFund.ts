import {
  Contract,
  TransactionBuilder,
  BASE_FEE,
  Account,
  Address,
  rpc,
  nativeToScVal,
  scValToNative,
} from '@stellar/stellar-sdk';
import { server, NETWORK_PASSPHRASE, CONTRACT_ID } from './stellar';

// Read-only simulation source — any funded testnet account works.
const READ_SOURCE = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

export type FundStatus = 'Armed' | 'Triggered' | 'NotInitialized';

export interface EmergencyFundRecord {
  id: bigint;
  sender: string;
  recipient: string;
  maxAmount: bigint;
  label: string;
}

export interface EmergencyFundState {
  id: bigint;
  sender: string;
  recipient: string;
  maxAmount: bigint;
  label: string;
  status: FundStatus;
  triggeredAt: number; // unix timestamp, 0 = not triggered
}

export function contractConfigured(): boolean {
  return Boolean(CONTRACT_ID);
}

function toRecord(raw: {
  id: bigint;
  sender: string;
  recipient: string;
  max_amount: bigint;
  label: string;
}): EmergencyFundRecord {
  return {
    id: raw.id,
    sender: raw.sender,
    recipient: raw.recipient,
    maxAmount: raw.max_amount,
    label: raw.label,
  };
}

async function resolveFundId(fundId?: bigint | number): Promise<bigint> {
  if (fundId !== undefined) return BigInt(fundId);
  const funds = await readFunds();
  if (!funds.length) {
    throw new Error('No active emergency funds found');
  }
  return funds[0].id;
}

/**
 * Read all active emergency funds via simulation — no wallet required.
 */
export async function readFunds(): Promise<EmergencyFundRecord[]> {
  if (!contractConfigured()) return null;

  const contract = new Contract(CONTRACT_ID);
  const source = new Account(READ_SOURCE, '0');

  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('get_funds'))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);

  if (!rpc.Api.isSimulationSuccess(sim) || !sim.result) {
    return [];
  }

  const raw = scValToNative(sim.result.retval) as Array<{
    id: bigint;
    sender: string;
    recipient: string;
    max_amount: bigint;
    label: string;
  }>;

  return raw.map(toRecord);
}

/**
 * Backwards-compatible single-fund reader.
 * Returns the first active fund or null if none exist.
 */
export async function readFundState(): Promise<EmergencyFundState | null> {
  const funds = await readFunds();
  const first = funds[0];
  if (!first) return null;

  return {
    ...first,
    status: 'Armed',
    triggeredAt: 0,
  };
}

/**
 * Build + simulate + assemble the setup() call XDR (unsigned).
 * The OFW signs this to initialise the emergency fund.
 */
export async function buildSetupXDR(
  senderAddress: string,
  recipientAddress: string,
  maxAmountUnits: bigint,
  label: string,
): Promise<string> {
  const contract = new Contract(CONTRACT_ID);
  const account = await server.getAccount(senderAddress);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'setup',
        new Address(senderAddress).toScVal(),
        new Address(recipientAddress).toScVal(),
        nativeToScVal(maxAmountUnits, { type: 'i128' }),
        nativeToScVal(label, { type: 'string' }),
      ),
    )
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (!rpc.Api.isSimulationSuccess(sim)) {
    const errMsg =
      'events' in sim
        ? JSON.stringify((sim as rpc.Api.SimulateTransactionErrorResponse).error)
        : 'Simulation failed';
    throw new Error(`Setup simulation failed: ${errMsg}`);
  }

  return rpc.assembleTransaction(tx, sim).build().toXDR();
}

/**
 * Build + simulate + assemble the trigger() call XDR (unsigned).
 * The recipient signs this to release the pre-authorised funds.
 */
export async function buildTriggerXDR(callerAddress: string, fundIdArg?: bigint | number): Promise<string> {
  const contract = new Contract(CONTRACT_ID);
  const account = await server.getAccount(callerAddress);
  const fundId = fundIdArg !== undefined ? BigInt(fundIdArg) : await resolveFundId();

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'trigger',
        new Address(callerAddress).toScVal(),
        nativeToScVal(fundId, { type: 'u64' }),
      ),
    )
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (!rpc.Api.isSimulationSuccess(sim)) {
    throw new Error('Trigger simulation failed — are you the registered recipient?');
  }

  return rpc.assembleTransaction(tx, sim).build().toXDR();
}

/**
 * Build + simulate + assemble the reset() call XDR (unsigned).
 * Only the original sender can reset.
 */
export async function buildResetXDR(): Promise<string> {
  throw new Error(
    'Reset is not used in multi-fund mode. Create a new fund or delete the current one.',
  );
}

/**
 * Build + simulate + assemble the delete() call XDR (unsigned).
 * Only the original sender can delete the current fund state.
 */
export async function buildDeleteXDR(senderAddress: string, fundIdArg?: bigint | number): Promise<string> {
  const contract = new Contract(CONTRACT_ID);
  const account = await server.getAccount(senderAddress);
  const fundId = fundIdArg !== undefined ? BigInt(fundIdArg) : await resolveFundId();

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        'delete',
        new Address(senderAddress).toScVal(),
        nativeToScVal(fundId, { type: 'u64' }),
      ),
    )
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (!rpc.Api.isSimulationSuccess(sim)) {
    throw new Error('Delete simulation failed - are you the registered sender?');
  }

  return rpc.assembleTransaction(tx, sim).build().toXDR();
}

/**
 * Build a pre-signed classic payment XDR that the OFW signs once.
 * The recipient stores this and broadcasts it after triggering.
 *
 * NOTE: Pre-signed classic transactions use time bounds to limit validity.
 * The recipient must broadcast within the time window.
 */
export async function buildPreSignedPaymentXDR(
  senderAddress: string,
  recipientAddress: string,
  amount: string,
  assetCode: 'XLM' | 'USDC',
  validUntilTimestamp: number,
): Promise<string> {
  const { Asset, Operation, TransactionBuilder: TB, BASE_FEE: BF } = await import('@stellar/stellar-sdk');
  const { server: srv, NETWORK_PASSPHRASE: NP, USDC_ISSUER } = await import('./stellar');

  const asset = assetCode === 'XLM' ? Asset.native() : new Asset('USDC', USDC_ISSUER);
  const account = await srv.getAccount(senderAddress);

  const tx = new TB(account, {
    fee: BF,
    networkPassphrase: NP,
  })
    .addOperation(
      Operation.payment({
        destination: recipientAddress,
        asset,
        amount,
      }),
    )
    .setTimeout(0) // will use time bounds instead
    .build();

  // Set time bounds so the pre-signed tx is only valid within the window
  tx.timeBounds = {
    minTime: 0,
    maxTime: validUntilTimestamp,
  };

  return tx.toXDR();
}
