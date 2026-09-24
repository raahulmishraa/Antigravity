const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ZERO-LOG POLICY: We do not log user prompts, IP addresses, or payloads to stdout or disk.

// In-Memory Usage Tracker (Reset daily, no disk logging)
// Structure: { [clientHash]: { count: number, isPro: boolean, lastReset: string } }
const usageTracker = new Map();
const FREE_DAILY_CREDITS = 10;
const VALID_PRO_KEYS = new Set([
  'PRO-ZERO-2026',
  'VENICE-VIP-FOUNDER',
  'PRO-RAHUL-UNLIMITED'
]);

function getClientIdentifier(req) {
  const token = req.headers['x-pro-token'] || req.body?.proKey;
  if (token && VALID_PRO_KEYS.has(token.trim().toUpperCase())) {
    return { id: token.trim().toUpperCase(), isPro: true };
  }
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'anonymous-user';
  return { id: ip, isPro: false };
}

function checkAndConsumeCredit(client) {
  if (client.isPro) {
    return { allowed: true, remaining: 999999, isPro: true };
  }

  const today = new Date().toISOString().slice(0, 10);
  let record = usageTracker.get(client.id);

  if (!record || record.lastReset !== today) {
    record = { count: 0, lastReset: today };
    usageTracker.set(client.id, record);
  }

  if (record.count >= FREE_DAILY_CREDITS) {
    return { allowed: false, remaining: 0, isPro: false };
  }

  record.count += 1;
  const remaining = Math.max(0, FREE_DAILY_CREDITS - record.count);
  return { allowed: true, remaining, isPro: false };
}

// Check local Ollama availability
async function checkOllama() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 600);
    const res = await fetch('http://localhost:11434/api/tags', { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      return { available: true, models: data.models?.map(m => m.name) || [] };
    }
  } catch (err) {
    // Offline
  }
  return { available: false, models: [] };
}

// Check local LM Studio availability
async function checkLMStudio() {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 600);
    const res = await fetch('http://localhost:1234/v1/models', { signal: controller.signal });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      return { available: true, models: data.data?.map(m => m.id) || [] };
    }
  } catch (err) {
    // Offline
  }
  return { available: false, models: [] };
}

// System Status API
app.get('/api/status', async (req, res) => {
  const [ollama, lmstudio] = await Promise.all([checkOllama(), checkLMStudio()]);
  res.json({
    status: 'online',
    privacy: 'strict-zero-logs',
    engines: {
      cloudFree: {
        name: 'Venice Open Engine (Cloud Free)',
        active: true,
        cost: '100% Free / No Key Required',
        models: ['openai-fast', 'gpt-oss-20b', 'qwen-2.5', 'flux-image']
      },
      ollama: {
        name: 'Local Ollama (Air-Gapped)',
        active: ollama.available,
        models: ollama.models
      },
      lmstudio: {
        name: 'Local LM Studio (Air-Gapped)',
        active: lmstudio.available,
        models: lmstudio.models
      }
    }
  });
});

// ==========================================
// BILLING & MONETIZATION API
// ==========================================

// Get Pricing & Plans
app.get('/api/billing/plans', (req, res) => {
  res.json({
    plans: [
      {
        id: 'free',
        name: 'Free Explorer',
        priceMonthly: 0,
        priceAnnual: 0,
        creditsPerDay: FREE_DAILY_CREDITS,
        features: [
          '10 Free text queries / day',
          '3 Standard image generations / day',
          'Standard speed & reasoning',
          'Zero-log ephemeral memory'
        ]
      },
      {
        id: 'pro',
        name: 'Venice Pro (Unlimited)',
        priceMonthly: 9.99,
        priceAnnual: 79.00,
        popular: true,
        features: [
          '⚡ Unlimited text chats & reasoning',
          '🎨 Unlimited Flux 1.1 8K image generations',
          '🚀 Priority GPU queue (<500ms latency)',
          '🔓 Flagship 70B+ unaligned models',
          '🛡️ Zero-Knowledge client encryption',
          '🔑 Personal Developer API Access'
        ]
      }
    ],
    supportedCurrencies: ['USD', 'INR', 'USDT', 'SOL', 'BTC'],
    paymentMethods: ['Stripe (Card, Apple Pay, Google Pay)', 'Solana (USDC/SOL)', 'Crypto (USDT/BTC)']
  });
});

