#!/usr/bin/env bash
# Deploy the emergency-fund Soroban contract to testnet and write the contract ID
# into web/.env.local so Next.js picks it up on the next `npm run dev`.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$SCRIPT_DIR/.."
ENV_FILE="$ROOT/web/.env.local"

echo "=== Building emergency-fund contract (release WASM) ==="
cd "$ROOT"
stellar contract build

WASM="$ROOT/target/wasm32v1-none/release/emergency_fund.wasm"
if [[ ! -f "$WASM" ]]; then
  echo "ERROR: WASM not found at $WASM"
  exit 1
fi

echo ""
echo "=== Deploying to testnet ==="
CONTRACT_ID=$(stellar contract deploy \
  --wasm "$WASM" \
  --source-account alice \
  --network testnet \
  --quiet)

echo "Contract ID: $CONTRACT_ID"

# Write / update .env.local
touch "$ENV_FILE"
if grep -q "NEXT_PUBLIC_CONTRACT_ID" "$ENV_FILE"; then
  sed -i.bak "s|NEXT_PUBLIC_CONTRACT_ID=.*|NEXT_PUBLIC_CONTRACT_ID=$CONTRACT_ID|" "$ENV_FILE"
else
  echo "NEXT_PUBLIC_CONTRACT_ID=$CONTRACT_ID" >> "$ENV_FILE"
fi

echo ""
echo "✅  Contract deployed!"
echo "    web/.env.local updated with NEXT_PUBLIC_CONTRACT_ID=$CONTRACT_ID"
echo "    Restart 'npm run dev' to apply."
