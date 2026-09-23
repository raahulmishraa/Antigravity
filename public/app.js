/**
 * app.js
 * Client-side dynamic controller for JobAgent AI dashboard.
 */

// State
let currentProfile = null;
let currentJobs = [];
let currentTailored = null;
let currentJob = null;
let currentApplications = [];
let autopilotConfig = null;

// DOM Elements
const jobsGrid = document.getElementById('jobsGrid');
const searchInput = document.getElementById('searchInput');
const locationFilter = document.getElementById('locationFilter');
const btnSearchJobs = document.getElementById('btnSearchJobs');
const btnInstantScan = document.getElementById('btnInstantScan');
const btnPasteJdModal = document.getElementById('btnPasteJdModal');
const customJdModal = document.getElementById('customJdModal');
const btnCloseModal = document.getElementById('btnCloseModal');
const btnCancelModal = document.getElementById('btnCancelModal');
const btnFetchUrl = document.getElementById('btnFetchUrl');
const btnStartTailorCustom = document.getElementById('btnStartTailorCustom');

const autopilotToggle = document.getElementById('autopilotToggle');
const autopilotPulse = document.getElementById('autopilotPulse');
const autopilotCard = document.getElementById('autopilotCard');
const autopilotStatusText = document.getElementById('autopilotStatusText');
const autopilotToggleLabel = document.getElementById('autopilotToggleLabel');

const resumePreviewFrame = document.getElementById('resumePreviewFrame');
const atsScoreNumber = document.getElementById('atsScoreNumber');
const atsScoreCircle = document.getElementById('atsScoreCircle');
const atsVerdict = document.getElementById('atsVerdict');
const atsSummary = document.getElementById('atsSummary');
const matchedTags = document.getElementById('matchedTags');
const missingTags = document.getElementById('missingTags');
const strengthsList = document.getElementById('strengthsList');
const targetRoleBadge = document.getElementById('targetRoleBadge');

const btnPrintPdf = document.getElementById('btnPrintPdf');
const btnCopyMarkdown = document.getElementById('btnCopyMarkdown');
const btnCopyLatex = document.getElementById('btnCopyLatex');
const btnSaveToTracker = document.getElementById('btnSaveToTracker');

const coverLetterBox = document.getElementById('coverLetterBox');
const btnCopyCoverLetter = document.getElementById('btnCopyCoverLetter');
const qaContainer = document.getElementById('qaContainer');

const toastContainer = document.getElementById('toastContainer');
const trackerCountBadge = document.getElementById('trackerCountBadge');

// Toast Notification
function showToast(message, icon = '✨') {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3200);
}

// Navigation Tabs
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

    btn.classList.add('active');
    const tabId = btn.getAttribute('data-tab');
    document.getElementById(tabId).classList.add('active');

    // Update breadcrumb
    const labels = {
      'tab-radar': 'Job Radar / Live Discoveries',
      'tab-studio': 'Resume Studio / ATS Optimization & Export',
      'tab-copilot': 'Application Copilot / Cover Letter & Screening',
      'tab-tracker': 'Application Tracker / Pipeline Kanban',
      'tab-profile': 'Master Profile / Experience & Skills'
    };
    document.getElementById('breadcrumbText').textContent = labels[tabId] || 'JobAgent AI';
  });
});

function switchTab(tabId) {
  const btn = document.querySelector(`.nav-btn[data-tab="${tabId}"]`);
  if (btn) btn.click();
}

// Initialize Application
async function init() {
  await loadProfile();
  await loadAutopilotStatus();
  await loadApplications();
  await searchTechJobs();
}

