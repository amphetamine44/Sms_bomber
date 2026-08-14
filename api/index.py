import sys
import os
import json
from flask import Flask, request, jsonify

# Add project root to Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.bomber import Bomber
from core.utils import load_working_providers, load_provider_pool

app = Flask(__name__)

@app.route('/api/bomb', methods=['POST'])
def bomb():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Missing JSON body'}), 400

        target = data.get('target')
        country = data.get('country', '91')
        sms = int(data.get('sms', 20))
        threads = int(data.get('threads', 20))

        if not target:
            return jsonify({'error': 'Missing target'}), 400

        # Load providers
        provider_pool = load_working_providers()
        if not provider_pool:
            provider_pool = load_provider_pool()

        if not provider_pool:
            return jsonify({'error': 'No providers available'}), 500

        bomber = Bomber(
            target=target,
            cc=country,
            num_requests=sms,
            max_concurrent=threads,
            provider_pool=provider_pool,
            retries=1,
            delay_range=(0.5, 1.0)
        )

        # Run async
        import asyncio
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        results = loop.run_until_complete(bomber.run())
        loop.close()

        return jsonify(results)

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Vercel expects a variable named 'app'
# This is already defined.
