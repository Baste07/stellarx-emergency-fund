# 🆘 Emergency Fund Trigger

> **StellarX PUP Workshop · Project #6 · Remittance / Financial Inclusion**

Pre-authorize an emergency transfer so your family back home can trigger it instantly
— any time, any hour — without needing to reach you first.

## The Problem

OFWs can't always be reached during a family emergency. Time zones, night shifts, and
spotty connectivity mean a hospitalized parent or flooded home can go unfunded for hours.

## The Solution

The OFW **arms** the fund once (signs a Soroban transaction + a pre-signed payment XDR).
The recipient **triggers** it with a single tap when the emergency happens. No phone call
needed. No waiting. Funds land in seconds on Stellar.

## How it uses Stellar

| Feature | Usage |
|---|---|
| **Soroban contract** | Stores sender/recipient pair, max amount, status on-chain |
| **Pre-signed transactions** | OFW signs the payment XDR once; it's broadcast on trigger |
| **Multi-sig pattern** | Sender arms, recipient fires — two keys, two phases |
| **Freighter v6** | Dynamic import, `signTransaction` returns `{ signedTxXdr }` |
| **Horizon** | Balance reads for both accounts |
| **Testnet Friendbot** | One-click account funding for demo |

## Quick Start

```bash
# 1. Deploy the contract (testnet)
./scripts/deploy.sh          # Linux/macOS
# or
.\scripts\deploy.ps1         # Windows PowerShell

# 2. Start the frontend
cd web
npm install
# edit .env.local — NEXT_PUBLIC_CONTRACT_ID is written by the deploy script
npm run dev
```

Open http://localhost:3000, connect Freighter (Test Net), and fund your account.

## Project Structure

```
contracts/emergency-fund/   Rust Soroban contract
  src/lib.rs                setup / trigger / reset / get_state
  src/test.rs               7 unit tests

web/src/
  lib/emergencyFund.ts      Contract reads & XDR builders
  lib/payment.ts            Classic payment build/submit/poll
  lib/stellar.ts            Network config
  components/
    SetupFund.tsx           OFW arms the fund
    TriggerFund.tsx         Recipient triggers + payment broadcast
    ResetFund.tsx           OFW re-arms the fund
    FundStatusPanel.tsx     Live Armed / Triggered status display
  app/page.tsx              Main UI — role-aware routing
```

## Contract API

| Function | Caller | Description |
|---|---|---|
| `setup(sender, recipient, max_amount, label)` | OFW | Initialize the fund once |
| `trigger(caller)` | Recipient | Record trigger on-chain |
| `reset(caller)` | Sender | Re-arm for future use |
| `get_state()` | Anyone | Read current fund state |

## Network

Everything runs on **Stellar Testnet** only.

- RPC: `https://soroban-testnet.stellar.org`
- Horizon: `https://horizon-testnet.stellar.org`
- Explorer: `https://stellar.expert/explorer/testnet`