// 1. Profile Manager
async function loadProfile() {
  try {
    const res = await fetch('/api/profile');
    currentProfile = await res.json();
    document.getElementById('sidebarUserName').textContent = currentProfile.personal.name;
    document.getElementById('sidebarUserRole').textContent = currentProfile.personal.headline.split('—')[0].trim();

    // Fill profile editor
    document.getElementById('profName').value = currentProfile.personal.name;
    document.getElementById('profHeadline').value = currentProfile.personal.headline;
    document.getElementById('profEmail').value = currentProfile.personal.email;
    document.getElementById('profPhone').value = currentProfile.personal.phone;
    document.getElementById('profLocation').value = currentProfile.personal.location;
    document.getElementById('profLinkedin').value = currentProfile.personal.linkedin;
    document.getElementById('profSummary').value = currentProfile.summary;

    renderSkillsHierarchy(currentProfile.skills);
  } catch (err) {
    console.error('Error loading profile:', err);
  }
}

function renderSkillsHierarchy(skills) {
  const container = document.getElementById('skillsHierarchyContainer');
  container.innerHTML = '';
  for (const [category, list] of Object.entries(skills)) {
    const group = document.createElement('div');
    group.className = 'form-group';
    group.style.marginBottom = '14px';
    group.innerHTML = `
      <label style="color: var(--primary-cyan); font-weight:700;">${category}</label>
      <input type="text" data-skill-cat="${category}" value="${list.join(', ')}">
    `;
    container.appendChild(group);
  }
}

document.getElementById('btnSaveProfile').addEventListener('click', async () => {
  if (!currentProfile) return;
  currentProfile.personal.name = document.getElementById('profName').value;
  currentProfile.personal.headline = document.getElementById('profHeadline').value;
  currentProfile.personal.email = document.getElementById('profEmail').value;
  currentProfile.personal.phone = document.getElementById('profPhone').value;
  currentProfile.personal.location = document.getElementById('profLocation').value;
  currentProfile.personal.linkedin = document.getElementById('profLinkedin').value;
  currentProfile.summary = document.getElementById('profSummary').value;

  const skillInputs = document.querySelectorAll('[data-skill-cat]');
  skillInputs.forEach(input => {
    const cat = input.getAttribute('data-skill-cat');
    currentProfile.skills[cat] = input.value.split(',').map(s => s.trim()).filter(Boolean);
  });

  const res = await fetch('/api/profile', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(currentProfile)
  });
  if (res.ok) {
    showToast('Master profile updated successfully!');
  }
});

// 2. Job Radar
async function searchTechJobs(forceRefresh = false) {
  jobsGrid.innerHTML = `
    <div class="loading-state">
      <div class="spinner"></div>
      <p>Scanning job boards & scoring ATS match against Rahul's profile...</p>
    </div>
  `;

  const q = encodeURIComponent(searchInput.value.trim());
  const loc = encodeURIComponent(locationFilter.value);
  try {
    const res = await fetch(`/api/jobs/search?query=${q}&location=${loc}&refresh=${forceRefresh}`);
    const data = await res.json();
    currentJobs = data.jobs || [];
    renderJobsGrid(currentJobs);
  } catch (err) {
    jobsGrid.innerHTML = `<div class="loading-state"><p>Error fetching jobs: ${err.message}</p></div>`;
  }
}

btnSearchJobs.addEventListener('click', () => searchTechJobs());
btnInstantScan.addEventListener('click', () => {
  showToast('Initiating fresh job board scan across providers...', '⚡');
  searchTechJobs(true);
});

