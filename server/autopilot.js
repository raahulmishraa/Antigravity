/**
 * autopilot.js
 * Autonomous Auto-Pilot engine that continuously monitors job boards,
 * calculates ATS match scores, tailors resumes, generates cover letters and Q&A,
 * and tracks high-match applications automatically.
 */

const fs = require('fs');
const path = require('path');
const { searchJobs } = require('./job_search');
const { analyzeJobMatch, tailorResume } = require('./ats_engine');
const {
  generateAtsHtml,
  generateAtsMarkdown,
  generateLatex,
  generateCoverLetter,
  generateScreeningAnswers
} = require('./resume_generator');
const tracker = require('./application_tracker');

const PROFILE_FILE = path.join(__dirname, '..', 'data', 'master_profile.json');
const AUTOPILOT_CONFIG_FILE = path.join(__dirname, '..', 'data', 'autopilot_config.json');

// Default Auto-Pilot Configuration
const defaultConfig = {
  enabled: false,
  intervalMinutes: 30,
  matchThreshold: 75,
  keywords: 'C++, Java, Distributed Systems, Tech Lead, Backend',
  targetLocations: ['Remote', 'Bangalore', 'Worldwide'],
  autoTailor: true,
  autoPrepareAnswers: true,
  stats: {
    totalScans: 0,
    jobsScanned: 0,
    matchesFound: 0,
    resumesTailored: 0,
    lastRun: null,
    recentEvents: []
  }
};

let activeInterval = null;
let isCycleRunning = false;

function loadConfig() {
  try {
    if (!fs.existsSync(AUTOPILOT_CONFIG_FILE)) {
      fs.writeFileSync(AUTOPILOT_CONFIG_FILE, JSON.stringify(defaultConfig, null, 2));
      return { ...defaultConfig };
    }
    const raw = fs.readFileSync(AUTOPILOT_CONFIG_FILE, 'utf8');
    return { ...defaultConfig, ...JSON.parse(raw) };
  } catch (err) {
    console.error('[AutoPilot] Failed to load config:', err.message);
    return { ...defaultConfig };
  }
}

function saveConfig(config) {
  try {
    fs.writeFileSync(AUTOPILOT_CONFIG_FILE, JSON.stringify(config, null, 2));
    return true;
  } catch (err) {
    console.error('[AutoPilot] Failed to save config:', err.message);
    return false;
  }
}

