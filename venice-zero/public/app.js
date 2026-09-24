/**
 * VENICE ZERO — Private & Uncensored AI Platform
 * Monetization, Credit Limiting & In-Memory Ephemeral Engine
 */

document.addEventListener('DOMContentLoaded', () => {
  // State
  let currentMode = 'chat';
  let chatHistory = [];
  let currentTemperature = 0.7;
  let customSystemPrompt = '';
  let selectedStyle = 'cinematic';
  let selectedDimensions = { w: 1024, h: 1024 };

  // Pro & Credits State
  let userProToken = localStorage.getItem('venice_pro_token') || null;
  let isProUser = Boolean(userProToken);
  let remainingCredits = 10;
  let selectedBillingCycle = 'monthly';

  // DOM Elements
  const tabChat = document.getElementById('tabChat');
  const tabImage = document.getElementById('tabImage');
  const chatView = document.getElementById('chatView');
  const imageView = document.getElementById('imageView');
  
  const chatFeed = document.getElementById('chatFeed');
  const welcomeContainer = document.getElementById('welcomeContainer');
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');
  const sendBtn = document.getElementById('sendBtn');
  const personaSelect = document.getElementById('personaSelect');
  const backendSelect = document.getElementById('backendSelect');
  const burnSessionBtn = document.getElementById('burnSessionBtn');

  // Monetization DOM Elements
  const creditsPill = document.getElementById('creditsPill');
  const creditLabel = document.getElementById('creditLabel');
  const upgradeNavBtn = document.getElementById('upgradeNavBtn');
  const upgradeBtnText = document.getElementById('upgradeBtnText');
  const pricingModal = document.getElementById('pricingModal');
  const closePricingBtn = document.getElementById('closePricingBtn');
  const cycleToggle = document.getElementById('cycleToggle');
  const proPriceDisplay = document.getElementById('proPriceDisplay');
  const proCycleDisplay = document.getElementById('proCycleDisplay');
  const payWithStripeBtn = document.getElementById('payWithStripeBtn');
  const payWithCryptoBtn = document.getElementById('payWithCryptoBtn');
  const licenseKeyInput = document.getElementById('licenseKeyInput');
  const activateKeyBtn = document.getElementById('activateKeyBtn');

  // Settings Modal
  const openSettingsBtn = document.getElementById('openSettingsBtn');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  const settingsModal = document.getElementById('settingsModal');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const customSystemDirective = document.getElementById('customSystemDirective');
  const tempSlider = document.getElementById('tempSlider');
  const tempValue = document.getElementById('tempValue');
  const engineBadge = document.getElementById('engineBadge');
  const activeEngineText = document.getElementById('activeEngineText');
  const localOllamaStatus = document.getElementById('localOllamaStatus');
  const ollamaOption = document.getElementById('ollamaOption');

  // Image Studio
  const imagePrompt = document.getElementById('imagePrompt');
  const styleChips = document.getElementById('styleChips');
  const ratioSelector = document.getElementById('ratioSelector');
  const enhancePromptToggle = document.getElementById('enhancePromptToggle');
  const generateImageBtn = document.getElementById('generateImageBtn');
  const previewPlaceholder = document.getElementById('previewPlaceholder');
  const previewLoading = document.getElementById('previewLoading');
  const previewResult = document.getElementById('previewResult');
  const renderedImage = document.getElementById('renderedImage');
  const downloadImageBtn = document.getElementById('downloadImageBtn');

  // ==========================================
  // INITIALIZATION & CREDITS SYNC
  // ==========================================
  async function checkBackendStatus() {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const data = await res.json();
        if (data.engines.ollama.active) {
          ollamaOption.disabled = false;
          ollamaOption.textContent = `Local Ollama (${data.engines.ollama.models.length} models)`;
          localOllamaStatus.innerHTML = `<span class="status-dot" style="background:#10b981;box-shadow:0 0 8px #10b981;"></span> Local Ollama online & air-gapped! (${data.engines.ollama.models.join(', ') || 'Ready'})`;
        } else {
          ollamaOption.disabled = true;
          localOllamaStatus.innerHTML = `<span class="dot-red"></span> Local Ollama offline. Run <code>ollama serve</code> in terminal to enable 100% offline air-gapped inference.`;
        }
      }
    } catch (e) {
      console.warn('Status check unreachable:', e);
    }
  }

  async function syncCredits() {
    if (userProToken) {
      activateProUI();
      return;
    }

    try {
      const res = await fetch('/api/billing/credits');
      if (res.ok) {
        const data = await res.json();
        if (data.isPro) {
          activateProUI();
        } else {
          remainingCredits = data.remaining;
          updateCreditsUI(data.remaining, data.max);
        }
      }
    } catch (e) {
      console.warn('Credit check error:', e);
    }
  }

  function updateCreditsUI(remaining, max = 10) {
    creditLabel.innerHTML = `<strong>${remaining}</strong>/${max} Free`;
    if (remaining <= 3) {
      creditsPill.style.borderColor = 'rgba(239, 68, 68, 0.4)';
      creditsPill.style.color = '#fca5a5';
    } else {
      creditsPill.style.borderColor = 'rgba(245, 158, 11, 0.3)';
      creditsPill.style.color = '#fbbf24';
    }
  }

  function activateProUI() {
    isProUser = true;
    creditsPill.classList.add('pro-active');
    creditsPill.innerHTML = `<span>👑</span> <span>PRO Active</span>`;
    upgradeNavBtn.classList.add('pro-active');
    upgradeBtnText.textContent = 'PRO Member';
  }

  checkBackendStatus();
  syncCredits();

  // ==========================================
  // NAVIGATION & TAB SWITCHING
  // ==========================================
  tabChat.addEventListener('click', () => switchTab('chat'));
  tabImage.addEventListener('click', () => switchTab('image'));

  function switchTab(mode) {
    currentMode = mode;
    if (mode === 'chat') {
      tabChat.classList.add('active');
      tabImage.classList.remove('active');
      chatView.classList.add('active');
      imageView.classList.remove('active');
      chatInput.focus();
    } else {
      tabImage.classList.add('active');
      tabChat.classList.remove('active');
      imageView.classList.add('active');
      chatView.classList.remove('active');
      imagePrompt.focus();
    }
  }

  // ==========================================
  // PRICING & MONETIZATION MODAL
  // ==========================================
  upgradeNavBtn.addEventListener('click', () => {
    pricingModal.style.display = 'flex';
  });

  creditsPill.addEventListener('click', () => {
    pricingModal.style.display = 'flex';
  });

  closePricingBtn.addEventListener('click', () => {
    pricingModal.style.display = 'none';
  });

  pricingModal.addEventListener('click', (e) => {
    if (e.target === pricingModal) {
      pricingModal.style.display = 'none';
    }
  });

  // Cycle toggle (Monthly vs Annual)
  cycleToggle.querySelectorAll('.cycle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      cycleToggle.querySelectorAll('.cycle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedBillingCycle = btn.getAttribute('data-cycle');

      if (selectedBillingCycle === 'annual') {
        proPriceDisplay.textContent = '$79.00';
        proCycleDisplay.textContent = '/year ($6.58/mo)';
      } else {
        proPriceDisplay.textContent = '$9.99';
        proCycleDisplay.textContent = '/month';
      }
    });
  });

  // Stripe Checkout
  payWithStripeBtn.addEventListener('click', async () => {
    payWithStripeBtn.disabled = true;
    payWithStripeBtn.innerHTML = `<span>Connecting to Stripe...</span>`;

    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'pro', cycle: selectedBillingCycle, method: 'stripe' })
      });
      const data = await res.json();
      
      alert(`💳 Checkout Simulation:\n\nIn production, this redirects directly to your Stripe Checkout URL:\n${data.checkoutUrl}\n\nFor instant testing, use Demo Key: ${data.demoKey}`);
      licenseKeyInput.value = data.demoKey;
      payWithStripeBtn.disabled = false;
      payWithStripeBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
          <line x1="1" y1="10" x2="23" y2="10"/>
        </svg>
        <span>Pay with Card / Apple Pay</span>`;
    } catch (err) {
      alert('Checkout error: ' + err.message);
      payWithStripeBtn.disabled = false;
    }
  });

  // Crypto Checkout
  payWithCryptoBtn.addEventListener('click', async () => {
    payWithCryptoBtn.disabled = true;
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: 'pro', cycle: selectedBillingCycle, method: 'crypto' })
      });
      const data = await res.json();

      alert(`⚡ Anonymous Crypto Payment:\n\nDeposit Vault: ${data.depositAddress}\nAssets: ${data.supportedAssets.join(', ')}\nAmount: $${data.amountUsd}\n\nFor instant testing, test key "${data.demoKey}" has been entered into the activation box!`);
      licenseKeyInput.value = data.demoKey;
      payWithCryptoBtn.disabled = false;
    } catch (err) {
      alert('Crypto error: ' + err.message);
      payWithCryptoBtn.disabled = false;
    }
  });

  // License Key Activation
  activateKeyBtn.addEventListener('click', async () => {
    const key = licenseKeyInput.value.trim();
    if (!key) {
      alert('Please enter a license key.');
      return;
    }

    activateKeyBtn.disabled = true;
    activateKeyBtn.textContent = 'Verifying...';

    try {
      const res = await fetch('/api/billing/verify-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key })
      });
      const data = await res.json();

      if (res.ok && data.valid) {
        localStorage.setItem('venice_pro_token', data.token);
        userProToken = data.token;
        activateProUI();
        pricingModal.style.display = 'none';
        alert('🎉 ' + data.message);
      } else {
        alert('❌ ' + (data.error || 'Invalid key. Try PRO-ZERO-2026'));
      }
    } catch (err) {
      alert('Verification network error: ' + err.message);
    } finally {
      activateKeyBtn.disabled = false;
      activateKeyBtn.textContent = 'Activate Key';
    }
  });

  // ==========================================
  // CHAT CONTROLLER
  // ==========================================
  chatInput.addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
  });

  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      chatForm.dispatchEvent(new Event('submit'));
    }
  });

  document.querySelectorAll('.prompt-card').forEach(card => {
    card.addEventListener('click', () => {
      const prompt = card.getAttribute('data-prompt');
      chatInput.value = prompt;
      chatForm.dispatchEvent(new Event('submit'));
    });
  });

  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;

    if (welcomeContainer) {
      welcomeContainer.style.display = 'none';
    }

    appendMessage('user', text);
    chatHistory.push({ role: 'user', content: text });
    chatInput.value = '';
    chatInput.style.height = 'auto';

    const botRowId = 'bot-' + Date.now();
    appendLoadingMessage(botRowId);

    const persona = personaSelect.value;
    let personaDirective = customSystemPrompt;
    if (persona === 'tech-lead') {
      personaDirective += '\nAct as a Principal / Staff Distributed Systems Architect. Use rigorous technical depth, precise terminology, trade-off comparisons, and production-grade code.';
    } else if (persona === 'creative') {
      personaDirective += '\nAct as an imaginative, gritty, and expressive creative writer with zero narrative restrictions.';
    } else if (persona === 'academic') {
      personaDirective += '\nAct as an objective, unbiased academic researcher giving neutral analysis across all perspectives.';
    }

    const headers = { 'Content-Type': 'application/json' };
    if (userProToken) {
      headers['x-pro-token'] = userProToken;
    }

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          messages: chatHistory,
          systemPrompt: personaDirective,
          temperature: currentTemperature,
          backend: backendSelect.value
        })
      });

      // Handle Paywall / Credits Depleted
      if (res.status === 402) {
        replaceLoadingMessage(botRowId, `⚡ Daily free limit reached (10 queries/day). Upgrade to **Venice Pro** for unlimited reasoning, priority GPU fast-lane, and 70B models.`, 'Credit Gate');
        pricingModal.style.display = 'flex';
        return;
      }

      if (!res.ok) {
        throw new Error(`Inference engine returned HTTP ${res.status}`);
      }

      const data = await res.json();
      replaceLoadingMessage(botRowId, data.reply, data.modelUsed);
      chatHistory.push({ role: 'assistant', content: data.reply });

      if (data.isPro) {
        activateProUI();
      } else if (data.remainingCredits !== undefined) {
        updateCreditsUI(data.remainingCredits);
      }

    } catch (err) {
      replaceLoadingMessage(botRowId, `⚠️ Connection Error: ${err.message}. Please retry or switch to local Ollama.`, 'Error');
    }
  });

  function appendMessage(role, text, modelInfo = null) {
    const row = document.createElement('div');
    row.className = `message-row ${role}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = role === 'user' ? 'YOU' : 'VZ';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';

    const meta = document.createElement('div');
    meta.className = 'message-meta';
    
    const author = document.createElement('span');
    author.className = 'message-author';
    author.textContent = role === 'user' ? 'Anonymous User' : (modelInfo || 'Venice Zero (Uncensored)');

    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-msg-btn';
    copyBtn.textContent = 'Copy';
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(text);
      copyBtn.textContent = 'Copied!';
      setTimeout(() => copyBtn.textContent = 'Copy', 1500);
    };

    meta.appendChild(author);
    meta.appendChild(copyBtn);

    const body = document.createElement('div');
    body.className = 'message-text';
    body.innerHTML = formatMarkdown(text);

    bubble.appendChild(meta);
    bubble.appendChild(body);
    row.appendChild(avatar);
    row.appendChild(bubble);

    chatFeed.appendChild(row);
    chatFeed.scrollTop = chatFeed.scrollHeight;
  }

  function appendLoadingMessage(id) {
    const row = document.createElement('div');
    row.className = 'message-row bot';
    row.id = id;

    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = 'VZ';

    const bubble = document.createElement('div');
    bubble.className = 'message-bubble';

    const meta = document.createElement('div');
    meta.className = 'message-meta';
    meta.innerHTML = `<span class="message-author">Venice Zero Thinking...</span>`;

    const dots = document.createElement('div');
    dots.className = 'typing-dots';
    dots.innerHTML = `<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>`;

    bubble.appendChild(meta);
    bubble.appendChild(dots);
    row.appendChild(avatar);
    row.appendChild(bubble);

    chatFeed.appendChild(row);
    chatFeed.scrollTop = chatFeed.scrollHeight;
  }

  function replaceLoadingMessage(id, text, modelInfo) {
    const row = document.getElementById(id);
    if (!row) return;

    const bubble = row.querySelector('.message-bubble');
    bubble.innerHTML = '';

    const meta = document.createElement('div');
    meta.className = 'message-meta';
    
    const author = document.createElement('span');
    author.className = 'message-author';
    author.textContent = modelInfo || 'Venice Zero (Uncensored)';

    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-msg-btn';
    copyBtn.textContent = 'Copy';
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(text);
      copyBtn.textContent = 'Copied!';
      setTimeout(() => copyBtn.textContent = 'Copy', 1500);
    };

    meta.appendChild(author);
    meta.appendChild(copyBtn);

    const body = document.createElement('div');
    body.className = 'message-text';
    body.innerHTML = formatMarkdown(text);

    bubble.appendChild(meta);
    bubble.appendChild(body);

    chatFeed.scrollTop = chatFeed.scrollHeight;
  }

  function formatMarkdown(str) {
    if (!str) return '';
    let escaped = str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    escaped = escaped.replace(/```([a-zA-Z0-9]*)\n([\s\S]*?)```/g, (match, lang, code) => {
      return `<pre><code>${code.trim()}</code></pre>`;
    });

    escaped = escaped.replace(/`([^`]+)`/g, '<code>$1</code>');
    escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    escaped = escaped.replace(/\n/g, '<br>');

    return escaped;
  }

  // ==========================================
  // BURN SESSION
  // ==========================================
  burnSessionBtn.addEventListener('click', () => {
    if (confirm('🔥 Burn Session? All in-memory chats will be permanently wiped with zero traces.')) {
      chatHistory = [];
      chatFeed.innerHTML = '';
      if (welcomeContainer) {
        welcomeContainer.style.display = 'block';
        chatFeed.appendChild(welcomeContainer);
      }
      burnSessionBtn.innerHTML = `<span>Purged!</span>`;
      setTimeout(() => {
        burnSessionBtn.innerHTML = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
          </svg>
          <span>Burn</span>`;
      }, 1500);
    }
  });

  // ==========================================
  // IMAGE GENERATION STUDIO
  // ==========================================
  styleChips.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      styleChips.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      selectedStyle = chip.getAttribute('data-style');
    });
  });

  ratioSelector.querySelectorAll('.ratio-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      ratioSelector.querySelectorAll('.ratio-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedDimensions = {
        w: parseInt(btn.getAttribute('data-w')),
        h: parseInt(btn.getAttribute('data-h'))
      };
    });
  });

  generateImageBtn.addEventListener('click', async () => {
    const rawPrompt = imagePrompt.value.trim();
    if (!rawPrompt) {
      alert('Please enter a description for the image you want to generate.');
      return;
    }

    let finalPrompt = rawPrompt;
    if (selectedStyle && selectedStyle !== 'none') {
      finalPrompt += `, ${selectedStyle} style aesthetic`;
    }

    previewPlaceholder.style.display = 'none';
    previewResult.style.display = 'none';
    previewLoading.style.display = 'block';
    generateImageBtn.disabled = true;

    const headers = { 'Content-Type': 'application/json' };
    if (userProToken) {
      headers['x-pro-token'] = userProToken;
    }

    try {
      const res = await fetch('/api/image', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt: finalPrompt,
          width: selectedDimensions.w,
          height: selectedDimensions.h,
          enhance: enhancePromptToggle.checked
        })
      });

      if (res.status === 402) {
        previewLoading.style.display = 'none';
        previewPlaceholder.style.display = 'block';
        generateImageBtn.disabled = false;
        pricingModal.style.display = 'flex';
        return;
      }

      if (!res.ok) throw new Error('Image generation failed');

      const data = await res.json();
      
      const img = new Image();
      img.src = data.imageUrl;
      img.onload = () => {
        renderedImage.src = data.imageUrl;
        downloadImageBtn.href = data.imageUrl;
        previewLoading.style.display = 'none';
        previewResult.style.display = 'flex';
        generateImageBtn.disabled = false;
      };
      img.onerror = () => {
        throw new Error('Image loading timeout or blocked.');
      };

      if (data.isPro) {
        activateProUI();
      } else if (data.remainingCredits !== undefined) {
        updateCreditsUI(data.remainingCredits);
      }

    } catch (err) {
      alert('Error generating image: ' + err.message);
      previewLoading.style.display = 'none';
      previewPlaceholder.style.display = 'block';
      generateImageBtn.disabled = false;
    }
  });

  // ==========================================
  // SETTINGS MODAL
  // ==========================================
  openSettingsBtn.addEventListener('click', () => {
    settingsModal.style.display = 'flex';
  });

  engineBadge.addEventListener('click', () => {
    settingsModal.style.display = 'flex';
  });

  closeSettingsBtn.addEventListener('click', () => {
    settingsModal.style.display = 'none';
  });

  settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
      settingsModal.style.display = 'none';
    }
  });

  tempSlider.addEventListener('input', (e) => {
    tempValue.textContent = e.target.value;
  });

  saveSettingsBtn.addEventListener('click', () => {
    currentTemperature = parseFloat(tempSlider.value);
    customSystemPrompt = customSystemDirective.value.trim();
    settingsModal.style.display = 'none';
  });
});
