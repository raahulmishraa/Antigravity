# 🔒 Venice Zero — Private, Uncensored AI Platform & SaaS

Venice Zero is an open-source, privacy-first, zero-log AI platform modeled after **Venice AI**. It provides uncensored conversational text generation, high-resolution image synthesis, and a **built-in monetization & subscription engine**.

---

## ✨ Features & Capabilities

1. **Uncensored & Unaligned Text Chat:**
   - Pre-configured system directives disabling corporate moralizing, disclaimers, and refusal triggers.
   - Persona modes: *Raw / Zero Filter*, *Staff & Tech Lead Architect*, *Creative & Narrative*, *Academic & Objective*.
   - Ephemeral in-memory chat with **"Burn Session"** memory purge.

2. **Unfiltered Image Studio (Flux 1.1 & Sana):**
   - High-resolution text-to-image generator with aspect ratio controls (`1:1`, `16:9`, `9:16`).
   - Style presets: Cinematic, Photoreal, Cyberpunk, Anime/Manga, Dark Fantasy, Oil Painting.
   - Prompt detail enhancer and direct full-resolution download.

3. **💳 Complete Monetization & Credit Limiting Engine:**
   - **Free Explorer Tier:** 10 free queries per day with a live counter in the top nav (`⚡ 10/10 Free`).
   - **Venice Pro Tier ($9.99/mo or $79/yr):** Unlimited 70B models, unlimited 8K Flux images, priority GPU queues.
   - **Dual Checkout Options:**
     - **Card / Apple Pay / Google Pay** via Stripe.
     - **Anonymous Crypto Payments** (Solana USDC, USDT, BTC Lightning).
   - **License Key Activation System:** Instant key verification (`PRO-ZERO-2026` included for testing).
   - **Automatic Paywall Gate:** Depleted free credits trigger the upgrade modal automatically.

4. **Dual Inference Engine (Cloud + Local):**
   - **Cloud Free Engine:** Works out-of-the-box with zero keys or accounts.
   - **Local Air-Gapped Bridge:** Auto-detects local **Ollama** (`dolphin-llama3`, `llama3.2`) on your Mac for 100% offline, private inference.

---

## 🚀 Quick Start

### 1. Launch the Server
Venice Zero is already running at port `4000`:
```bash
cd venice-zero
npm start
```
Open **[http://localhost:4000](http://localhost:4000)** in your browser.

### 2. Test the Monetization Flow
* **Free Credits:** Notice the `⚡ 10/10 Free` counter in the top navigation. Sending queries decrements your credits.
* **Open Pricing:** Click **Get Pro** or the credit pill to inspect the pricing modal.
* **Instant Pro Activation:** In the license activation box, enter the demo key:
  ```
  PRO-ZERO-2026
  ```
  Click **Activate Key**. The top nav instantly upgrades to **👑 PRO Active** with unlimited generation unlocked!

---

## 🌐 Deploying to the Public Web (Go Live)

To make Venice Zero available to paying users worldwide:

1. **Deploy to Render, Railway, or VPS:**
   - Push this `venice-zero` folder to GitHub.
   - Deploy as a Web Service on Render / Railway (`node server.js`).
2. **Connect Live Stripe:**
   - In `server.js`, set your Stripe secret key: `const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);`
   - Create a $9.99/mo recurring price in your Stripe dashboard.
3. **Connect Low-Cost Serverless Inference (75%+ Margins):**
   - For paying Pro users, forward requests to **DeepInfra** or **Together AI** (~$0.35 per 1M tokens) to give them ultra-fast sub-500ms response times.
