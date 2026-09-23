/**
 * job_search.js
 * Multi-source tech job search aggregator and URL/JD parser.
 */

const fs = require('fs');
const path = require('path');

// In-memory cache for aggregated jobs (15 minute TTL)
let cachedJobs = [];
let lastFetchTime = 0;
const CACHE_TTL_MS = 15 * 60 * 1000;

/**
 * Fetch jobs from RemoteOK API
 */
async function fetchRemoteOK(tag = '') {
  try {
    const url = tag ? `https://remoteok.com/api?tag=${encodeURIComponent(tag)}` : 'https://remoteok.com/api';
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'JobHuntingAgent/1.0 (Mozilla/5.0)'
      }
    });
    if (!res.ok) throw new Error(`RemoteOK HTTP error ${res.status}`);
    const data = await res.json();
    
    // First item is legal notice, filter out
    const jobs = Array.isArray(data) ? data.slice(1) : [];
    return jobs.map(j => ({
      id: `remoteok-${j.id || Math.random().toString(36).substring(7)}`,
      source: 'RemoteOK',
      title: j.position || 'Software Engineer',
      company: j.company || 'Unknown Company',
      location: j.location || 'Remote',
      workType: 'Remote',
      tags: j.tags || [],
      description: j.description || '',
      url: j.url || (j.apply_url || `https://remoteok.com/remote-jobs/${j.id}`),
      date: j.date ? new Date(j.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      salary: j.salary_min && j.salary_max ? `$${j.salary_min.toLocaleString()} - $${j.salary_max.toLocaleString()}` : ''
    }));
  } catch (err) {
    console.error('[RemoteOK Fetch Error]:', err.message);
    return [];
  }
}

/**
 * Fetch jobs from Arbeitnow API
 */
async function fetchArbeitnow() {
  try {
    const res = await fetch('https://www.arbeitnow.com/api/job-board-api', {
      headers: {
        'User-Agent': 'JobHuntingAgent/1.0'
      }
    });
    if (!res.ok) throw new Error(`Arbeitnow HTTP error ${res.status}`);
    const data = await res.json();
    const list = data.data || [];
    return list.map(j => ({
      id: `arbeitnow-${j.slug || Math.random().toString(36).substring(7)}`,
      source: 'Arbeitnow',
      title: j.title || 'Software Engineer',
      company: j.company_name || 'Tech Company',
      location: j.location || (j.remote ? 'Remote' : 'Worldwide'),
      workType: j.remote ? 'Remote' : 'Onsite/Hybrid',
      tags: j.tags || [],
      description: j.description || '',
      url: j.url,
      date: j.created_at ? new Date(j.created_at * 1000).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      salary: ''
    }));
  } catch (err) {
    console.error('[Arbeitnow Fetch Error]:', err.message);
    return [];
  }
}

/**
 * Fetch jobs from Jobicy API
 */
async function fetchJobicy(tag = '') {
  try {
    const url = tag ? `https://jobicy.com/api/v2/remote-jobs?tag=${encodeURIComponent(tag)}&count=20` : 'https://jobicy.com/api/v2/remote-jobs?count=25';
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'JobHuntingAgent/1.0'
      }
    });
    if (!res.ok) throw new Error(`Jobicy HTTP error ${res.status}`);
    const data = await res.json();
    const list = data.jobs || [];
    return list.map(j => ({
      id: `jobicy-${j.id || Math.random().toString(36).substring(7)}`,
      source: 'Jobicy',
      title: j.jobTitle || 'Engineer',
      company: j.companyName || 'Company',
      location: j.jobGeo || 'Remote',
      workType: 'Remote',
      tags: j.jobIndustry ? [j.jobIndustry] : [],
      description: j.jobDescription || j.jobExcerpt || '',
      url: j.url,
      date: j.pubDate ? new Date(j.pubDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      salary: j.annualSalaryMin && j.annualSalaryMax ? `$${j.annualSalaryMin} - $${j.annualSalaryMax}` : ''
    }));
  } catch (err) {
    console.error('[Jobicy Fetch Error]:', err.message);
    return [];
  }
}

