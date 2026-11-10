#![no_std]

use soroban_sdk::{contract, contractimpl, contracttype, Address, Env};

const FEE_BPS: u32 = 30; // 0.30%

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct ReserveKey {
    pub token_a: Address,
    pub token_b: Address,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct Reserves {
    pub a: i128,
    pub b: i128,
}

#[contract]
pub struct AmmSimple;

#[contractimpl]
impl AmmSimple {
    /// Inicializa el pool con reservas iniciales.
    pub fn initialize(env: Env, token_a: Address, token_b: Address, amount_a: i128, amount_b: i128) {
        let key = ReserveKey {
            token_a: token_a.clone(),
            token_b: token_b.clone(),
        };
        let existing = env.storage().persistent().get::<ReserveKey, Reserves>(&key);
        if existing.is_some() {
            panic!("pool already initialized");
        }
        env.storage().persistent().set(
            &key,
            &Reserves { a: amount_a, b: amount_b },
        );
    }

    /// Swap exact-in: devuelve la cantidad de token_out recibida.
    /// amount_out_min protege contra slippage.
    pub fn swap(
        env: Env,
        token_in: Address,
        token_out: Address,
        amount_in: i128,
        amount_out_min: i128,
    ) -> i128 {
        let key = ReserveKey {
            token_a: token_in.clone(),
            token_b: token_out.clone(),
        };
        let mut reserves = env
            .storage()
            .persistent()
            .get::<ReserveKey, Reserves>(&key)
            .expect("pool not initialized");

        let amount_in_net = amount_in * (10000 - FEE_BPS) as i128 / 10000;

        let x = reserves.a;
        let y = reserves.b;
        let amount_out = (y * amount_in_net) / (x + amount_in_net);

        if amount_out <= 0 {
            panic!("insufficient output");
        }
        if amount_out < amount_out_min {
            panic!("amount_out_min not met");
        }

        reserves.a = x + amount_in_net;
        reserves.b = y - amount_out;
        env.storage().persistent().set(&key, &reserves);

        amount_out
    }

    /// Obtener reservas del pool.
    pub fn get_reserves(env: Env, token_a: Address, token_b: Address) -> Reserves {
        let key = ReserveKey { token_a, token_b };
        env.storage()
            .persistent()
            .get::<ReserveKey, Reserves>(&key)
            .expect("pool not initialized")
    }

    /// Precio marginal spot: token_b por unidad de token_a (en unidades base 1e7).
    pub fn get_price(env: Env, token_a: Address, token_b: Address) -> i128 {
        let reserves = Self::get_reserves(env, token_a, token_b);
        if reserves.a == 0 {
            return 0;
        }
        (reserves.b * 1_0000000) / reserves.a
    }
}