function renderJobsGrid(jobs) {
  if (!jobs || jobs.length === 0) {
    jobsGrid.innerHTML = `<div class="loading-state"><p>No roles matching criteria. Try different search terms.</p></div>`;
    return;
  }

  jobsGrid.innerHTML = '';
  jobs.forEach(job => {
    const card = document.createElement('div');
    card.className = 'job-card';

    const matchScore = job.matchScore || 75;
    let pillClass = 'medium';
    if (matchScore >= 85) pillClass = 'high';

    card.innerHTML = `
      <div class="job-card-top">
        <div>
          <span class="job-company">${escapeHtml(job.company)}</span>
          <h3 class="job-title">${escapeHtml(job.title)}</h3>
        </div>
        <div class="match-pill ${pillClass}">
          <span>🎯 ${matchScore}% ATS</span>
        </div>
      </div>
      <div class="job-meta-row">
        <span>📍 ${escapeHtml(job.location)}</span>
        <span>💼 ${escapeHtml(job.workType)}</span>
        ${job.salary ? `<span>💰 ${escapeHtml(job.salary)}</span>` : ''}
      </div>
      <div class="job-desc-snippet">${escapeHtml(job.cleanedDescription || job.description)}</div>
      <div class="job-tags-row">
        ${(job.tags || []).slice(0, 4).map(t => `<span class="tag-badge ${job.matchedKeywords?.includes(t.toLowerCase()) ? 'matched' : ''}">#${escapeHtml(t)}</span>`).join('')}
      </div>
      <div class="job-actions-row">
        <button class="btn-card primary" onclick="tailorForJob('${job.id}')">⚡ Optimize & Tailor</button>
        <a class="btn-card secondary" href="${escapeHtml(job.url)}" target="_blank" rel="noopener">Apply Link ↗</a>
      </div>
    `;
    jobsGrid.appendChild(card);
  });
}

// 3. Tailor for Job
window.tailorForJob = async function(jobId) {
  const job = currentJobs.find(j => j.id === jobId);
  if (!job) return;

  showToast(`Tailoring resume for ${job.company} — ${job.title}...`, '🚀');

  try {
    const res = await fetch('/api/resume/tailor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job })
    });
    const data = await res.json();
    currentTailored = data;
    currentJob = job;

    populateResumeStudio(data, job);
    populateCopilot(data, job);
    switchTab('tab-studio');
    showToast(`Resume tailored with ${data.tailored.analysis.matchScore}% ATS match!`, '🎯');
  } catch (err) {
    showToast(`Tailor failed: ${err.message}`, '❌');
  }
};

function populateResumeStudio(data, job) {
  const { tailored, formats } = data;
  const analysis = tailored.analysis;

  // Score
  atsScoreNumber.textContent = analysis.matchScore;
  targetRoleBadge.textContent = `${job.company} — ${job.title}`;

  if (analysis.matchScore >= 85) {
    atsVerdict.textContent = 'High ATS Alignment';
    atsScoreCircle.style.borderColor = 'var(--primary-cyan)';
    atsScoreNumber.style.color = 'var(--primary-cyan)';
  } else if (analysis.matchScore >= 70) {
    atsVerdict.textContent = 'Good Core Fit';
    atsScoreCircle.style.borderColor = 'var(--accent-emerald)';
    atsScoreNumber.style.color = '#34d399';
  } else {
    atsVerdict.textContent = 'Moderate Alignment';
    atsScoreCircle.style.borderColor = 'var(--accent-amber)';
    atsScoreNumber.style.color = 'var(--accent-amber)';
  }

  // Tags
  matchedTags.innerHTML = analysis.matchedKeywords.map(k => `<span class="tag">✓ ${escapeHtml(k)}</span>`).join('') || '<span class="tag">Systems Leadership</span>';
  document.getElementById('matchedCount').textContent = analysis.matchedKeywords.length;

  missingTags.innerHTML = analysis.missingKeywords.map(k => `<span class="tag">! ${escapeHtml(k)}</span>`).join('') || '<span class="tag">None detected</span>';
  document.getElementById('missingCount').textContent = analysis.missingKeywords.length;

  // Strengths
  strengthsList.innerHTML = (analysis.strengths || []).map(s => `<li>${escapeHtml(s)}</li>`).join('');

  // Preview Iframe
  const doc = resumePreviewFrame.contentDocument || resumePreviewFrame.contentWindow.document;
  doc.open();
  doc.write(formats.html);
  doc.close();
}

function populateCopilot(data, job) {
  coverLetterBox.value = data.formats.coverLetter;

  // Screening Answers
  qaContainer.innerHTML = '';
  (data.formats.screeningAnswers || []).forEach(qa => {
    const card = document.createElement('div');
    card.className = 'qa-card';
    card.innerHTML = `
      <div class="qa-q-row">
        <span class="qa-question">${escapeHtml(qa.question)}</span>
        <button class="qa-btn-copy" onclick="copySnippet(this, ${JSON.stringify(qa.answer)})">Copy</button>
      </div>
      <div class="qa-answer">${escapeHtml(qa.answer)}</div>
    `;
    qaContainer.appendChild(card);
  });
}

// 4. Studio Action Handlers
btnPrintPdf.addEventListener('click', () => {
  if (resumePreviewFrame && resumePreviewFrame.contentWindow) {
    resumePreviewFrame.contentWindow.print();
  }
});

btnCopyMarkdown.addEventListener('click', () => {
  if (currentTailored?.formats?.markdown) {
    navigator.clipboard.writeText(currentTailored.formats.markdown);
    showToast('Clean ATS Markdown copied to clipboard!', '📋');
  }
});

btnCopyLatex.addEventListener('click', () => {
  if (currentTailored?.formats?.latex) {
    navigator.clipboard.writeText(currentTailored.formats.latex);
    showToast('LaTeX source code copied to clipboard!', '📄');
  }
});

btnSaveToTracker.addEventListener('click', async () => {
  if (!currentJob || !currentTailored) return;
  try {
    const res = await fetch('/api/resume/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job: currentJob,
        tailored: currentTailored.tailored,
        formats: currentTailored.formats
      })
    });
    if (res.ok) {
      showToast('Application saved to pipeline & files generated in resumes/!', '💾');
      await loadApplications();
    }
  } catch (err) {
    showToast('Failed to save application: ' + err.message, '❌');
  }
});

btnCopyCoverLetter.addEventListener('click', () => {
  if (coverLetterBox.value) {
    navigator.clipboard.writeText(coverLetterBox.value);
    showToast('Cover letter copied to clipboard!', '✍️');
  }
});

window.copySnippet = function(btn, text) {
  navigator.clipboard.writeText(text);
  const oldText = btn.textContent;
  btn.textContent = 'Copied!';
  btn.style.background = 'var(--accent-emerald)';
  setTimeout(() => {
    btn.textContent = oldText;
    btn.style.background = '';
  }, 1800);
  showToast('Answer copied to clipboard!', '📋');
};

// 5. Application Tracker (Kanban)
async function loadApplications() {
  try {
    const res = await fetch('/api/applications');
    currentApplications = await res.json();
    renderKanban(currentApplications);
  } catch (err) {
    console.error('Failed to load applications:', err);
  }
}

function renderKanban(apps) {
  const columns = ['discovered', 'tailored', 'applied', 'interviewing', 'offer'];
  const counts = { discovered: 0, tailored: 0, applied: 0, interviewing: 0, offer: 0 };

  columns.forEach(col => {
    document.getElementById(`col-${col}`).innerHTML = '';
  });

  apps.forEach(app => {
    const status = columns.includes(app.status) ? app.status : 'discovered';
    counts[status] = (counts[status] || 0) + 1;

    const colEl = document.getElementById(`col-${status}`);
    const card = document.createElement('div');
    card.className = 'kanban-card';
    card.innerHTML = `
      <div class="kanban-card-co">${escapeHtml(app.company)}</div>
      <div class="kanban-card-role">${escapeHtml(app.role)}</div>
      <div class="kanban-card-score">🎯 ${app.matchScore}% Match • ${escapeHtml(app.workType)}</div>
      <div class="kanban-card-footer">
        <select class="status-select" onchange="updateAppStatus('${app.id}', this.value)">
          <option value="discovered" ${status === 'discovered' ? 'selected' : ''}>Discovered</option>
          <option value="tailored" ${status === 'tailored' ? 'selected' : ''}>Tailored</option>
          <option value="applied" ${status === 'applied' ? 'selected' : ''}>Applied</option>
          <option value="interviewing" ${status === 'interviewing' ? 'selected' : ''}>Interviewing</option>
          <option value="offer" ${status === 'offer' ? 'selected' : ''}>Offer</option>
        </select>
        ${app.url ? `<a href="${escapeHtml(app.url)}" target="_blank" style="color:var(--text-subtle);font-size:11px;">Link ↗</a>` : ''}
      </div>
    `;
    colEl.appendChild(card);
  });

  columns.forEach(col => {
    document.getElementById(`badge-${col}`).textContent = counts[col] || 0;
  });

  trackerCountBadge.textContent = apps.length;
}

window.updateAppStatus = async function(id, newStatus) {
  try {
    const res = await fetch(`/api/applications/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: newStatus,
        dateApplied: newStatus === 'applied' ? new Date().toISOString().split('T')[0] : undefined
      })
    });
    if (res.ok) {
      showToast(`Status updated to ${newStatus.toUpperCase()}`, '📊');
      await loadApplications();
    }
  } catch (err) {
    showToast('Failed to update status', '❌');
  }
};

