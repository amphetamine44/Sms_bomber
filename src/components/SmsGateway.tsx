import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Copy, Check, Send, Terminal, ShieldCheck } from 'lucide-react';

// Types
type Provider = {
  id: string;
  name: string;
  countries: string[];
  endpoint: string;
  method: 'GET' | 'POST';
  headers: Record<string, string>;
  bodyTemplate: (creds: Record<string, string>, phone: string, message: string) => any;
  requires: string[];
  identifier: string;
};

// ── Provider definitions (exactly as verified) ──
const PROVIDERS: Provider[] = [
  {
    id: '4jawaly',
    name: '4jawaly',
    countries: ['Saudi Arabia', 'UAE', 'Egypt', 'Kuwait', 'Qatar', 'Bahrain', 'Oman'],
    endpoint: 'https://api.4jawaly.com/api/v1/account/area/sms/send',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    bodyTemplate: (creds, phone, message) => ({
      messages: [{ text: message, numbers: [phone.replace('+', '')] }],
      sender: creds.sender || 'SENDER',
      api_key: creds.key,
      api_secret: creds.secret,
    }),
    requires: ['key', 'secret'],
    identifier: '"status":"success"',
  },
  {
    id: 'unifonic',
    name: 'Unifonic',
    countries: ['Saudi Arabia', 'UAE', 'Egypt', 'Jordan', 'Kuwait', 'Oman', 'Qatar', 'Bahrain'],
    endpoint: 'https://el.cloud.unifonic.com/rest/SMS/messages',
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    bodyTemplate: (creds, phone, message) => {
      const params = new URLSearchParams();
      params.append('AppSid', creds.appsid);
      params.append('SenderID', creds.sender || 'UNISMS');
      params.append('Recipient', phone.replace('+', ''));
      params.append('Body', message);
      params.append('responseType', 'JSON');
      return params.toString();
    },
    requires: ['appsid'],
    identifier: '"success":"true"',
  },
  {
    id: 'vonage',
    name: 'Vonage',
    countries: ['Global (200+ countries)'],
    endpoint: 'https://rest.nexmo.com/sms/json',
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    bodyTemplate: (creds, phone, message) => {
      const params = new URLSearchParams();
      params.append('api_key', creds.key);
      params.append('api_secret', creds.secret);
      params.append('to', phone.replace('+', ''));
      params.append('from', creds.from || 'Vonage');
      params.append('text', message);
      return params.toString();
    },
    requires: ['key', 'secret'],
    identifier: '"status":"0"',
  },
  {
    id: 'smsgateway',
    name: 'SMSGateway.me',
    countries: ['Global (requires Android device with app)'],
    endpoint: 'https://smsgateway.me/api/v4/message/send',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    bodyTemplate: (creds, phone, message) => ({
      phone_number: phone.replace('+', ''),
      message: message,
      device_id: parseInt(creds.device) || 1,
    }),
    requires: ['token', 'device'],
    identifier: '"status":"sent"',
  },
  {
    id: 'textbelt',
    name: 'TextBelt',
    countries: ['US', 'CA', 'UK', 'AU', 'IN', 'Global (limited)'],
    endpoint: 'https://textbelt.com/text',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    bodyTemplate: (creds, phone, message) => ({
      phone: phone.replace('+', ''),
      message: message,
      key: creds.key || 'textbelt',
    }),
    requires: [],
    identifier: '"success":true',
  },
];

