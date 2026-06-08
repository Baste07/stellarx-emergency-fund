#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::Address as _,
    Env, String,
};

fn label(env: &Env, text: &str) -> String {
    String::from_str(env, text)
}

#[test]
fn test_setup_creates_multiple_funds() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(EmergencyFundContract, ());
    let client = EmergencyFundContractClient::new(&env, &contract_id);

    let sender = Address::generate(&env);
    let recipient_a = Address::generate(&env);
    let recipient_b = Address::generate(&env);

    client.setup(&sender, &recipient_a, &500_000_000i128, &label(&env, "Hospital"));
    client.setup(&sender, &recipient_b, &250_000_000i128, &label(&env, "School"));

    let funds = client.get_funds();
    assert_eq!(funds.len(), 2);
    assert_eq!(funds.get(0).unwrap().id, 1);
    assert_eq!(funds.get(1).unwrap().id, 2);
}

#[test]
fn test_trigger_removes_only_selected_fund() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(EmergencyFundContract, ());
    let client = EmergencyFundContractClient::new(&env, &contract_id);

    let sender = Address::generate(&env);
    let recipient_a = Address::generate(&env);
    let recipient_b = Address::generate(&env);

    client.setup(&sender, &recipient_a, &100i128, &label(&env, "A"));
    client.setup(&sender, &recipient_b, &200i128, &label(&env, "B"));

    client.trigger(&recipient_b, &2u64);

    let funds = client.get_funds();
    assert_eq!(funds.len(), 1);
    assert_eq!(funds.get(0).unwrap().id, 1);
}

#[test]
fn test_wrong_recipient_cannot_trigger() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(EmergencyFundContract, ());
    let client = EmergencyFundContractClient::new(&env, &contract_id);

    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);
    let attacker = Address::generate(&env);

    client.setup(&sender, &recipient, &100i128, &label(&env, "A"));

    let err = client.try_trigger(&attacker, &1u64).unwrap_err().unwrap();
    assert_eq!(err, Error::NotRecipient.into());
}

#[test]
fn test_sender_can_delete_specific_fund() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(EmergencyFundContract, ());
    let client = EmergencyFundContractClient::new(&env, &contract_id);

    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);

    client.setup(&sender, &recipient, &100i128, &label(&env, "A"));
    client.delete(&sender, &1u64);

    let funds = client.get_funds();
    assert_eq!(funds.len(), 0);
}

#[test]
fn test_only_sender_can_delete() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(EmergencyFundContract, ());
    let client = EmergencyFundContractClient::new(&env, &contract_id);

    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);

    client.setup(&sender, &recipient, &100i128, &label(&env, "A"));

    let err = client.try_delete(&recipient, &1u64).unwrap_err().unwrap();
    assert_eq!(err, Error::NotSender.into());
}

#[test]
fn test_invalid_amount_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let contract_id = env.register(EmergencyFundContract, ());
    let client = EmergencyFundContractClient::new(&env, &contract_id);

    let sender = Address::generate(&env);
    let recipient = Address::generate(&env);

    let err = client
        .try_setup(&sender, &recipient, &0i128, &label(&env, "A"))
        .unwrap_err()
        .unwrap();
    assert_eq!(err, Error::InvalidAmount.into());
}
