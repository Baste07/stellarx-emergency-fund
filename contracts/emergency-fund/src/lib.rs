#![no_std]
//! Emergency Fund Trigger — StellarX PUP Workshop
//!
//! An OFW (Overseas Filipino Worker) can create multiple emergency funds for
//! different recipients, labels, or family members. Each fund is independent,
//! so one person can manage several standing emergency allocations.
//!
//! Flow:
//!  1. `setup(sender, recipient, max_amount, label)` — creates a new fund.
//!  2. `trigger(caller, fund_id)` — recipient triggers and consumes that fund.
//!  3. `delete(caller, fund_id)` — sender deletes that fund manually.
//!  4. `get_funds()` — read-only; returns all active funds.

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, Address, Env, String, Vec};

// ── Data types ───────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, PartialEq, Debug)]
pub struct FundRecord {
    pub id: u64,
    pub sender: Address,
    pub recipient: Address,
    /// Max amount (in stroops if XLM, or smallest unit) the recipient can claim.
    pub max_amount: i128,
    /// Human-readable label (e.g. "Hospital emergency - up to 500 USDC").
    pub label: String,
}

#[contracttype]
pub enum DataKey {
    NextId,
    Fund(u64),
}

// ── Errors ───────────────────────────────────────────────────────────────────

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    NotRecipient = 3,
    NotSender = 4,
    InvalidAmount = 5,
}

// ── Contract ─────────────────────────────────────────────────────────────────

#[contract]
pub struct EmergencyFundContract;

#[contractimpl]
impl EmergencyFundContract {
    /// Initialise a new emergency fund. Called by the OFW (sender).
    ///
    /// * `sender`     — OFW's Stellar address (must authorise this call).
    /// * `recipient`  — Family member's Stellar address.
    /// * `max_amount` — Maximum amount the recipient may claim (in token units).
    /// * `label`      — Short description stored on-chain.
    pub fn setup(
        env: Env,
        sender: Address,
        recipient: Address,
        max_amount: i128,
        label: String,
    ) -> Result<(), Error> {
        if max_amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        // Require the sender to authorise this transaction.
        sender.require_auth();

        let next_id: u64 = env.storage().instance().get(&DataKey::NextId).unwrap_or(1);
        let fund = FundRecord {
            id: next_id,
            sender,
            recipient,
            max_amount,
            label,
        };

        env.storage().instance().set(&DataKey::Fund(next_id), &fund);
        env.storage().instance().set(&DataKey::NextId, &(next_id + 1));
        env.storage().instance().extend_ttl(1000, 5000);

        Ok(())
    }

    /// Trigger a specific emergency fund. Called by the recipient.
    ///
    /// Triggering consumes the fund by deleting it from storage.
    pub fn trigger(env: Env, caller: Address, fund_id: u64) -> Result<(), Error> {
        let fund: FundRecord = env
            .storage()
            .instance()
            .get(&DataKey::Fund(fund_id))
            .ok_or(Error::NotInitialized)?;

        // Only the designated recipient may trigger.
        if caller != fund.recipient {
            return Err(Error::NotRecipient);
        }
        caller.require_auth();

        env.storage().instance().remove(&DataKey::Fund(fund_id));
        env.storage().instance().extend_ttl(1000, 5000);
        Ok(())
    }

    /// Delete the current fund configuration.
    /// Only the original sender may delete.
    pub fn delete(env: Env, caller: Address, fund_id: u64) -> Result<(), Error> {
        let fund: FundRecord = env
            .storage()
            .instance()
            .get(&DataKey::Fund(fund_id))
            .ok_or(Error::NotInitialized)?;

        if caller != fund.sender {
            return Err(Error::NotSender);
        }
        caller.require_auth();

        env.storage().instance().remove(&DataKey::Fund(fund_id));
        env.storage().instance().extend_ttl(1000, 5000);
        Ok(())
    }

    /// Read all active funds — no wallet required.
    pub fn get_funds(env: Env) -> Result<Vec<FundRecord>, Error> {
        let next_id: u64 = env.storage().instance().get(&DataKey::NextId).unwrap_or(1);
        let mut funds = Vec::new(&env);

        for id in 1..next_id {
            if let Some(fund) = env.storage().instance().get(&DataKey::Fund(id)) {
                funds.push_back(fund);
            }
        }

        Ok(funds)
    }
}

mod test;