// 6. Auto-Pilot Controls
async function loadAutopilotStatus() {
  try {
    const res = await fetch('/api/autopilot/status');
    autopilotConfig = await res.json();

    autopilotToggle.checked = autopilotConfig.enabled;
    updateAutopilotUI(autopilotConfig.enabled);
  } catch (err) {
    console.error('Failed to load autopilot:', err);
  }
}

function updateAutopilotUI(enabled) {
  if (enabled) {
    autopilotPulse.className = 'pulse-indicator on';
    autopilotCard.classList.add('active');
    autopilotStatusText.textContent = `Autonomous scan: Active (Every ${autopilotConfig?.intervalMinutes || 30}m)`;
    autopilotToggleLabel.textContent = 'Auto-Pilot Running';
  } else {
    autopilotPulse.className = 'pulse-indicator off';
    autopilotCard.classList.remove('active');
    autopilotStatusText.textContent = 'Autonomous scan: Paused';
    autopilotToggleLabel.textContent = 'Enable Auto-Pilot';
  }
}

autopilotToggle.addEventListener('change', async (e) => {
  const isEnabled = e.target.checked;
  const endpoint = isEnabled ? '/api/autopilot/start' : '/api/autopilot/stop';

  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intervalMinutes: 30 })
    });
    const data = await res.json();
    autopilotConfig = data.config;
    updateAutopilotUI(isEnabled);
    showToast(isEnabled ? '⚡ Auto-Pilot Activated! Scanning & auto-tailoring high-match roles...' : '⏸️ Auto-Pilot Paused.', isEnabled ? '🤖' : '⏸️');
  } catch (err) {
    showToast('Failed to toggle Auto-Pilot: ' + err.message, '❌');
  }
});

