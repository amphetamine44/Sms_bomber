from flask import Flask, request, jsonify
import asyncio
import sys
import os

# Add project root to path so we can import core modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.bomber import Bomber
from core.utils import load_provider_pool, load_working_providers

app = Flask(__name__)

@app.route('/api/bomb', methods=['POST'])
def bomb():
    data = request.get_json()
    target = data.get('target')
    country = data.get('country', '91')
    sms = data.get('sms', 20)
    threads = data.get('threads', 20)

    if not target:
        return jsonify({'error': 'Missing target'}), 400

    # Use provider pool (either working cache or fallback)
    provider_pool = load_working_providers()
    if not provider_pool:
        provider_pool = load_provider_pool()  # fallback to all providers

    bomber = Bomber(
        target=target,
        cc=country,
        num_requests=sms,
        max_concurrent=threads,
        provider_pool=provider_pool,
        retries=1,
        delay_range=(0.5, 1.0)
    )

    # Run the async bombing in a synchronous wrapper
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    results = loop.run_until_complete(bomber.run())
    loop.close()

    return jsonify(results)

# For local testing (not used on Vercel)
if __name__ == '__main__':
    app.run(debug=True)
