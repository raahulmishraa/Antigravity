/**
 * application_tracker.js
 * Persistent store and manager for job applications across pipeline stages.
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'applications.json');
const RESUMES_DIR = path.join(__dirname, '..', 'resumes');

// Ensure directories exist
if (!fs.existsSync(RESUMES_DIR)) {
  fs.mkdirSync(RESUMES_DIR, { recursive: true });
}

function loadData() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      const initial = { applications: [] };
      fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
      return initial;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[ApplicationTracker] Read error:', err.message);
    return { applications: [] };
  }
}

function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error('[ApplicationTracker] Write error:', err.message);
    return false;
  }
}

function getApplications() {
  const data = loadData();
  return data.applications || [];
}

function getApplicationById(id) {
  const apps = getApplications();
  return apps.find(a => a.id === id) || null;
}

function addApplication(appData) {
  const data = loadData();
  const id = appData.id || `app-${Date.now()}`;
  
  // Check if already tracked
  const existing = data.applications.find(a => a.id === id || (a.company.toLowerCase() === appData.company.toLowerCase() && a.role.toLowerCase() === appData.role.toLowerCase()));
  if (existing) {
    return existing;
  }

  const newApp = {
    id,
    company: appData.company || 'Unknown',
    role: appData.role || 'Software Engineer',
    location: appData.location || 'Remote',
    workType: appData.workType || 'Remote',
    url: appData.url || '',
    matchScore: appData.matchScore || 0,
    status: appData.status || 'discovered', // discovered, saved, tailored, applied, interviewing, offer, rejected
    dateDiscovered: appData.dateDiscovered || new Date().toISOString().split('T')[0],
    dateApplied: appData.dateApplied || null,
    notes: appData.notes || '',
    resumeFiles: appData.resumeFiles || {},
    screeningAnswers: appData.screeningAnswers || []
  };

  data.applications.unshift(newApp);
  saveData(data);
  return newApp;
}

function updateApplication(id, updates) {
  const data = loadData();
  const index = data.applications.findIndex(a => a.id === id);
  if (index === -1) return null;

  data.applications[index] = {
    ...data.applications[index],
    ...updates
  };

  saveData(data);
  return data.applications[index];
}

function deleteApplication(id) {
  const data = loadData();
  const filtered = data.applications.filter(a => a.id !== id);
  if (filtered.length !== data.applications.length) {
    data.applications = filtered;
    saveData(data);
    return true;
  }
  return false;
}

module.exports = {
  getApplications,
  getApplicationById,
  addApplication,
  updateApplication,
  deleteApplication,
  RESUMES_DIR
};
