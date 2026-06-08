# Emergency Fund Trigger

## Idea
- **Track:** Remittance / Financial Inclusion
- **Idea # (from the 300-ideas list):** 6
- **One-liner:** Pre-authorize an emergency fund so your family back home can trigger
  an instant transfer any time — no need to wake the OFW at 3 AM.

## Problem
Overseas Filipino Workers (OFWs) are the backbone of Philippine remittances —
sending over $36 billion home each year. But when a family emergency strikes
(hospitalization, natural disaster, urgent bill), the recipient often cannot reach
the OFW immediately due to time zones, work schedules, or poor connectivity.
Traditional wire transfers require the sender to initiate — leaving families
stranded in a crisis until the OFW wakes up or gets to a phone.

## How it uses Stellar
- **Soroban smart contract** — `emergency-fund` stores the sender/recipient pair,
  max amount, label, and status (`Armed` / `Triggered`) on-chain. It enforces that
  only the designated recipient can trigger, and only the sender can reset.
- **Pre-signed classic transactions** — The OFW pre-signs a payment XDR once
  (stored client-side). When the Soroban trigger is confirmed, the frontend
  broadcasts the pre-signed XDR automatically.
- **Multi-signature concept** — Two keys are required across the lifecycle: the
  sender arms it (Soroban `setup`), the recipient fires it (Soroban `trigger` +
  payment broadcast). Neither alone can complete the wrong action.
- **Freighter wallet** — Dynamic import, Freighter v6 `signTransaction` pattern.
- **Horizon** — Balance reads for both accounts.
- **Testnet Friendbot** — Easy onboarding for demo.

## What works in the demo
- [x] Connect wallet (Freighter, testnet)
- [x] OFW arms the fund: sets recipient, max amount, label → Soroban `setup()`
- [x] Live fund status panel (Armed / Triggered)
- [x] Recipient triggers the fund → Soroban `trigger()` + payment broadcast
- [x] OFW resets the fund after emergency → Soroban `reset()`
- [x] Full Stellar Expert explorer links for every transaction

## Setup / run

### Prerequisites
- Node.js ≥ 18, pnpm or npm
- Freighter browser extension set to **Test Net**
- Rust + `stellar contract build` (for the Soroban contract)

### Web frontend
```bash
cd web
npm install
cp .env.example .env.local   # fill in NEXT_PUBLIC_CONTRACT_ID after deploy
npm run dev
```

### Contract deploy (Windows)
```powershell
.\scripts\deploy.ps1
```
### Contract deploy (Linux/macOS)
```bash
./scripts/deploy.sh
```
The script builds the WASM, deploys to testnet, and writes
`NEXT_PUBLIC_CONTRACT_ID=C…` into `web/.env.local`.  
Restart `npm run dev` after that.

## Demo
- 2–4 min video link: _(record after workshop)_
- Public repo link: _(add after pushing to GitHub)_

## Submission checklist
- [ ] Public GitHub repo with MIT license
- [ ] README explains problem, Stellar usage, and setup
- [ ] Demo video (2–4 min)
- [ ] Submitted via the workshop's official GitHub issue template