/**
 * Strip HTML tags to extract clean text for JD analysis
 */
function cleanHtml(html) {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}

/**
 * Parse a custom Job Posting URL (Greenhouse, Lever, LinkedIn, Ashby, etc.)
 */
async function parseJobUrl(targetUrl) {
  try {
    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    });
    if (!res.ok) throw new Error(`Failed to fetch URL: HTTP ${res.status}`);
    const html = await res.text();

    // Extract title from <title> or <h1>
    let title = '';
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) {
      title = titleMatch[1].replace(/ - [^-]+$/, '').trim();
    }
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    if (h1Match && (!title || h1Match[1].length < title.length)) {
      title = h1Match[1].trim();
    }

    // Extract company name if greenhouse/lever or title pattern
    let company = 'Company';
    if (targetUrl.includes('greenhouse.io/')) {
      const match = targetUrl.match(/greenhouse\.io\/([^/]+)/);
      if (match) company = match[1].charAt(0).toUpperCase() + match[1].slice(1);
    } else if (targetUrl.includes('lever.co/')) {
      const match = targetUrl.match(/lever\.co\/([^/]+)/);
      if (match) company = match[1].charAt(0).toUpperCase() + match[1].slice(1);
    } else if (title.includes(' at ')) {
      const parts = title.split(' at ');
      company = parts[1].trim();
      title = parts[0].trim();
    }

    const cleanDescription = cleanHtml(html);

    return {
      id: `custom-${Date.now()}`,
      source: 'Custom URL',
      title: title || 'Target Engineering Role',
      company: company,
      location: 'See Job Post',
      workType: 'Full-time',
      url: targetUrl,
      description: cleanDescription,
      date: new Date().toISOString().split('T')[0]
    };
  } catch (err) {
    throw new Error(`Failed to parse job URL: ${err.message}`);
  }
}

/**
 * Search all job sources with filtering
 */
async function searchJobs(options = {}) {
  const {
    query = '',
    location = '',
    workType = '',
    limit = 40,
    forceRefresh = false
  } = options;

  const now = Date.now();
  if (forceRefresh || cachedJobs.length === 0 || now - lastFetchTime > CACHE_TTL_MS) {
    console.log('[JobSearch] Fetching fresh jobs across providers...');
    const [remoteOkJobs, arbeitnowJobs, jobicyJobs] = await Promise.all([
      fetchRemoteOK(query),
      fetchArbeitnow(),
      fetchJobicy(query)
    ]);

    cachedJobs = [...remoteOkJobs, ...arbeitnowJobs, ...jobicyJobs];
    lastFetchTime = now;
    console.log(`[JobSearch] Aggregated ${cachedJobs.length} total jobs.`);
  }

  // Filter based on user query
  let filtered = cachedJobs;

  if (query) {
    const qTerms = query.toLowerCase().split(/[,\s]+/).filter(Boolean);
    filtered = filtered.filter(job => {
      const content = `${job.title} ${job.company} ${job.description} ${(job.tags || []).join(' ')}`.toLowerCase();
      // Match if any of the search terms match title or keywords
      return qTerms.some(term => content.includes(term));
    });
  }

  if (location && location.toLowerCase() !== 'all') {
    const locLower = location.toLowerCase();
    filtered = filtered.filter(job => {
      const jobLoc = (job.location || '').toLowerCase();
      return jobLoc.includes(locLower) || (locLower.includes('remote') && job.workType.toLowerCase() === 'remote');
    });
  }

  if (workType && workType.toLowerCase() !== 'all') {
    const wtLower = workType.toLowerCase();
    filtered = filtered.filter(job => (job.workType || '').toLowerCase().includes(wtLower));
  }

  // Clean description HTML for output preview
  return filtered.slice(0, limit).map(j => ({
    ...j,
    cleanedDescription: cleanHtml(j.description)
  }));
}

module.exports = {
  searchJobs,
  parseJobUrl,
  cleanHtml
};