// 7. Custom JD Modal
btnPasteJdModal.addEventListener('click', () => {
  customJdModal.classList.add('open');
});

function closeModal() {
  customJdModal.classList.remove('open');
}

btnCloseModal.addEventListener('click', closeModal);
btnCancelModal.addEventListener('click', closeModal);

btnFetchUrl.addEventListener('click', async () => {
  const url = document.getElementById('modalJobUrl').value.trim();
  if (!url) return;
  btnFetchUrl.textContent = 'Fetching...';
  try {
    const res = await fetch('/api/jobs/parse-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const data = await res.json();
    document.getElementById('modalCompany').value = data.job.company;
    document.getElementById('modalRole').value = data.job.title;
    document.getElementById('modalJdText').value = data.job.description;
    showToast('Job details extracted from URL!', '✅');
  } catch (err) {
    showToast('Failed to parse URL: ' + err.message, '❌');
  } finally {
    btnFetchUrl.textContent = 'Fetch JD';
  }
});

btnStartTailorCustom.addEventListener('click', async () => {
  const company = document.getElementById('modalCompany').value.trim() || 'Target Company';
  const title = document.getElementById('modalRole').value.trim() || 'Senior Software Engineer';
  const description = document.getElementById('modalJdText').value.trim();
  const url = document.getElementById('modalJobUrl').value.trim();

  if (!description) {
    showToast('Please paste a job description or provide a URL', '⚠️');
    return;
  }

  const customJob = {
    id: `custom-${Date.now()}`,
    company,
    title,
    description,
    cleanedDescription: description,
    url,
    location: 'Remote / Custom',
    workType: 'Full-time'
  };

  closeModal();
  currentJobs.unshift(customJob);
  await window.tailorForJob(customJob.id);
});

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Start
init();