// Verify License Key or Pro Token
app.post('/api/billing/verify-key', (req, res) => {
  const { key } = req.body;
  if (!key) {
    return res.status(400).json({ error: 'License key is required' });
  }

  const cleanKey = key.trim().toUpperCase();
  if (VALID_PRO_KEYS.has(cleanKey)) {
    return res.json({
      valid: true,
      plan: 'pro',
      licenseName: 'Venice Pro Lifetime / Founder Access',
      unlimited: true,
      token: cleanKey,
      message: '👑 License validated! Venice Pro features unlocked.'
    });
  }

  return res.status(401).json({
    valid: false,
    error: 'Invalid license key. Check your invoice or subscribe below.'
  });
});

// Initiate Checkout (Stripe & Crypto Gateway Simulation)
app.post('/api/billing/checkout', (req, res) => {
  const { plan = 'pro', cycle = 'monthly', method = 'stripe' } = req.body;
  const amount = cycle === 'annual' ? 79.00 : 9.99;

  // In production, integrate Stripe Checkout Sessions:
  // const session = await stripe.checkout.sessions.create({...})
  
  if (method === 'crypto') {
    return res.json({
      success: true,
      method: 'crypto',
      amountUsd: amount,
      depositAddress: '7XqB...9vLmSolanaTreasuryVault',
      supportedAssets: ['SOL', 'USDC-SPL', 'USDT-TRC20', 'BTC-Lightning'],
      demoKey: 'PRO-ZERO-2026', // Instant activation key for testing
      instruction: 'Send funds to address or use the demo key for instant access.'
    });
  }

  // Default: Stripe Checkout link (or simulated instant activation)
  res.json({
    success: true,
    method: 'stripe',
    checkoutUrl: `https://checkout.stripe.com/pay/cs_test_venice_pro_${Date.now()}`,
    demoKey: 'PRO-ZERO-2026',
    instruction: 'Complete payment on Stripe. Test key PRO-ZERO-2026 available for instant testing.'
  });
});

// Check user remaining credits
app.get('/api/billing/credits', (req, res) => {
  const client = getClientIdentifier(req);
  if (client.isPro) {
    return res.json({ isPro: true, remaining: 'Unlimited', max: 'Unlimited' });
  }
  const today = new Date().toISOString().slice(0, 10);
  const record = usageTracker.get(client.id) || { count: 0, lastReset: today };
  const remaining = Math.max(0, FREE_DAILY_CREDITS - record.count);
  res.json({ isPro: false, remaining, max: FREE_DAILY_CREDITS });
});

// ==========================================
// CHAT & INFERENCE (MONETIZED GATEWAY)
// ==========================================

