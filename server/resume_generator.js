/**
 * resume_generator.js
 * Generates ATS-optimized HTML/PDF, Clean Markdown, LaTeX (.tex),
 * Tailored Cover Letters, and Application Screening Q&A.
 */

/**
 * Generate ATS-compliant single-column HTML with print styles for PDF export
 */
function generateAtsHtml(tailored) {
  const p = tailored.candidate;

  const skillsHtml = Object.entries(tailored.skills)
    .map(([cat, list]) => `
      <div class="skill-row">
        <strong>${escapeHtml(cat)}:</strong> ${escapeHtml(list.join(', '))}
      </div>
    `).join('');

  const experienceHtml = tailored.experience.map(exp => `
    <div class="job-entry">
      <div class="job-header">
        <span class="job-company">${escapeHtml(exp.company)} — ${escapeHtml(exp.location)}</span>
        <span class="job-dates">${escapeHtml(exp.startDate)} – ${escapeHtml(exp.endDate)}</span>
      </div>
      <div class="job-role">${escapeHtml(exp.role)}</div>
      <ul class="job-bullets">
        ${exp.bullets.map(b => `<li>${escapeHtml(b.text)}</li>`).join('')}
      </ul>
    </div>
  `).join('');

  const educationHtml = tailored.education.map(edu => `
    <div class="edu-entry">
      <strong>${escapeHtml(edu.degree)}</strong> — ${escapeHtml(edu.institution)} (${escapeHtml(edu.year)})
    </div>
  `).join('');

  const certsHtml = tailored.certifications.map(c => `
    <li>${escapeHtml(c.name)}${c.issuer ? ` (${escapeHtml(c.issuer)})` : ''} — <em>${escapeHtml(c.status)}</em></li>
  `).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${escapeHtml(p.name)} - Resume (${escapeHtml(tailored.targetCompany)})</title>
  <style>
    @page {
      margin: 0.45in 0.55in;
      size: letter;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 10.5pt;
      line-height: 1.35;
      color: #111827;
      background: #ffffff;
      margin: 0 auto;
      max-width: 820px;
      padding: 24px 32px;
    }
    .header {
      text-align: center;
      margin-bottom: 14px;
    }
    .name {
      font-size: 20pt;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: #1e3a8a;
      text-transform: uppercase;
      margin-bottom: 3px;
    }
    .headline {
      font-size: 11pt;
      font-weight: 600;
      color: #4b5563;
      margin-bottom: 5px;
    }
    .contact-info {
      font-size: 9.5pt;
      color: #4b5563;
    }
    .contact-info a {
      color: #1e3a8a;
      text-decoration: none;
    }
    .separator {
      margin: 0 6px;
      color: #9ca3af;
    }
    .section-title {
      font-size: 11pt;
      font-weight: 700;
      color: #1e3a8a;
      text-transform: uppercase;
      border-bottom: 1.5px solid #1e3a8a;
      padding-bottom: 2px;
      margin-top: 14px;
      margin-bottom: 6px;
      letter-spacing: 0.5px;
    }
    .summary-text {
      font-size: 10pt;
      text-align: justify;
      margin: 0;
    }
    .skill-row {
      font-size: 9.8pt;
      margin-bottom: 3px;
    }
    .job-entry {
      margin-bottom: 10px;
    }
    .job-header {
      display: flex;
      justify-content: space-between;
      font-weight: 700;
      font-size: 10.5pt;
    }
    .job-dates {
      color: #4b5563;
      font-weight: 500;
    }
    .job-role {
      font-style: italic;
      color: #374151;
      font-size: 10pt;
      margin-bottom: 4px;
    }
    .job-bullets {
      margin: 0;
      padding-left: 18px;
    }
    .job-bullets li {
      font-size: 9.8pt;
      margin-bottom: 2.5px;
      text-align: justify;
    }
    .edu-entry {
      font-size: 9.8pt;
      margin-bottom: 4px;
    }
    .cert-list {
      margin: 0;
      padding-left: 18px;
      font-size: 9.8pt;
    }
    @media print {
      body {
        padding: 0;
        max-width: 100%;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="name">${escapeHtml(p.name)}</div>
    <div class="headline">${escapeHtml(tailored.targetRole)}</div>
    <div class="contact-info">
      ${escapeHtml(p.phone)} <span class="separator">|</span>
      <a href="mailto:${escapeHtml(p.email)}">${escapeHtml(p.email)}</a> <span class="separator">|</span>
      <a href="${escapeHtml(p.linkedin)}" target="_blank">LinkedIn</a> <span class="separator">|</span>
      <span>${escapeHtml(p.location)}</span>
    </div>
  </div>

  <div class="section-title">Professional Summary</div>
  <p class="summary-text">${escapeHtml(tailored.summary)}</p>

  <div class="section-title">Technical Skills</div>
  ${skillsHtml}

  <div class="section-title">Professional Experience</div>
  ${experienceHtml}

  <div class="section-title">Education</div>
  ${educationHtml}

  <div class="section-title">Certifications</div>
  <ul class="cert-list">
    ${certsHtml}
  </ul>
</body>
</html>`;
}

/**
 * Generate clean Markdown representation
 */
function generateAtsMarkdown(tailored) {
  const p = tailored.candidate;

  let md = `# ${p.name}\n`;
  md += `**${tailored.targetRole}**\n`;
  md += `${p.phone} | [${p.email}](mailto:${p.email}) | [LinkedIn](${p.linkedin}) | ${p.location}\n\n`;

  md += `## Professional Summary\n`;
  md += `${tailored.summary}\n\n`;

  md += `## Technical Skills\n`;
  for (const [category, skills] of Object.entries(tailored.skills)) {
    md += `- **${category}:** ${skills.join(', ')}\n`;
  }
  md += `\n`;

  md += `## Professional Experience\n`;
  for (const exp of tailored.experience) {
    md += `### ${exp.company} — ${exp.location}\n`;
    md += `*${exp.role}* | **${exp.startDate} – ${exp.endDate}**\n\n`;
    for (const b of exp.bullets) {
      md += `- ${b.text}\n`;
    }
    md += `\n`;
  }

  md += `## Education\n`;
  for (const edu of tailored.education) {
    md += `- **${edu.degree}** — ${edu.institution} (${edu.year})\n`;
  }
  md += `\n`;

  md += `## Certifications\n`;
  for (const c of tailored.certifications) {
    md += `- **${c.name}**${c.issuer ? ` (${c.issuer})` : ''} — *${c.status}*\n`;
  }

  return md;
}

/**
 * Generate LaTeX representation matching professional template
 */
function generateLatex(tailored) {
  const p = tailored.candidate;

  let tex = `\\documentclass[10pt,letterpaper]{article}
\\usepackage[top=0.42in,bottom=0.4in,left=0.6in,right=0.6in]{geometry}
\\usepackage[T1]{fontenc}
\\usepackage[scaled=0.95]{helvet}
\\renewcommand{\\familydefault}{\\sfdefault}
\\usepackage{xcolor}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{microtype}

\\definecolor{navy}{HTML}{1F3A5F}
\\definecolor{grey}{HTML}{444444}

\\pagestyle{empty}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{0pt}
\\linespread{0.99}

\\newcommand{\\sect}[1]{\\par\\vspace{6pt}\\noindent{\\bfseries\\color{navy}\\MakeUppercase{#1}}\\par\\vspace{-4.5pt}%
  \\noindent{\\color{navy}\\rule{\\linewidth}{0.8pt}}\\par\\vspace{3pt}}

\\setlist[itemize]{leftmargin=12pt,itemsep=0.5pt,parsep=0pt,topsep=2pt,label=\\textbullet}

\\newcommand{\\job}[3]{%
  \\textbf{#1}\\hfill{\\color{grey}#2}\\\\[-1pt]
  {\\itshape\\color{grey}#3}\\vspace{1pt}%
}

\\begin{document}

\\begin{center}
  {\\color{navy}\\fontsize{20}{24}\\selectfont\\bfseries ${escapeLatex(p.name)}}\\\\[3pt]
  {\\color{grey}\\normalsize ${escapeLatex(tailored.targetRole)}}\\\\[3pt]
  {\\color{grey}\\small ${escapeLatex(p.phone)} \\ $|$ \\ ${escapeLatex(p.email)} \\ $|$ \\
  \\href{${p.linkedin}}{\\color{navy}LinkedIn}
  \\ $|$ \\ ${escapeLatex(p.location)}}
\\end{center}

\\sect{Professional Summary}
${escapeLatex(tailored.summary)}

\\sect{Technical Skills}
`;

  for (const [category, skills] of Object.entries(tailored.skills)) {
    tex += `\\textbf{${escapeLatex(category)}:} ${escapeLatex(skills.join(', '))}\\\\[1.5pt]\n`;
  }

  tex += `\n\\sect{Professional Experience}\n`;

  for (const exp of tailored.experience) {
    tex += `\n\\job{${escapeLatex(exp.company)} --- ${escapeLatex(exp.location)}}{${escapeLatex(exp.startDate)} -- ${escapeLatex(exp.endDate)}}{${escapeLatex(exp.role)}}\n`;
    tex += `\\begin{itemize}\n`;
    for (const b of exp.bullets) {
      tex += `  \\item ${escapeLatex(b.text)}\n`;
    }
    tex += `\\end{itemize}\n\\vspace{2pt}\n`;
  }

  tex += `\n\\sect{Education}\n`;
  for (const edu of tailored.education) {
    tex += `\\textbf{${escapeLatex(edu.degree)}} --- ${escapeLatex(edu.institution)} (${escapeLatex(edu.year)})\\\\[2pt]\n`;
  }

  tex += `\n\\sect{Certifications}\n\\begin{itemize}\n`;
  for (const c of tailored.certifications) {
    tex += `  \\item ${escapeLatex(c.name)}${c.issuer ? ` (${escapeLatex(c.issuer)})` : ''} -- \\textit{${escapeLatex(c.status)}}\n`;
  }
  tex += `\\end{itemize}\n\n\\end{document}\n`;

  return tex;
}

/**
 * Generate targeted cover letter
 */
function generateCoverLetter(tailored, job) {
  const p = tailored.candidate;
  const company = job.company || tailored.targetCompany || 'Hiring Team';
  const role = job.title || tailored.targetRole || 'Senior Software Engineer';
  const matched = (tailored.analysis?.matchedKeywords || []).slice(0, 4).join(', ');

  return `Dear Hiring Manager at ${company},

I am writing to express my strong enthusiasm for the ${role} position at ${company}. With over 9 years of hands-on experience building mission-critical, high-concurrency systems and leading engineering squads at Boeing and HCL, I have developed deep expertise in distributed architectures, low-latency messaging, and resilient systems design.

At Boeing, I served as Senior Software Engineer & Tech Lead, architecting a C++ microservices platform consisting of 10 core services and 130+ REST APIs for 777X/737 cabin systems. Under my technical leadership, our 5-engineer squad completed 3 major production releases with zero post-go-live P1 defects over 18 months. Additionally, I spearheaded event-driven Java/Spring Boot microservices utilizing Kafka and RabbitMQ that slashed API latency by 30%, implemented mutual TLS (mTLS) zero-trust security across all internal services, and developed computer vision systems that improved processing throughput by 70%.

What excites me most about ${company} is the opportunity to tackle complex, large-scale distributed problems. My background in ${matched || 'C++, multithreaded systems, and event-driven architecture'} allows me to hit the ground running, deliver clean and testable architectures, and mentor team members towards technical excellence.

Thank you for your time and consideration. I welcome the opportunity to discuss how my technical leadership and systems expertise can drive substantial value for ${company}.

Sincerely,

${p.name}
${p.phone} | ${p.email}
${p.location}`;
}

/**
 * Generate pre-filled screening question answers
 */
function generateScreeningAnswers(tailored, job) {
  const company = job.company || tailored.targetCompany || 'your team';
  const role = job.title || tailored.targetRole || 'the role';

  return [
    {
      question: `Why are you interested in joining ${company} as a ${role}?`,
      category: "Motivation & Company Fit",
      answer: `I have followed ${company}'s growth and engineering excellence closely. My 9+ years architecting high-throughput distributed systems in C++ and Java, combined with leading teams delivering zero-defect safety-critical software at Boeing, aligns directly with ${company}'s focus on scale and resilience. I am eager to apply my background in low-latency systems and event-driven architecture to high-impact challenges here.`
    },
    {
      question: "Describe your experience with distributed systems and high-throughput architectures.",
      category: "Technical Experience",
      answer: "At Boeing, I architected a 10-microservice platform in C++ and Java with 130+ REST APIs, leveraging Kafka and RabbitMQ to achieve a 30% reduction in latency. I designed multithreaded socket IPC mechanisms, implemented mutual TLS (mTLS) PKI infrastructure, and built real-time telemetry streaming that served multiple airline partners with 99.99%+ reliability."
    },
    {
      question: "Can you provide an example of technical leadership and quality assurance?",
      category: "Leadership & Impact",
      answer: "I led a 5-engineer squad through 3 consecutive on-schedule production releases for Boeing 777X cabin systems with zero post-go-live P1 defects over an 18-month span. I instituted automated SonarQube quality gates in Jenkins CI/CD which cut technical debt by 40% across 3 business units, and mentored junior and mid-level engineers in concurrency and clean architecture."
    },
    {
      question: "What is your current notice period?",
      category: "Logistics",
      answer: "Standard 30-60 days; however, depending on transition priorities and project handover, an early release can be mutually arranged."
    },
    {
      question: "What are your salary expectations?",
      category: "Compensation",
      answer: "Open to competitive market compensation aligned with Senior Software Engineer / Tech Lead band, commensurate with responsibilities, total rewards, and equity components."
    },
    {
      question: "Do you require visa sponsorship?",
      category: "Eligibility",
      answer: "I am an Indian citizen based in Bangalore, India, authorized to work locally and worldwide remotely. Open to relocation with sponsorship if applicable."
    }
  ];
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeLatex(str) {
  if (!str) return '';
  return String(str)
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}');
}

module.exports = {
  generateAtsHtml,
  generateAtsMarkdown,
  generateLatex,
  generateCoverLetter,
  generateScreeningAnswers
};
