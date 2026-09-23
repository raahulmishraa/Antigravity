/**
 * server.js
 * Express server providing REST APIs for Job Searching, ATS Tailoring,
 * Application Tracking, and the Autonomous Auto-Pilot Agent.
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const { searchJobs, parseJobUrl } = require('./job_search');
const { analyzeJobMatch, tailorResume } = require('./ats_engine');
const {
  generateAtsHtml,
  generateAtsMarkdown,
  generateLatex,
  generateCoverLetter,
  generateScreeningAnswers
} = require('./resume_generator');
const tracker = require('./application_tracker');
const autopilot = require('./autopilot');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static frontend files
app.use(express.static(path.join(__dirname, '..', 'public')));
// Serve generated tailored resumes
app.use('/resumes', express.static(tracker.RESUMES_DIR));

const PROFILE_FILE = path.join(__dirname, '..', 'data', 'master_profile.json');

function getProfile() {
  return JSON.parse(fs.readFileSync(PROFILE_FILE, 'utf8'));
}

/* ==========================================================================
   1. Master Profile Endpoints
   ========================================================================== */

app.get('/api/profile', (req, res) => {
  try {
    const profile = getProfile();
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/profile', (req, res) => {
  try {
    const updated = req.body;
    fs.writeFileSync(PROFILE_FILE, JSON.stringify(updated, null, 2));
    res.json({ success: true, profile: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ==========================================================================
   2. Job Search & Parsing Endpoints
   ========================================================================== */

app.get('/api/jobs/search', async (req, res) => {
  try {
    const { query, location, workType, limit, refresh } = req.query;
    const profile = getProfile();
    const jobs = await searchJobs({
      query: query || profile.preferences.targetTitles.join(' ') || 'C++',
      location: location || '',
      workType: workType || '',
      limit: parseInt(limit, 10) || 40,
      forceRefresh: refresh === 'true'
    });

    // Score jobs automatically
    const scoredJobs = jobs.map(j => {
      const match = analyzeJobMatch(profile, j);
      return {
        ...j,
        matchScore: match.matchScore,
        matchedKeywords: match.matchedKeywords,
        missingKeywords: match.missingKeywords
      };
    });

    // Sort by match score descending
    scoredJobs.sort((a, b) => b.matchScore - a.matchScore);

    res.json({ count: scoredJobs.length, jobs: scoredJobs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/jobs/parse-url', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL required' });
    const job = await parseJobUrl(url);
    const profile = getProfile();
    const match = analyzeJobMatch(profile, job);

    res.json({
      job: {
        ...job,
        matchScore: match.matchScore,
        matchedKeywords: match.matchedKeywords,
        missingKeywords: match.missingKeywords
      },
      match
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/jobs/analyze', (req, res) => {
  try {
    const { job } = req.body;
    if (!job) return res.status(400).json({ error: 'Job data required' });
    const profile = getProfile();
    const analysis = analyzeJobMatch(profile, job);
    res.json(analysis);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ==========================================================================
   3. Resume Tailoring & Generation Endpoints
   ========================================================================== */

app.post('/api/resume/tailor', (req, res) => {
  try {
    const { job } = req.body;
    if (!job) return res.status(400).json({ error: 'Job data required' });

    const profile = getProfile();
    const tailored = tailorResume(profile, job);

    const html = generateAtsHtml(tailored);
    const markdown = generateAtsMarkdown(tailored);
    const latex = generateLatex(tailored);
    const coverLetter = generateCoverLetter(tailored, job);
    const screeningAnswers = generateScreeningAnswers(tailored, job);

    res.json({
      tailored,
      formats: {
        html,
        markdown,
        latex,
        coverLetter,
        screeningAnswers
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/resume/save', (req, res) => {
  try {
    const { job, tailored, formats } = req.body;
    if (!job || !formats) return res.status(400).json({ error: 'Missing payload' });

    const cleanCompany = (job.company || 'Company').replace(/[^a-z0-9]/gi, '_');
    const cleanRole = (job.title || 'Role').replace(/[^a-z0-9]/gi, '_');
    const folderName = `${cleanCompany}_${cleanRole}`.substring(0, 50);
    const jobDir = path.join(tracker.RESUMES_DIR, folderName);

    if (!fs.existsSync(jobDir)) {
      fs.mkdirSync(jobDir, { recursive: true });
    }

    fs.writeFileSync(path.join(jobDir, 'resume.html'), formats.html);
    fs.writeFileSync(path.join(jobDir, 'resume.md'), formats.markdown);
    fs.writeFileSync(path.join(jobDir, 'resume.tex'), formats.latex);
    fs.writeFileSync(path.join(jobDir, 'cover_letter.txt'), formats.coverLetter);

    const resumeFiles = {
      folder: folderName,
      html: `/resumes/${folderName}/resume.html`,
      markdown: `/resumes/${folderName}/resume.md`,
      latex: `/resumes/${folderName}/resume.tex`,
      coverLetter: `/resumes/${folderName}/cover_letter.txt`
    };

    // Add or update in tracker
    const appRecord = tracker.addApplication({
      company: job.company,
      role: job.title,
      location: job.location,
      workType: job.workType,
      url: job.url,
      matchScore: tailored?.analysis?.matchScore || 85,
      status: 'tailored',
      notes: `Tailored resume and cover letter generated. Match score: ${tailored?.analysis?.matchScore || 85}%.`,
      resumeFiles,
      screeningAnswers: formats.screeningAnswers
    });

    res.json({ success: true, application: appRecord, resumeFiles });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ==========================================================================
   4. Application Pipeline Tracker Endpoints
   ========================================================================== */

app.get('/api/applications', (req, res) => {
  try {
    const apps = tracker.getApplications();
    res.json(apps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/applications', (req, res) => {
  try {
    const newApp = tracker.addApplication(req.body);
    res.json(newApp);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/applications/:id', (req, res) => {
  try {
    const updated = tracker.updateApplication(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Application not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/applications/:id', (req, res) => {
  try {
    const ok = tracker.deleteApplication(req.params.id);
    res.json({ success: ok });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ==========================================================================
   5. Auto-Pilot Agent Control Endpoints
   ========================================================================== */

app.get('/api/autopilot/status', (req, res) => {
  try {
    const status = autopilot.getAutoPilotStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/autopilot/start', (req, res) => {
  try {
    const { intervalMinutes } = req.body;
    const config = autopilot.startAutoPilot(intervalMinutes);
    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/autopilot/stop', (req, res) => {
  try {
    const config = autopilot.stopAutoPilot();
    res.json({ success: true, config });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/autopilot/trigger', async (req, res) => {
  try {
    // Run cycle asynchronously in background and respond immediately
    autopilot.runAutoPilotCycle();
    res.json({ success: true, message: 'Auto-Pilot cycle initiated.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/autopilot/config', (req, res) => {
  try {
    const current = autopilot.loadConfig();
    const updated = { ...current, ...req.body };
    autopilot.saveConfig(updated);
    res.json({ success: true, config: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Boot Server
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🤖 Job Hunting & Resume Agent Server is running!`);
  console.log(`📍 Web Dashboard: http://localhost:${PORT}`);
  console.log(`=======================================================`);
});
