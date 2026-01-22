#!/usr/bin/env python3
"""
Upload risk scores to RiskRegistry contract on Base.
Requires: pip install web3
"""
import json
import os
from web3 import Web3

# Contract details
CONTRACT_ADDRESS = "0x12E98FB4ec93c7e61ef4B8A81D29ADD0a626E8Cd"
BASE_RPC = "https://mainnet.base.org"

# ABI for batchUpdateRiskScores
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
        "inputs": [],
        "name": "owner",
        "outputs": [{"type": "address"}],
        "stateMutability": "view",
        "type": "function"
    }
]

def main():
    # Get private key from environment or prompt
    private_key = os.environ.get("DEPLOYER_PRIVATE_KEY") or os.environ.get("PRIVATE_KEY")
    if not private_key:
        private_key = input("Enter deployer private key (with 0x prefix): ").strip()

    # Connect to Base
    w3 = Web3(Web3.HTTPProvider(BASE_RPC))
    print(f"Connected to Base: {w3.is_connected()}")
    print(f"Chain ID: {w3.eth.chain_id}")

    # Setup account
    account = w3.eth.account.from_key(private_key)
    print(f"Using account: {account.address}")

    # Setup contract
    contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=ABI)

    # Check owner
    owner = contract.functions.owner().call()
    print(f"Contract owner: {owner}")

    if account.address.lower() != owner.lower():
        print(f"ERROR: Your account is not the owner!")
        print(f"Your address: {account.address}")
        print(f"Owner address: {owner}")
        return

    # Load data
    with open("upload_data.json") as f:
        data = json.load(f)

    profile_ids = data["profileIds"]
    scores = data["scores"]

    print(f"\nUploading {len(profile_ids)} profiles...")
    print(f"Score range: {min(scores)} - {max(scores)}")

    # Build transaction
    nonce = w3.eth.get_transaction_count(account.address)
    gas_price = w3.eth.gas_price

    tx = contract.functions.batchUpdateRiskScores(
        profile_ids,
        scores
    ).build_transaction({
        "from": account.address,
        "nonce": nonce,
        "gas": 5000000,  # 5M gas limit for batch
        "gasPrice": gas_price,
        "chainId": 8453  # Base mainnet
    })

    # Estimate gas
    try:
        gas_estimate = w3.eth.estimate_gas(tx)
        print(f"Estimated gas: {gas_estimate}")
        tx["gas"] = int(gas_estimate * 1.2)  # Add 20% buffer
    except Exception as e:
        print(f"Gas estimation failed: {e}")
        print("Using default 5M gas")

    # Sign and send
    signed = account.sign_transaction(tx)

    print(f"\nSending transaction...")
    tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
    print(f"TX Hash: {tx_hash.hex()}")
    print(f"Basescan: https://basescan.org/tx/{tx_hash.hex()}")

    # Wait for confirmation
    print("\nWaiting for confirmation...")
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)

    if receipt.status == 1:
        print(f"SUCCESS! Gas used: {receipt.gasUsed}")

        # Verify
        total = contract.functions.totalProfiles().call()
        print(f"Total profiles in contract: {total}")
    else:
        print("FAILED! Transaction reverted.")

if __name__ == "__main__":
    main()
