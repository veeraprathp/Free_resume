const express = require('express');
const router = express.Router();
const resumeRenderer = require('../utils/resume-renderer');
const coverletterRenderer = require('../utils/coverletter-renderer');

router.get('/resume', (req, res) => {
  try {
    const templates = resumeRenderer.getAllTemplates();
    res.json({ templates });
  } catch (error) {
    console.error('[TEMPLATES] Error listing resume templates:', error.message);
    res.status(500).json({ error: 'Failed to list resume templates' });
  }
});

// Fictional profiles used to render "what a real resume looks like" previews
// on the landing page — no AI call, no auth, safe to hit before a user has
// entered anything of their own. One persona per (currently working) template
// so the gallery reads as varied rather than the same name repeated 8 times.
const SAMPLE_PROFILES = {
  '02-creative-portfolio': {
    basics: { name: 'Priya Nair', label: 'Brand Designer', email: 'priya.nair@example.com', phone: '+91 98765 43210', location: { city: 'Mumbai', region: 'India' }, summary: 'Brand designer crafting identity systems and campaign visuals for D2C startups, from logo through packaging and social content. 6+ years turning early-stage brands into recognizable, retail-ready identities.' },
    work: [
      { name: 'Studio Loka', position: 'Brand Designer', startDate: '2021-06-01', endDate: '', highlights: ['Designed full brand identity for 12 D2C launches, including 3 that hit ₹1Cr+ in year-one revenue', 'Built a reusable design system cutting campaign turnaround time by a third', 'Directed photoshoots and art direction for 8 seasonal social campaigns, growing average engagement 45%'] },
      { name: 'Freelance', position: 'Visual Designer', startDate: '2019-01-01', endDate: '2021-05-31', highlights: ['Delivered packaging design for 20+ small-batch consumer brands', 'Redesigned e-commerce visual assets for 5 clients, improving product-page conversion by 12% on average'] },
    ],
    education: [
      { institution: 'National Institute of Design', studyType: 'B.Des.', area: 'Visual Communication', endDate: '2018-05-01' },
    ],
    certificates: [
      { name: 'Certified Brand Strategist', issuer: 'Miami Ad School', date: '2019-11-01' },
    ],
    skills: [{ name: 'Skills', keywords: ['Brand Identity', 'Adobe Illustrator', 'Adobe Photoshop', 'Figma', 'Packaging Design', 'Art Direction', 'Typography', 'Print Production', 'Motion Graphics'] }],
    languages: [{ language: 'English', fluency: 'Fluent' }, { language: 'Hindi', fluency: 'Native speaker' }, { language: 'Marathi', fluency: 'Conversational' }],
  },
  '03-tech-forward': {
    basics: { name: 'Jonas Weber', label: 'Full-Stack Developer', email: 'jonas.weber@example.com', phone: '+49 151 5550 2288', location: { city: 'Berlin', region: 'Germany' }, summary: 'Full-stack developer with 6+ years building React/Node products end-to-end, with a focus on developer tooling, CI/CD pipelines, and platform reliability.' },
    work: [
      { name: 'Delivery Hero', position: 'Full-Stack Developer', startDate: '2021-04-01', endDate: '', highlights: ['Rebuilt the internal deployment dashboard, cutting release time from 40 to 12 minutes', 'Introduced automated E2E test suite now run on every PR, cutting production incidents 35%', 'Led migration of 6 legacy services to a shared TypeScript monorepo, reducing duplicate code by 4,000+ lines'] },
      { name: 'N26', position: 'Frontend Developer', startDate: '2019-02-01', endDate: '2021-03-31', highlights: ['Shipped the redesigned transaction feed used by 4M+ active users', 'Improved page load time 38% by introducing code-splitting and lazy loading', 'Paired with backend team to design a GraphQL API consumed by 3 client apps'] },
    ],
    education: [
      { institution: 'Technical University of Berlin', studyType: 'B.Sc.', area: 'Computer Science', endDate: '2018-09-01' },
    ],
    certificates: [
      { name: 'AWS Certified Solutions Architect – Associate', issuer: 'Amazon Web Services', date: '2022-03-01' },
    ],
    skills: [{ name: 'Skills', keywords: ['React', 'Node.js', 'TypeScript', 'Docker', 'CI/CD', 'PostgreSQL', 'GraphQL', 'AWS', 'Redis', 'Jest'] }],
    languages: [{ language: 'German', fluency: 'Native speaker' }, { language: 'English', fluency: 'Fluent' }],
  },
  '01-modern-gradient': {
    basics: { name: 'Aisha Bello', label: 'Senior Backend Engineer', email: 'aisha.bello@example.com', phone: '+234 801 234 5678', location: { city: 'Lagos', region: 'Nigeria' }, summary: 'Backend engineer with 7+ years building high-throughput payment systems. Focused on reliability, clean APIs, and mentoring junior engineers.' },
    work: [
      { name: 'Paystack', position: 'Senior Backend Engineer', startDate: '2021-03-01', endDate: '', highlights: ['Led migration of the settlement pipeline to event-driven architecture, cutting processing time 40%', 'Designed rate-limiting layer handling 3,000+ req/s during peak sales periods', 'Owned on-call rotation for payments infrastructure, maintaining 99.97% uptime across 18 months'] },
      { name: 'Flutterwave', position: 'Backend Engineer', startDate: '2018-06-01', endDate: '2021-02-28', highlights: ['Built reconciliation service reducing manual finance ops by 15 hours/week', 'Mentored 4 junior engineers through onboarding', 'Designed and shipped a fraud-scoring API now used across 3 product lines'] },
    ],
    education: [
      { institution: 'University of Lagos', studyType: 'B.Sc.', area: 'Computer Science', endDate: '2018-07-01' },
    ],
    certificates: [
      { name: 'AWS Certified Developer – Associate', issuer: 'Amazon Web Services', date: '2020-08-01' },
    ],
    skills: [{ name: 'Skills', keywords: ['Python', 'Django', 'PostgreSQL', 'AWS', 'Docker', 'Kafka', 'Redis', 'REST APIs', 'Celery', 'Microservices'] }],
    languages: [{ language: 'English', fluency: 'Native speaker' }, { language: 'Yoruba', fluency: 'Native speaker' }],
  },
  '04-classic-professional': {
    basics: { name: 'Robert Hail', label: 'Finance Director', email: 'robert.hail@example.com', phone: '+1 212 555 0138', location: { city: 'New York', region: 'NY, USA' }, summary: 'Finance leader with 15 years in corporate FP&A, specializing in M&A due diligence and board-level reporting for mid-cap firms.' },
    work: [
      { name: 'Hallmark Capital', position: 'Finance Director', startDate: '2017-01-01', endDate: '', highlights: ['Oversaw $180M annual operating budget across 4 business units', 'Led financial due diligence on 6 acquisitions totaling $92M', 'Restructured monthly close process, cutting reporting time from 12 to 5 business days'] },
      { name: 'Braxton & Wells', position: 'Senior Financial Analyst', startDate: '2011-08-01', endDate: '2016-12-31', highlights: ['Built rolling forecast model adopted company-wide', 'Presented quarterly results directly to the board', 'Identified $2.3M in annual cost savings through vendor contract renegotiation'] },
    ],
    education: [
      { institution: 'NYU Stern School of Business', studyType: 'MBA', area: 'Finance', endDate: '2011-05-01' },
      { institution: 'University of Virginia', studyType: 'B.S.', area: 'Accounting', endDate: '2005-05-01' },
    ],
    certificates: [
      { name: 'Chartered Financial Analyst (CFA)', issuer: 'CFA Institute', date: '2013-08-01' },
    ],
    skills: [{ name: 'Skills', keywords: ['Financial Modeling', 'FP&A', 'M&A Due Diligence', 'Excel', 'SAP', 'Board Reporting', 'Forecasting', 'Variance Analysis', 'GAAP'] }],
    languages: [{ language: 'English', fluency: 'Native speaker' }, { language: 'Spanish', fluency: 'Professional working proficiency' }],
  },
  '05-executive-clean': {
    basics: { name: 'Daniel Osei', label: 'VP of Operations', email: 'daniel.osei@example.com', phone: '+233 24 555 0192', location: { city: 'Accra', region: 'Ghana' }, summary: 'Operations executive scaling logistics networks across West Africa, with a track record of cutting delivery times while expanding coverage.' },
    work: [
      { name: 'Jumia', position: 'VP of Operations', startDate: '2020-02-01', endDate: '', highlights: ['Expanded last-mile delivery network to 9 new cities in 18 months', 'Cut average delivery time from 4.2 to 1.8 days', 'Built and led a 40-person regional operations team across 3 countries'] },
      { name: 'DHL Ghana', position: 'Regional Operations Manager', startDate: '2015-04-01', endDate: '2020-01-31', highlights: ['Managed a 220-person warehouse and fleet operation', 'Reduced fuel costs 22% via route optimization', 'Implemented a warehouse management system that cut pick-and-pack time 30%'] },
    ],
    education: [
      { institution: 'University of Ghana', studyType: 'B.A.', area: 'Logistics & Supply Chain', endDate: '2011-06-01' },
    ],
    certificates: [
      { name: 'Certified Supply Chain Professional (CSCP)', issuer: 'APICS', date: '2018-04-01' },
    ],
    skills: [{ name: 'Skills', keywords: ['Supply Chain Strategy', 'Fleet Management', 'P&L Ownership', 'Team Leadership', 'Route Optimization', 'Warehouse Management', 'Demand Planning', 'KPI Reporting'] }],
    languages: [{ language: 'English', fluency: 'Native speaker' }, { language: 'Twi', fluency: 'Native speaker' }, { language: 'French', fluency: 'Conversational' }],
  },
  '06-corporate-structured': {
    basics: { name: 'Wei Zhang', label: 'Business Analyst', email: 'wei.zhang@example.com', phone: '+65 8123 4567', location: { city: 'Singapore', region: 'Singapore' }, summary: 'Business analyst translating operational data into decisions for retail and logistics teams, fluent in both stakeholder communication and SQL.' },
    work: [
      { name: 'DBS Bank', position: 'Business Analyst', startDate: '2019-09-01', endDate: '', highlights: ['Built dashboards tracking $40M in monthly transaction volume', 'Automated a manual reporting process, saving 10 hours/week', 'Partnered with 5 department heads to redesign KPI tracking, adopted org-wide'] },
      { name: 'Deloitte Singapore', position: 'Junior Analyst', startDate: '2017-07-01', endDate: '2019-08-31', highlights: ['Supported 5 client engagements across retail and logistics', 'Built financial models used in 2 due-diligence engagements worth $15M combined'] },
    ],
    education: [
      { institution: 'National University of Singapore', studyType: 'B.Sc.', area: 'Business Analytics', endDate: '2017-06-01' },
    ],
    certificates: [
      { name: 'Certified Business Analysis Professional (CBAP)', issuer: 'IIBA', date: '2021-02-01' },
    ],
    skills: [{ name: 'Skills', keywords: ['SQL', 'Power BI', 'Process Mapping', 'Stakeholder Management', 'Excel VBA', 'Data Visualization', 'Tableau', 'A/B Testing'] }],
    languages: [{ language: 'English', fluency: 'Fluent' }, { language: 'Mandarin', fluency: 'Native speaker' }],
  },
  '07-ats-minimal': {
    basics: { name: 'Maria Garcia', label: 'Software Engineer', email: 'maria.garcia@example.com', phone: '+34 611 222 333', location: { city: 'Madrid', region: 'Spain' }, summary: 'Software engineer with 6+ years building scalable backend services and APIs for high-growth products, with a focus on clean architecture, testing, and mentoring.' },
    work: [
      { name: 'Cabify', position: 'Senior Software Engineer', startDate: '2021-03-01', endDate: '', highlights: ['Led migration of the ride-matching service to a microservices architecture, cutting p95 latency 45%', 'Designed and shipped a rate-limiting and fraud-detection API handling 5,000+ req/s', 'Mentored 4 junior engineers and led the team\'s code review standards initiative', 'Reduced CI pipeline time from 25 to 8 minutes by parallelizing the test suite'] },
      { name: 'Idealista', position: 'Software Engineer', startDate: '2018-06-01', endDate: '2021-02-28', highlights: ['Built and maintained REST APIs powering the property search platform used by 10M+ monthly users', 'Migrated legacy PHP modules to Python/Django microservices', 'Introduced an automated integration test suite, cutting regression bugs 30%'] },
    ],
    education: [
      { institution: 'Universidad Politécnica de Madrid', studyType: 'B.Sc.', area: 'Computer Science', endDate: '2018-05-01' },
    ],
    certificates: [
      { name: 'AWS Certified Solutions Architect – Associate', issuer: 'Amazon Web Services', date: '2021-09-01' },
      { name: 'Certified Kubernetes Administrator (CKA)', issuer: 'Cloud Native Computing Foundation', date: '2022-11-01' },
    ],
    skills: [{ name: 'Skills', keywords: ['Python', 'Django', 'Java', 'PostgreSQL', 'Docker', 'Kubernetes', 'AWS', 'REST APIs', 'Microservices', 'CI/CD', 'Terraform', 'Kafka', 'System Design'] }],
    languages: [{ language: 'Spanish', fluency: 'Native speaker' }, { language: 'English', fluency: 'Fluent' }, { language: 'French', fluency: 'Conversational' }],
  },
  '08-ats-single-column': {
    basics: { name: 'Tom Becker', label: 'Supply Chain Coordinator', email: 'tom.becker@example.com', phone: '+49 176 5550 1122', location: { city: 'Munich', region: 'Germany' }, summary: 'Supply chain coordinator with 5+ years of hands-on experience across procurement, inventory planning, and vendor negotiation in manufacturing.' },
    work: [
      { name: 'Siemens', position: 'Supply Chain Coordinator', startDate: '2019-03-01', endDate: '', highlights: ['Coordinated procurement for 3 production lines', 'Negotiated vendor contracts saving €180K annually', 'Reduced stockouts 25% by redesigning the reorder-point model', 'Led SAP MM rollout for the coordination team, cutting manual entry time in half'] },
      { name: 'BMW Group', position: 'Logistics Intern', startDate: '2018-06-01', endDate: '2019-02-28', highlights: ['Supported inventory audits across 2 warehouses', 'Identified discrepancies worth €45K during a full-stock reconciliation'] },
    ],
    education: [
      { institution: 'Technical University of Munich', studyType: 'B.Eng.', area: 'Industrial Engineering', endDate: '2018-05-01' },
    ],
    certificates: [
      { name: 'Certified in Production and Inventory Management (CPIM)', issuer: 'APICS', date: '2020-06-01' },
    ],
    skills: [{ name: 'Skills', keywords: ['Procurement', 'SAP MM', 'Inventory Planning', 'Vendor Negotiation', 'Demand Forecasting', 'Lean Manufacturing', 'Six Sigma', 'ERP Systems'] }],
    languages: [{ language: 'German', fluency: 'Native speaker' }, { language: 'English', fluency: 'Fluent' }],
  },
  '09-academic-cv': {
    basics: { name: 'Dr. Sofia Marino', label: 'Postdoctoral Researcher, Molecular Biology', email: 'sofia.marino@example.com', phone: '+1 617 555 0147', location: { city: 'Boston', region: 'MA, USA' }, summary: 'Molecular biologist researching CRISPR-based gene editing, with 9 peer-reviewed publications and experience mentoring graduate students.' },
    work: [
      { name: 'Harvard Medical School', position: 'Postdoctoral Researcher', startDate: '2022-09-01', endDate: '', highlights: ['Published 4 first-author papers on CRISPR delivery mechanisms', 'Mentored 3 PhD candidates', 'Secured $180K in seed funding for a novel gene-editing delivery method', 'Presented findings at 3 international conferences (ASGCT, Keystone Symposia)'] },
      { name: 'MIT', position: 'PhD Candidate, Biology', startDate: '2017-09-01', endDate: '2022-06-30', highlights: ['Dissertation: "Targeted Gene Editing in Mammalian Cell Lines"', 'Co-authored 5 peer-reviewed papers during doctoral research', 'Taught and TA\'d 3 semesters of undergraduate molecular biology labs'] },
    ],
    education: [
      { institution: 'MIT', studyType: 'Ph.D.', area: 'Molecular Biology', endDate: '2022-06-30' },
      { institution: 'University of Bologna', studyType: 'B.Sc.', area: 'Biology', endDate: '2017-07-01' },
    ],
    skills: [{ name: 'Skills', keywords: ['CRISPR-Cas9', 'Gene Sequencing', 'Grant Writing', 'Python (Bioinformatics)', 'Peer Review', 'Cell Culture', 'Flow Cytometry', 'Scientific Writing'] }],
    languages: [{ language: 'English', fluency: 'Fluent' }, { language: 'Italian', fluency: 'Native speaker' }],
  },
  '10-designer-portfolio': {
    basics: { name: 'Marcus Chen', label: 'Product Designer', email: 'marcus.chen@example.com', phone: '+1 512 555 0173', location: { city: 'Austin', region: 'TX, USA' }, summary: 'Product designer with 6+ years crafting end-to-end experiences for consumer apps, from research through high-fidelity prototypes and design systems.' },
    work: [
      { name: 'Notion', position: 'Product Designer', startDate: '2021-01-01', endDate: '', highlights: ['Led redesign of onboarding flow, improving activation 18%', 'Built and maintained the shared design system used by 12 designers', 'Ran quarterly usability studies that shaped 3 major feature launches'] },
      { name: 'Dropbox', position: 'UX Designer', startDate: '2018-08-01', endDate: '2020-12-31', highlights: ['Ran 30+ user interviews informing the file-sharing redesign', 'Designed and shipped a mobile file-preview experience adopted by 2M+ users', 'Partnered with 3 engineering pods to ship weekly design increments'] },
    ],
    education: [
      { institution: 'Rhode Island School of Design', studyType: 'B.F.A.', area: 'Graphic Design', endDate: '2018-05-01' },
    ],
    certificates: [
      { name: 'Google UX Design Certificate', issuer: 'Google', date: '2019-06-01' },
    ],
    skills: [{ name: 'Skills', keywords: ['Figma', 'Design Systems', 'User Research', 'Prototyping', 'Interaction Design', 'Usability Testing', 'Design Thinking', 'A/B Testing'] }],
    languages: [{ language: 'English', fluency: 'Native speaker' }, { language: 'Mandarin', fluency: 'Conversational' }],
  },
};

