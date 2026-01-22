#!/usr/bin/env python3
"""
Upload risk scores to RiskRegistry contract on Base in batches.
"""
import json
import os
import time
from web3 import Web3

CONTRACT_ADDRESS = "0x12E98FB4ec93c7e61ef4B8A81D29ADD0a626E8Cd"
BASE_RPC = "https://mainnet.base.org"
BATCH_SIZE = 100  # Upload 100 at a time

ABI = [
    {
        "inputs": [
            {"name": "profileIds", "type": "uint256[]"},
            {"name": "scores", "type": "uint8[]"}
        ],
        "name": "batchUpdateRiskScores",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    },
    {
        "inputs": [],
        "name": "totalProfiles",
        "outputs": [{"type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
    },
    {
        "inputs": [{"name": "profileId", "type": "uint256"}],
        "name": "getRiskScore",
        "outputs": [{"type": "uint8"}],
        "stateMutability": "view",
        "type": "function"
    }
]

def main():
    private_key = os.environ.get("DEPLOYER_PRIVATE_KEY") or os.environ.get("PRIVATE_KEY")
    if not private_key:
        print("ERROR: Set DEPLOYER_PRIVATE_KEY environment variable")
        return

    w3 = Web3(Web3.HTTPProvider(BASE_RPC))
    print(f"Connected to Base: {w3.is_connected()}")

    account = w3.eth.account.from_key(private_key)
    print(f"Account: {account.address}")

    balance = w3.eth.get_balance(account.address)
    print(f"Balance: {w3.from_wei(balance, 'ether')} ETH")

    contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=ABI)

    # Load data
    with open("upload_data.json") as f:
        data = json.load(f)

    profile_ids = data["profileIds"]
    scores = data["scores"]

    total = len(profile_ids)
    print(f"\nUploading {total} profiles in batches of {BATCH_SIZE}...")

    success_count = 0
    for i in range(0, total, BATCH_SIZE):
        batch_ids = profile_ids[i:i+BATCH_SIZE]
        batch_scores = scores[i:i+BATCH_SIZE]
        batch_num = i // BATCH_SIZE + 1
        total_batches = (total + BATCH_SIZE - 1) // BATCH_SIZE

        print(f"\n[Batch {batch_num}/{total_batches}] Uploading {len(batch_ids)} profiles...")

        try:
            nonce = w3.eth.get_transaction_count(account.address)
            gas_price = w3.eth.gas_price

            tx = contract.functions.batchUpdateRiskScores(
                batch_ids,
                batch_scores
            ).build_transaction({
                "from": account.address,
                "nonce": nonce,
                "gas": 2000000,
                "gasPrice": int(gas_price * 1.1),
                "chainId": 8453
            })

            signed = account.sign_transaction(tx)
            tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
            print(f"  TX: {tx_hash.hex()}")

            receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)

            if receipt.status == 1:
                print(f"  ✅ Success! Gas: {receipt.gasUsed}")
                success_count += len(batch_ids)
            else:
                print(f"  ❌ Failed!")
                break

            time.sleep(1)  # Brief pause between batches

        except Exception as e:
            print(f"  ❌ Error: {e}")
            break

    print(f"\n{'='*50}")
    print(f"Uploaded {success_count}/{total} profiles")

    # Verify a few
    print("\nVerifying...")
    test_ids = [12928, 24280, 5538]  # High risk profiles
    for pid in test_ids:
        score = contract.functions.getRiskScore(pid).call()
        print(f"  Profile {pid}: score = {score}")

if __name__ == "__main__":
    main()