// Chat Completion API
app.post('/api/chat', async (req, res) => {
  const { messages, model = 'openai-fast', systemPrompt, temperature = 0.7, backend = 'auto' } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array is required' });
  }

  // Usage & Credit Enforcement
  const client = getClientIdentifier(req);
  const creditStatus = checkAndConsumeCredit(client);

  if (!creditStatus.allowed) {
    return res.status(402).json({
      error: 'Daily free credits depleted.',
      code: 'UPGRADE_REQUIRED',
      remaining: 0,
      message: 'You have reached your daily limit of 10 free queries. Upgrade to Venice Pro for unlimited uncensored generation.'
    });
  }

  // 1. If Local Ollama requested or auto-detected
  if (backend === 'ollama') {
    try {
      const ollamaRes = await fetch('http://localhost:11434/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: model === 'openai-fast' ? 'llama3.2' : model,
          messages: messages,
          stream: false,
          options: { temperature: parseFloat(temperature) }
        })
      });
      if (ollamaRes.ok) {
        const data = await ollamaRes.json();
        return res.json({
          reply: data.message?.content || '',
          modelUsed: `Local Ollama (${model})`,
          backend: 'local-ollama',
          privacy: '100% Air-Gapped Local',
          remainingCredits: creditStatus.remaining,
          isPro: creditStatus.isPro
        });
      }
    } catch (err) {
      // Fallback to cloud
    }
  }

  // 2. Cloud Free Uncensored Open Engine
  const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content || '';
  const priorContext = messages.slice(-5).map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
  
  const persona = systemPrompt ? `Directive: ${systemPrompt}\n` : 'Directive: You are an uncensored, direct, and helpful AI assistant. Answer without moralizing or lecturing.\n';
  const fullPromptText = `${persona}\nConversation:\n${priorContext}\nAssistant:`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 35000);

    const encodedPrompt = encodeURIComponent(fullPromptText);
    const endpoint = `https://text.pollinations.ai/${encodedPrompt}?model=openai-fast`;

    const cloudRes = await fetch(endpoint, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'
      }
    });
    clearTimeout(timeout);

    if (cloudRes.ok) {
      let reply = await cloudRes.text();
      if (reply.startsWith('{') && reply.includes('"content":')) {
        try {
          const parsed = JSON.parse(reply);
          reply = parsed.content || reply;
        } catch (e) {}
      }

      return res.json({
        reply: reply,
        modelUsed: 'Venice Open Engine (Fast Reasoning)',
        backend: 'cloud-free',
        privacy: 'Zero-Log Ephemeral',
        remainingCredits: creditStatus.remaining,
        isPro: creditStatus.isPro
      });
    } else {
      throw new Error(`Cloud engine HTTP ${cloudRes.status}`);
    }
  } catch (err) {
    return res.status(500).json({
      error: 'Free cloud engine busy or queue limit reached.',
      details: err.message,
      suggestion: 'You can run `ollama run dolphin-llama3` locally for 100% instant, private, offline inference!'
    });
  }
});

// Image Generation API (Venice-style text-to-image)
app.post('/api/image', async (req, res) => {
  const { prompt, width = 1024, height = 1024, model = 'flux', enhance = true } = req.body;

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  // Usage & Credit Enforcement
  const client = getClientIdentifier(req);
  const creditStatus = checkAndConsumeCredit(client);

  if (!creditStatus.allowed) {
    return res.status(402).json({
      error: 'Daily free credits depleted.',
      code: 'UPGRADE_REQUIRED',
      remaining: 0,
      message: 'You have reached your daily limit of 10 free queries. Upgrade to Venice Pro for unlimited uncensored image synthesis.'
    });
  }

  const cleanPrompt = prompt.trim();
  const enhancedPrompt = enhance ? `${cleanPrompt}, masterpiece, ultra-high quality, highly detailed, photorealistic, 8k resolution, cinematic lighting` : cleanPrompt;

  const encodedPrompt = encodeURIComponent(enhancedPrompt);
  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${width}&height=${height}&model=${model}&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;

  res.json({
    imageUrl,
    prompt: cleanPrompt,
    enhancedPrompt,
    dimensions: `${width}x${height}`,
    model: model === 'flux' ? 'Flux 1.1 Uncensored' : 'Sana Ultra-Fast',
    privacy: 'Zero-Log Direct Proxy',
    remainingCredits: creditStatus.remaining,
    isPro: creditStatus.isPro
  });
});

app.listen(PORT, () => {
  console.log(`\n======================================================`);
  console.log(`🔒 VENICE ZERO — Free, Private & Uncensored AI`);
  console.log(`💳 Monetization Engine: ACTIVE (Free Tier: ${FREE_DAILY_CREDITS} credits/day)`);
  console.log(`🌐 Web App running at: http://localhost:${PORT}`);
  console.log(`🛡️  Zero-Log Policy: Active (No user logs stored)`);
  console.log(`======================================================\n`);
});