// No AI call, no auth — renders a bundled fictional profile through a real
// template so the landing page can show what each design actually looks like.
router.get('/resume/:id/sample', async (req, res) => {
  try {
    const { id } = req.params;
    const profile = SAMPLE_PROFILES[id];
    if (!profile) return res.status(404).json({ error: 'No sample available for this template' });

    const html = await resumeRenderer.renderResume(profile, id, false);
    res.json({ html, persona: { name: profile.basics.name, label: profile.basics.label } });
  } catch (error) {
    console.error('[TEMPLATES] Sample render error:', error.message);
    res.status(500).json({ error: 'Sample render failed' });
  }
});

router.get('/cover-letter', (req, res) => {
  try {
    const templates = coverletterRenderer.getAllTemplates();
    res.json({ templates });
  } catch (error) {
    console.error('[TEMPLATES] Error listing cover letter templates:', error.message);
    res.status(500).json({ error: 'Failed to list cover letter templates' });
  }
});

// Same fictional applicant across all cover letter designs — the point is to
// show each template's tone/layout, not to vary the story.
const SAMPLE_COVER_LETTER = {
  profile: { fullName: 'Alex Morgan', email: 'alex.morgan@example.com', phone: '+1 415 555 0199', location: 'San Francisco, CA' },
  jd: { company: 'Nova Robotics', jobTitle: 'Senior Product Manager', hiringManagerName: '' },
  content: {
    opening: 'I am writing to express my strong interest in the Senior Product Manager position at Nova Robotics. Having spent the last six years shipping consumer hardware products from concept to launch, I was excited to see a team building at the intersection of robotics and everyday life.',
    body: [
      'In my current role, I led the launch of a home-assistant device that grew to 250,000 active users within its first year, working closely with hardware, firmware, and design teams to keep the roadmap realistic without losing ambition. I am comfortable being the person in the room who turns a dozen competing priorities into a shipped release.',
      'What draws me to Nova Robotics specifically is your focus on affordability without cutting corners on safety — that balance is exactly the kind of product problem I want to keep solving.',
    ],
    closing: 'Thank you for considering my application. I would welcome the chance to talk through how my background could contribute to your roadmap, and I am happy to make time at your convenience.',
  },
};

// No AI call, no auth — same idea as the resume sample route.
router.get('/cover-letter/:id/sample', async (req, res) => {
  try {
    const { id } = req.params;
    const html = await coverletterRenderer.renderCoverLetter(SAMPLE_COVER_LETTER, id);
    res.json({ html, persona: { name: SAMPLE_COVER_LETTER.profile.fullName, label: `Applying to ${SAMPLE_COVER_LETTER.jd.company}` } });
  } catch (error) {
    console.error('[TEMPLATES] Cover letter sample render error:', error.message);
    res.status(404).json({ error: 'No sample available for this template' });
  }
});

module.exports = router;
