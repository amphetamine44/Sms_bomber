#!/usr/bin/env python3
import asyncio
import argparse
import sys
from core.bomber import Bomber
from core.utils import load_provider_pool, save_working_cache
from core.tester import ProviderTester  # (we'll define this)
from core.discovery import ProviderDiscoverer

async def bomb(args):
    pool = load_provider_pool()
    if args.verify_only:
        working = await ProviderTester.validate_pool(pool, args.target, args.country)
        save_working_cache(working)
        print(f"Verified {len(working)} working providers.")
        return
    bomber = Bomber(
        target=args.target,
        cc=args.country,
        num_requests=args.sms,
        max_concurrent=args.threads,
        use_proxy=args.proxy,
        retries=args.retries
    )
    results = await bomber.run()
    print(f"Success: {results['success']} | Failed: {results['failed']}")

async def verify(args):
    pool = load_provider_pool()
    working = await ProviderTester.validate_pool(pool, args.target, args.country)
    save_working_cache(working)
    print(f"Verified {len(working)} providers out of {len(pool)}.")

async def update(args):
    providers = await ProviderDiscoverer.fetch_public()
    if providers:
        with open("config/providers.json", "w") as f:
            json.dump({"providers": providers}, f, indent=2)
        print(f"Updated providers list with {len(providers)} entries.")
    else:
        print("No public providers fetched.")

def main():
    parser = argparse.ArgumentParser(description="SMS Testing Framework")
    subparsers = parser.add_subparsers(dest="command", required=True)

    bomb_parser = subparsers.add_parser("bomb", help="Send SMS requests")
    bomb_parser.add_argument("target", help="Phone number (without country code)")
    bomb_parser.add_argument("--country", "-c", default="91", help="Country code")
    bomb_parser.add_argument("--sms", "-S", type=int, default=20, help="Number of requests")
    bomb_parser.add_argument("--threads", "-T", type=int, default=20, help="Concurrency")
    bomb_parser.add_argument("--proxy", "-p", action="store_true", help="Use proxies")
    bomb_parser.add_argument("--retries", "-r", type=int, default=2, help="Retry attempts")
    bomb_parser.add_argument("--verify-only", action="store_true", help="Only verify providers")

    verify_parser = subparsers.add_parser("verify", help="Verify and cache working providers")
    verify_parser.add_argument("target", help="Test phone number (without country code)")
    verify_parser.add_argument("--country", "-c", default="91", help="Country code")

    update_parser = subparsers.add_parser("update", help="Fetch public provider list (research)")

    args = parser.parse_args()
    if args.command == "bomb":
        asyncio.run(bomb(args))
    elif args.command == "verify":
        asyncio.run(verify(args))
    elif args.command == "update":
        asyncio.run(update(args))

if __name__ == "__main__":
    main()