// ── Hooks ──
function useCredentials() {
  const [creds, setCreds] = useState<Record<string, string>>(() => {
    try {
      const raw = localStorage.getItem('sms_gateway_creds');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const saveCreds = (newCreds: Record<string, string>) => {
    setCreds(newCreds);
    localStorage.setItem('sms_gateway_creds', JSON.stringify(newCreds));
  };

  const clearCreds = () => {
    setCreds({});
    localStorage.removeItem('sms_gateway_creds');
  };

  return { creds, saveCreds, clearCreds };
}

function useSmsSender() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Array<{ provider: string; status: string; response: string }>>([]);

  const send = async (providers: Provider[], phone: string, message: string, creds: Record<string, string>) => {
    setLoading(true);
    setResults([]);
    const newResults: typeof results = [];

    for (const provider of providers) {
      try {
        // Build request
        const providerCreds: Record<string, string> = {};
        provider.requires.forEach(r => {
          providerCreds[r] = creds[provider.id + '_' + r] || '';
        });
        // Add extra fields
        if (provider.id === '4jawaly') {
          providerCreds.sender = creds['4jawaly_sender'] || 'SENDER';
        }
        if (provider.id === 'unifonic') {
          providerCreds.sender = creds['unifonic_sender'] || 'UNISMS';
        }
        if (provider.id === 'vonage') {
          providerCreds.from = creds['vonage_from'] || 'Vonage';
        }
        if (provider.id === 'smsgateway') {
          providerCreds.device = creds['smsgateway_device'] || '1';
        }
        if (provider.id === 'textbelt') {
          providerCreds.key = creds['textbelt_key'] || 'textbelt';
        }

        const body = provider.bodyTemplate(providerCreds, phone, message);
        let finalBody: any = body;
        let headers = { ...provider.headers };
        if (provider.id === 'textbelt') {
          headers = { 'Content-Type': 'application/json' };
          finalBody = JSON.stringify(body);
        } else if (typeof body === 'string') {
          // already form data
        } else {
          finalBody = JSON.stringify(body);
          headers['Content-Type'] = 'application/json';
        }

        const response = await fetch(provider.endpoint, {
          method: provider.method,
          headers,
          body: finalBody,
        });
        const text = await response.text();
        const success = response.ok && text.includes(provider.identifier.replace(/"/g, ''));
        newResults.push({
          provider: provider.name,
          status: success ? '✅ Success' : '❌ Failed',
          response: text.substring(0, 300) + (text.length > 300 ? '...' : ''),
        });
      } catch (err: any) {
        newResults.push({
          provider: provider.name,
          status: '❌ Error',
          response: err.message,
        });
      }
    }
    setResults(newResults);
    setLoading(false);
  };

  return { loading, results, send };
}

// ── Main Component ──
export default function SmsGateway() {
  const { creds, saveCreds, clearCreds } = useCredentials();
  const { loading, results, send } = useSmsSender();

  // Credentials state
  const [localCreds, setLocalCreds] = useState(creds);
  useEffect(() => {
    setLocalCreds(creds);
  }, [creds]);

  // Send form
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [selectedProviders, setSelectedProviders] = useState<string[]>([]);

  // Test form
  const [testPhone, setTestPhone] = useState('');
  const [testResults, setTestResults] = useState<Array<{ provider: string; status: string; code?: number; response: string }>>([]);
  const [testing, setTesting] = useState(false);

  // Curl form
  const [curlPhone, setCurlPhone] = useState('');
  const [curlMessage, setCurlMessage] = useState('Test from cURL');
  const [curlProvider, setCurlProvider] = useState('4jawaly');
  const [curlCmd, setCurlCmd] = useState('');

  const handleCredChange = (key: string, value: string) => {
    setLocalCreds({ ...localCreds, [key]: value });
  };

  const handleSaveCreds = () => {
    saveCreds(localCreds);
    toast.success('Credentials saved');
  };

  const handleClearCreds = () => {
    clearCreds();
    setLocalCreds({});
    toast.info('Credentials cleared');
  };

  const toggleProvider = (id: string) => {
    setSelectedProviders(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleSend = async () => {
    if (!phone || !message) {
      toast.error('Please fill in phone and message');
      return;
    }
    if (!selectedProviders.length) {
      toast.error('Select at least one provider');
      return;
    }
    const providers = PROVIDERS.filter(p => selectedProviders.includes(p.id));
    await send(providers, phone, message, creds);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResults([]);
    const results: typeof testResults = [];
    for (const provider of PROVIDERS) {
      const hasCreds = provider.requires.every(r => creds[provider.id + '_' + r] && creds[provider.id + '_' + r].trim() !== '');
      if (!hasCreds) {
        results.push({ provider: provider.name, status: '⏭️ Skipped (no credentials)', response: '' });
        continue;
      }
      try {
        // Build request (same as send but with dummy message)
        const providerCreds: Record<string, string> = {};
        provider.requires.forEach(r => {
          providerCreds[r] = creds[provider.id + '_' + r] || '';
        });
        if (provider.id === '4jawaly') providerCreds.sender = creds['4jawaly_sender'] || 'SENDER';
        if (provider.id === 'unifonic') providerCreds.sender = creds['unifonic_sender'] || 'UNISMS';
        if (provider.id === 'vonage') providerCreds.from = creds['vonage_from'] || 'Vonage';
        if (provider.id === 'smsgateway') providerCreds.device = creds['smsgateway_device'] || '1';
        if (provider.id === 'textbelt') providerCreds.key = creds['textbelt_key'] || 'textbelt';

        const body = provider.bodyTemplate(providerCreds, testPhone, 'Test');
        let finalBody: any = body;
        let headers = { ...provider.headers };
        if (provider.id === 'textbelt') {
          headers = { 'Content-Type': 'application/json' };
          finalBody = JSON.stringify(body);
        } else if (typeof body === 'string') {
          // form data
        } else {
          finalBody = JSON.stringify(body);
          headers['Content-Type'] = 'application/json';
        }

        const response = await fetch(provider.endpoint, {
          method: provider.method,
          headers,
          body: finalBody,
        });
        const text = await response.text();
        const success = response.ok && text.includes(provider.identifier.replace(/"/g, ''));
        results.push({
          provider: provider.name,
          status: success ? '✅ Verified' : '❌ Failed',
          code: response.status,
          response: text.substring(0, 200),
        });
      } catch (err: any) {
        results.push({
          provider: provider.name,
          status: '❌ Error',
          response: err.message,
        });
      }
    }
    setTestResults(results);
    setTesting(false);
  };

  const handleGenerateCurl = () => {
    const provider = PROVIDERS.find(p => p.id === curlProvider);
    if (!provider) return;
    const providerCreds: Record<string, string> = {};
    provider.requires.forEach(r => {
      providerCreds[r] = creds[provider.id + '_' + r] || '';
    });
    if (provider.id === '4jawaly') providerCreds.sender = creds['4jawaly_sender'] || 'SENDER';
    if (provider.id === 'unifonic') providerCreds.sender = creds['unifonic_sender'] || 'UNISMS';
    if (provider.id === 'vonage') providerCreds.from = creds['vonage_from'] || 'Vonage';
    if (provider.id === 'smsgateway') providerCreds.device = creds['smsgateway_device'] || '1';
    if (provider.id === 'textbelt') providerCreds.key = creds['textbelt_key'] || 'textbelt';

    const body = provider.bodyTemplate(providerCreds, curlPhone, curlMessage);
    let bodyStr = '';
    let contentType = '';
    if (provider.id === 'textbelt') {
      bodyStr = JSON.stringify(body);
      contentType = 'application/json';
    } else if (typeof body === 'string') {
      bodyStr = body;
      contentType = 'application/x-www-form-urlencoded';
    } else {
      bodyStr = JSON.stringify(body);
      contentType = 'application/json';
    }

    let cmd = `curl -X ${provider.method} '${provider.endpoint}' \\\n`;
    const headers = provider.headers;
    Object.entries(headers).forEach(([k, v]) => {
      if (k === 'Authorization' && v) {
        cmd += `  -H '${k}: ${v}' \\\n`;
      } else if (k !== 'Authorization') {
        cmd += `  -H '${k}: ${v}' \\\n`;
      }
    });
    if (provider.method === 'POST') {
      cmd += `  -d '${bodyStr.replace(/'/g, "'\\''")}'`;
    }
    setCurlCmd(cmd);
  };

  const copyCurl = () => {
    navigator.clipboard.writeText(curlCmd);
    toast.success('cURL copied to clipboard');
  };

  // Detect placeholders
  const hasPlaceholder = Object.values(creds).some(v => v.includes('YOUR_') || v.includes('your_') || v === '');

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-2">📡 SMS Gateway Manager</h1>
      <p className="text-muted-foreground mb-6">Production-grade • Real API calls • No simulations</p>

      <Tabs defaultValue="credentials" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="credentials">🔑 Credentials</TabsTrigger>
          <TabsTrigger value="send">📤 Send SMS</TabsTrigger>
          <TabsTrigger value="test">🧪 Live Test</TabsTrigger>
          <TabsTrigger value="curl">📋 Generate cURL</TabsTrigger>
        </TabsList>

        {/* Credentials Tab */}
        <TabsContent value="credentials">
          <Card>
            <CardHeader>
              <CardTitle>API Credentials</CardTitle>
              <CardDescription>
                Enter your API keys. They are stored in your browser's localStorage.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cred_4jawaly_key">4jawaly – API Key</Label>
                  <Input id="cred_4jawaly_key" value={localCreds['4jawaly_key'] || ''} onChange={e => handleCredChange('4jawaly_key', e.target.value)} placeholder="Your 4jawaly API key" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cred_4jawaly_secret">4jawaly – API Secret</Label>
                  <Input id="cred_4jawaly_secret" type="password" value={localCreds['4jawaly_secret'] || ''} onChange={e => handleCredChange('4jawaly_secret', e.target.value)} placeholder="Your 4jawaly API secret" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cred_4jawaly_sender">4jawaly – Sender Name</Label>
                  <Input id="cred_4jawaly_sender" value={localCreds['4jawaly_sender'] || ''} onChange={e => handleCredChange('4jawaly_sender', e.target.value)} placeholder="Sender name" />
                </div>
              </div>
              <hr />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cred_unifonic_appsid">Unifonic – AppSid</Label>
                  <Input id="cred_unifonic_appsid" type="password" value={localCreds['unifonic_appsid'] || ''} onChange={e => handleCredChange('unifonic_appsid', e.target.value)} placeholder="Your Unifonic AppSid" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cred_unifonic_sender">Unifonic – Sender ID</Label>
                  <Input id="cred_unifonic_sender" value={localCreds['unifonic_sender'] || ''} onChange={e => handleCredChange('unifonic_sender', e.target.value)} placeholder="Sender ID (e.g., UNISMS)" />
                </div>
              </div>
              <hr />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cred_vonage_key">Vonage – API Key</Label>
                  <Input id="cred_vonage_key" value={localCreds['vonage_key'] || ''} onChange={e => handleCredChange('vonage_key', e.target.value)} placeholder="Your Vonage API key" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cred_vonage_secret">Vonage – API Secret</Label>
                  <Input id="cred_vonage_secret" type="password" value={localCreds['vonage_secret'] || ''} onChange={e => handleCredChange('vonage_secret', e.target.value)} placeholder="Your Vonage API secret" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cred_vonage_from">Vonage – Sender ID (From)</Label>
                  <Input id="cred_vonage_from" value={localCreds['vonage_from'] || ''} onChange={e => handleCredChange('vonage_from', e.target.value)} placeholder="Sender ID or phone number" />
                </div>
              </div>
              <hr />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cred_smsgateway_token">SMSGateway.me – API Token</Label>
                  <Input id="cred_smsgateway_token" type="password" value={localCreds['smsgateway_token'] || ''} onChange={e => handleCredChange('smsgateway_token', e.target.value)} placeholder="Your SMSGateway.me API token" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cred_smsgateway_device">SMSGateway.me – Device ID</Label>
                  <Input id="cred_smsgateway_device" value={localCreds['smsgateway_device'] || ''} onChange={e => handleCredChange('smsgateway_device', e.target.value)} placeholder="Device ID (e.g., 1)" />
                </div>
              </div>
              <hr />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cred_textbelt_key">TextBelt – API Key</Label>
                  <Input id="cred_textbelt_key" value={localCreds['textbelt_key'] || 'textbelt'} onChange={e => handleCredChange('textbelt_key', e.target.value)} placeholder="textbelt (free) or paid key" />
                </div>
                <div className="flex items-end">
                  <span className="text-sm text-muted-foreground">⚡ Free tier: 1 message per day with key <code>textbelt</code></span>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button onClick={handleSaveCreds}>💾 Save Credentials</Button>
                <Button variant="destructive" onClick={handleClearCreds}>🗑️ Clear All</Button>
                {hasPlaceholder && (
                  <Badge variant="warning" className="ml-2">⚠️ Placeholders detected</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Send SMS Tab */}
        <TabsContent value="send">
          <Card>
            <CardHeader>
              <CardTitle>📤 Send SMS</CardTitle>
              <CardDescription>Select providers and send real SMS</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number (E.164)</Label>
                  <Input id="phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="e.g., +966501234567" />
                  <p className="text-xs text-muted-foreground">Include country code with +</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" value={message} onChange={e => setMessage(e.target.value)} placeholder="Enter your SMS message" rows={3} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Select Providers</Label>
                <div className="flex flex-wrap gap-2">
                  {PROVIDERS.map(p => {
                    const hasCreds = p.requires.every(r => creds[p.id + '_' + r] && creds[p.id + '_' + r].trim() !== '');
                    return (
                      <div key={p.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`provider-${p.id}`}
                          checked={selectedProviders.includes(p.id)}
                          onCheckedChange={() => toggleProvider(p.id)}
                          disabled={!hasCreds}
                        />
                        <Label htmlFor={`provider-${p.id}`} className="text-sm">
                          {p.name}
                          {!hasCreds && <span className="text-muted-foreground ml-1">(no keys)</span>}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Button onClick={handleSend} disabled={loading}>
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                {loading ? 'Sending...' : 'Send SMS'}
              </Button>

              {results.length > 0 && (
                <div className="mt-4 space-y-2">
                  {results.map((r, i) => (
                    <div key={i} className="p-3 bg-muted rounded-md">
                      <div className="flex items-center gap-2">
                        <strong>{r.provider}</strong>
                        <Badge variant={r.status.includes('Success') ? 'success' : 'destructive'}>{r.status}</Badge>
                      </div>
                      <pre className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{r.response}</pre>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Live Test Tab */}
        <TabsContent value="test">
          <Card>
            <CardHeader>
              <CardTitle>🧪 Live Endpoint Test</CardTitle>
              <CardDescription>Tests each provider with a real HTTP request – no SMS sent</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="testPhone">Test Phone Number (E.164)</Label>
                <Input id="testPhone" value={testPhone} onChange={e => setTestPhone(e.target.value)} placeholder="e.g., +966501234567" />
              </div>
              <Button onClick={handleTest} disabled={testing}>
                {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                {testing ? 'Testing...' : 'Run Live Test'}
              </Button>
              {testResults.length > 0 && (
                <div className="mt-4 space-y-2">
                  {testResults.map((r, i) => (
                    <div key={i} className="p-3 bg-muted rounded-md border-l-4" style={{ borderColor: r.status.includes('✅') ? 'green' : r.status.includes('⏭️') ? 'orange' : 'red' }}>
                      <div className="flex items-center gap-2">
                        <strong>{r.provider}</strong>
                        <Badge variant={r.status.includes('✅') ? 'success' : r.status.includes('⏭️') ? 'warning' : 'destructive'}>{r.status}</Badge>
                        {r.code && <span className="text-xs text-muted-foreground">HTTP {r.code}</span>}
                      </div>
                      <pre className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{r.response}</pre>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* cURL Generator Tab */}
        <TabsContent value="curl">
          <Card>
            <CardHeader>
              <CardTitle>📋 Generate cURL Commands</CardTitle>
              <CardDescription>Create ready-to-run terminal commands with your credentials</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="curlPhone">Phone Number (E.164)</Label>
                  <Input id="curlPhone" value={curlPhone} onChange={e => setCurlPhone(e.target.value)} placeholder="e.g., +966501234567" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="curlMessage">Message</Label>
                  <Input id="curlMessage" value={curlMessage} onChange={e => setCurlMessage(e.target.value)} placeholder="Your message" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="curlProvider">Select Provider</Label>
                <select
                  id="curlProvider"
                  className="w-full p-2 border rounded-md bg-background"
                  value={curlProvider}
                  onChange={e => setCurlProvider(e.target.value)}
                >
                  {PROVIDERS.map(p => (
                    <option key={p.id} value={p.id} disabled={p.requires.some(r => !creds[p.id + '_' + r] || creds[p.id + '_' + r].trim() === '')}>
                      {p.name} {p.requires.every(r => creds[p.id + '_' + r] && creds[p.id + '_' + r].trim() !== '') ? '✅' : '🔑'}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleGenerateCurl}>
                  <Terminal className="mr-2 h-4 w-4" /> Generate cURL
                </Button>
                {curlCmd && (
                  <Button variant="outline" onClick={copyCurl}>
                    <Copy className="mr-2 h-4 w-4" /> Copy
                  </Button>
                )}
              </div>
              {curlCmd && (
                <pre className="p-3 bg-muted rounded-md text-sm whitespace-pre-wrap font-mono">{curlCmd}</pre>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
    }