function loadProfile() {
  try {
    const raw = fs.readFileSync(PROFILE_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[AutoPilot] Failed to load master profile:', err.message);
    return null;
  }
}

function sanitizeFilename(str) {
  return (str || 'file').replace(/[^a-z0-9]/gi, '_').replace(/_+/g, '_').substring(0, 50);
}

function logEvent(config, message, type = 'info') {
  const timestamp = new Date().toISOString();
  const event = { timestamp, message, type };
  config.stats.recentEvents.unshift(event);
  if (config.stats.recentEvents.length > 50) {
    config.stats.recentEvents.pop();
  }
  console.log(`[AutoPilot ${timestamp.substring(11, 19)}] ${message}`);
}

/**
 * Execute a single Auto-Pilot scan and tailoring cycle
 */
async function runAutoPilotCycle() {
  if (isCycleRunning) {
    console.log('[AutoPilot] Cycle already in progress, skipping.');
    return;
  }

  isCycleRunning = true;
  const config = loadConfig();
  const profile = loadProfile();

  if (!profile) {
    console.error('[AutoPilot] Master profile unavailable. Skipping cycle.');
    isCycleRunning = false;
    return;
  }

  try {
    logEvent(config, `🚀 Starting autonomous scan (Threshold: ${config.matchThreshold}% | Query: "${config.keywords}")...`);

    const jobs = await searchJobs({
      query: config.keywords,
      limit: 60,
      forceRefresh: true
    });

    config.stats.totalScans += 1;
    config.stats.jobsScanned += jobs.length;
    config.stats.lastRun = new Date().toISOString();

    const existingApps = tracker.getApplications();
    const existingJobKeys = new Set(
      existingApps.map(a => `${a.company.toLowerCase()}_${a.role.toLowerCase()}`)
    );

    let cycleMatches = 0;
    let cycleTailored = 0;

    for (const job of jobs) {
      const match = analyzeJobMatch(profile, job);
      const jobKey = `${job.company.toLowerCase()}_${job.title.toLowerCase()}`;

      if (match.matchScore >= config.matchThreshold) {
        cycleMatches += 1;

        if (!existingJobKeys.has(jobKey)) {
          // New high-match opportunity!
          existingJobKeys.add(jobKey);

          let resumeFiles = {};
          let screeningAnswers = [];

          if (config.autoTailor) {
            // Generate tailored assets
            const tailored = tailorResume(profile, job);
            const coverLetter = generateCoverLetter(tailored, job);
            screeningAnswers = generateScreeningAnswers(tailored, job);

            const folderName = `${sanitizeFilename(job.company)}_${sanitizeFilename(job.title)}`;
            const jobDir = path.join(tracker.RESUMES_DIR, folderName);
            if (!fs.existsSync(jobDir)) {
              fs.mkdirSync(jobDir, { recursive: true });
            }

            const htmlPath = path.join(jobDir, 'resume.html');
            const mdPath = path.join(jobDir, 'resume.md');
            const texPath = path.join(jobDir, 'resume.tex');
            const clPath = path.join(jobDir, 'cover_letter.txt');

            fs.writeFileSync(htmlPath, generateAtsHtml(tailored));
            fs.writeFileSync(mdPath, generateAtsMarkdown(tailored));
            fs.writeFileSync(texPath, generateLatex(tailored));
            fs.writeFileSync(clPath, coverLetter);

            resumeFiles = {
              folder: folderName,
              html: `/resumes/${folderName}/resume.html`,
              markdown: `/resumes/${folderName}/resume.md`,
              latex: `/resumes/${folderName}/resume.tex`,
              coverLetter: `/resumes/${folderName}/cover_letter.txt`
            };

            cycleTailored += 1;
            config.stats.resumesTailored += 1;
          }

          // Register in Application Pipeline
          tracker.addApplication({
            company: job.company,
            role: job.title,
            location: job.location,
            workType: job.workType,
            url: job.url,
            matchScore: match.matchScore,
            status: config.autoTailor ? 'tailored' : 'discovered',
            dateDiscovered: new Date().toISOString().split('T')[0],
            notes: `Auto-Pilot detected ${match.matchScore}% ATS match. Keywords: ${match.matchedKeywords.slice(0, 5).join(', ')}.`,
            resumeFiles,
            screeningAnswers
          });

          logEvent(
            config,
            `🎯 [Match ${match.matchScore}%] Auto-tailored resume for ${job.company} — "${job.title}"`,
            'match'
          );
        }
      }
    }

    config.stats.matchesFound += cycleMatches;
    logEvent(
      config,
      `✅ Cycle complete. Scanned ${jobs.length} jobs, found ${cycleMatches} matches (>= ${config.matchThreshold}%), tailored ${cycleTailored} new resumes.`
    );

    saveConfig(config);
  } catch (err) {
    logEvent(config, `❌ Cycle error: ${err.message}`, 'error');
  } finally {
    isCycleRunning = false;
  }
}

/**
 * Start Auto-Pilot loop
 */
function startAutoPilot(intervalMinutes = null) {
  const config = loadConfig();
  if (intervalMinutes) {
    config.intervalMinutes = Math.max(1, parseInt(intervalMinutes, 10));
  }
  config.enabled = true;
  saveConfig(config);

  if (activeInterval) clearInterval(activeInterval);

  logEvent(config, `⚡ Auto-Pilot ENABLED. Scanning every ${config.intervalMinutes} minutes.`);

  // Trigger first cycle immediately
  runAutoPilotCycle();

  // Schedule recurring intervals
  const ms = config.intervalMinutes * 60 * 1000;
  activeInterval = setInterval(() => {
    runAutoPilotCycle();
  }, ms);

  return config;
}

/**
 * Stop Auto-Pilot loop
 */
function stopAutoPilot() {
  const config = loadConfig();
  config.enabled = false;
  saveConfig(config);

  if (activeInterval) {
    clearInterval(activeInterval);
    activeInterval = null;
  }

  logEvent(config, '⏸️ Auto-Pilot PAUSED.');
  return config;
}

/**
 * Get current Auto-Pilot status
 */
function getAutoPilotStatus() {
  const config = loadConfig();
  return {
    ...config,
    isRunningNow: isCycleRunning
  };
}

module.exports = {
  loadConfig,
  saveConfig,
  startAutoPilot,
  stopAutoPilot,
  getAutoPilotStatus,
  runAutoPilotCycle
};
