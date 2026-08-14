# SMS Testing Framework

## Overview
This is a research project for testing SMS delivery mechanisms. It provides a modular, asynchronous framework to send SMS requests via configurable providers.

## Installation
pip install -r requirements.txt

## Usage
1. Edit `config/providers.json` with your endpoints (provide API keys).
2. Verify working providers:
   python main.py verify 1234567890 --country 1
3. Send test requests:
   python main.py bomb 1234567890 --country 1 --sms 5

## Provider Configuration
See `config/providers.json` for examples. Add your own endpoints with required authentication.

## Legal Disclaimer
This tool is for authorized testing only. You must have explicit permission to send SMS to any number.
