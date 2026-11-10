#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, Symbol, Vec};

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub enum DataKey {
    Balance(Address),
    Allowance(Address, Address),
    Admin,
    Decimals,
    Name,
    Symbol,
}

#[contract]
pub struct SimpleToken;

#[contractimpl]
impl SimpleToken {
    pub fn initialize(env: Env, admin: Address, decimals: u32, name: Symbol, symbol: Symbol) {
        env.storage().persistent().set(&DataKey::Admin, &admin);
        env.storage().persistent().set(&DataKey::Decimals, &decimals);
        env.storage().persistent().set(&DataKey::Name, &name);
        env.storage().persistent().set(&DataKey::Symbol, &symbol);
    }

    pub fn admin(env: Env) -> Address {
        env.storage().persistent().get(&DataKey::Admin).expect("admin not set")
    }

    pub fn decimals(env: Env) -> u32 {
        env.storage().persistent().get(&DataKey::Decimals).unwrap_or(7)
    }

    pub fn name(env: Env) -> Symbol {
        env.storage().persistent().get(&DataKey::Name).unwrap_or(Symbol::short("Token"))
    }

    pub fn symbol(env: Env) -> Symbol {
        env.storage().persistent().get(&DataKey::Symbol).unwrap_or(Symbol::short("TKN"))
    }

    pub fn balance(env: Env, id: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Balance(id.clone()))
            .unwrap_or(0)
    }

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();
        let from_balance = Self::balance(env.clone(), from.clone());
        if from_balance < amount {
            panic!("insufficient balance");
        }
        env.storage()
            .persistent()
            .set(&DataKey::Balance(from.clone()), &(from_balance - amount));
        let to_balance = Self::balance(env.clone(), to.clone());
        env.storage()
            .persistent()
            .set(&DataKey::Balance(to), &(to_balance + amount));
    }

    pub fn mint(env: Env, to: Address, amount: i128) {
        let admin = Self::admin(env.clone());
        admin.require_auth();
        let to_balance = Self::balance(env.clone(), to.clone());
        env.storage()
            .persistent()
            .set(&DataKey::Balance(to), &(to_balance + amount));
    }

    pub fn allowance(env: Env, from: Address, spender: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Allowance(from.clone(), spender.clone()))
            .unwrap_or(0)
    }

    pub fn approve(env: Env, from: Address, spender: Address, amount: i128, expiration_latest: u64) {
        from.require_auth();
        env.storage()
            .persistent()
            .set(&DataKey::Allowance(from, spender), &amount);
    }

    pub fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128) {
        spender.require_auth();
        let allowance = Self::allowance(env.clone(), from.clone(), spender.clone());
        if allowance < amount {
            panic!("insufficient allowance");
        }
        env.storage()
            .persistent()
            .set(
                &DataKey::Allowance(from.clone(), spender.clone()),
                &(allowance - amount),
            );
        Self::transfer(env, from, to, amount);
    }
}
