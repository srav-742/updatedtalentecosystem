import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.resolve(__dirname, '../dist');
const BASE_DOMAIN = 'https://www.hire1percent.com';

const ROUTES = [
  {
    path: '/',
    dir: '',
    title: 'Hire1Percent - AI Technical Recruitment, Coding Assessment & Video Interview Platform',
    description: 'Hire1Percent is the all-in-one AI recruitment platform for engineering teams. Automate coding assessments across 20+ languages, asynchronous AI video interviews, real-time proctoring, and semantic resume intelligence.',
    canonicalUrl: `${BASE_DOMAIN}/`,
    heading: 'Hire1Percent - AI Technical Recruitment Platform',
    intro: 'Hire1Percent is an AI-powered technical recruitment platform for engineering teams. Automate coding tests, conduct asynchronous video interviews, and evaluate developer skills objectively.'
  },
  {
    path: '/about',
    dir: 'about',
    title: 'About Us - AI Technical Recruitment Platform | Hire1Percent',
    description: "Learn about Hire1Percent's mission to revolutionize technical recruitment with AI-powered skill assessments, proctoring, and fair evaluation.",
    canonicalUrl: `${BASE_DOMAIN}/about`,
    heading: 'About Hire1Percent',
    intro: 'We are redefining technical hiring by replacing credential-based gatekeeping with verified, objective skill evaluation powered by artificial intelligence.'
  },
  {
    path: '/pricing',
    dir: 'pricing',
    title: 'Pricing Plans - AI Recruitment & Technical Screening | Hire1Percent',
    description: 'Simple, transparent, and fair pricing for AI recruitment, proctored coding assessments, and technical hiring.',
    canonicalUrl: `${BASE_DOMAIN}/pricing`,
    heading: 'Hire1Percent Pricing Plans',
    intro: 'Transparent, ROI-focused recruitment pricing. Choose between Managed Hiring and Direct Hire models for your engineering organization.'
  },
  {
    path: '/contact',
    dir: 'contact',
    title: 'Contact Us - Technical Support & Enterprise Inquiries | Hire1Percent',
    description: 'Get in touch with Hire1Percent for enterprise sales, recruitment platform demonstrations, technical support, or API integration partnerships.',
    canonicalUrl: `${BASE_DOMAIN}/contact`,
    heading: 'Contact Hire1Percent Team',
    intro: 'Have questions about our technical assessments, ATS integrations, or enterprise plans? Our engineering and sales team is here to assist you.'
  },
  {
    path: '/blog',
    dir: 'blog',
    title: 'Blog | Hire1Percent',
    description: 'Insights, guides, and updates on technical hiring, AI recruitment, coding assessments, and developer screening from Hire1Percent.',
    canonicalUrl: `${BASE_DOMAIN}/blog`,
    heading: 'Hire1Percent Recruitment & Engineering Blog',
    intro: 'Read expert articles, hiring benchmarks, assessment guides, and engineering recruitment insights.'
  },
  {
    path: '/ai-interview-platform',
    dir: 'ai-interview-platform',
    title: 'AI Interview Platform - Automated Video & Technical Interviews',
    description: 'Conduct automated AI video interviews and technical screens with speech analysis, structured rubrics, and real-time proctoring. Hire top engineers faster.',
    canonicalUrl: `${BASE_DOMAIN}/ai-interview-platform`,
    heading: 'AI-Powered Video & Technical Interview Platform',
    intro: 'Evaluate engineering candidates at scale with automated speech recognition, technical rubric scoring, and zero scheduling friction.'
  },
  {
    path: '/ai-recruitment-software',
    dir: 'ai-recruitment-software',
    title: 'AI Recruitment Software - End-to-End Hiring Automation',
    description: "Automate sourcing, resume screening, skill assessments, and candidate interviews with Hire1Percent's enterprise AI recruitment software.",
    canonicalUrl: `${BASE_DOMAIN}/ai-recruitment-software`,
    heading: 'Next-Generation AI Recruitment Software',
    intro: 'Streamline talent discovery, eliminate manual screening, and pinpoint verified top-tier developers with continuous machine intelligence.'
  },
  {
    path: '/candidate-screening',
    dir: 'candidate-screening',
    title: 'Candidate Screening Software - AI Technical Pre-Screening',
    description: 'Screen engineering candidates accurately with automated code testing, behavioral rubrics, and real-time cheating prevention.',
    canonicalUrl: `${BASE_DOMAIN}/candidate-screening`,
    heading: 'Intelligent Candidate Screening & Verification',
    intro: 'Filter out resume exaggerations and identify genuine technical problem solvers in minutes with hands-on coding sandboxes.'
  },
  {
    path: '/resume-analysis',
    dir: 'resume-analysis',
    title: 'AI Resume Analysis & Parsing Software - Hire1Percent',
    description: 'Extract deep technical insights, verify project experience, and match top developers to job requisitions with AI resume intelligence.',
    canonicalUrl: `${BASE_DOMAIN}/resume-analysis`,
    heading: 'AI Resume Intelligence & Technical Parsing',
    intro: 'Go beyond keyword matching to uncover real engineering capability, architectural depth, and role alignment.'
  },
  {
    path: '/automated-hiring',
    dir: 'automated-hiring',
    title: 'Automated Hiring Platform - Scale Technical Recruitment',
    description: 'Accelerate your hiring pipeline with automated candidate assessments, self-service video interviews, and instant scorecard generation.',
    canonicalUrl: `${BASE_DOMAIN}/automated-hiring`,
    heading: 'Automated Technical Hiring Workflow Engine',
    intro: 'Transform manual recruiter tasks into automated, high-velocity candidate evaluation pipelines.'
  },
  {
    path: '/privacy',
    dir: 'privacy',
    title: 'Privacy Policy | Hire1Percent',
    description: 'Learn how Hire1Percent protects your privacy and manages data across our AI recruitment and assessment platform.',
    canonicalUrl: `${BASE_DOMAIN}/privacy`,
    heading: 'Hire1Percent Privacy Policy',
    intro: 'Our comprehensive privacy policy outlines how candidate and employer data is processed, secured, and stored.'
  },
  {
    path: '/terms',
    dir: 'terms',
    title: 'Terms & Conditions | Hire1Percent',
    description: 'Review terms and conditions governing usage of Hire1Percent AI recruitment, assessments, and interview services.',
    canonicalUrl: `${BASE_DOMAIN}/terms`,
    heading: 'Hire1Percent Terms of Service',
    intro: 'Official terms and conditions regarding employer accounts, candidate evaluation integrity, and platform usage.'
  },
  {
    path: '/cookies',
    dir: 'cookies',
    title: 'Cookie Policy | Hire1Percent',
    description: 'Understand how Hire1Percent uses cookies and tracking technologies to optimize technical recruitment workflows.',
    canonicalUrl: `${BASE_DOMAIN}/cookies`,
    heading: 'Hire1Percent Cookie Policy',
    intro: 'Details on essential, analytical, and performance cookies used to maintain secure test sessions and improve user experience.'
  }
];

function prerender() {
  const templatePath = path.join(DIST_DIR, 'index.html');
  if (!fs.existsSync(templatePath)) {
    console.error(`[Prerender SEO] Error: ${templatePath} does not exist. Run vite build first.`);
    process.exit(1);
  }

  const baseHtml = fs.readFileSync(templatePath, 'utf-8');
  console.log(`[Prerender SEO] Generating route-specific HTML for ${ROUTES.length} routes...`);

  for (const route of ROUTES) {
    let routeHtml = baseHtml;

    // 1. Update <title>
    routeHtml = routeHtml.replace(
      /<title>[\s\S]*?<\/title>/i,
      `<title>${route.title}</title>`
    );

    // 2. Update meta description
    routeHtml = routeHtml.replace(
      /<meta\s+name="description"\s+content="[\s\S]*?"\s*\/?>/i,
      `<meta name="description" content="${route.description}" />`
    );

    // 3. Ensure distinct canonical tag is cleanly placed in <head>
    const canonicalTag = `<link rel="canonical" href="${route.canonicalUrl}" />`;
    if (routeHtml.includes('rel="canonical"')) {
      routeHtml = routeHtml.replace(/<link\s+rel="canonical"\s+href="[\s\S]*?"\s*\/?>/i, canonicalTag);
    } else {
      routeHtml = routeHtml.replace('</head>', `  ${canonicalTag}\n</head>`);
    }

    // 4. Update OpenGraph and Twitter tags
    routeHtml = routeHtml.replace(
      /<meta\s+property="og:title"\s+content="[\s\S]*?"\s*\/?>/i,
      `<meta property="og:title" content="${route.title}" />`
    );
    routeHtml = routeHtml.replace(
      /<meta\s+property="og:description"\s+content="[\s\S]*?"\s*\/?>/i,
      `<meta property="og:description" content="${route.description}" />`
    );
    routeHtml = routeHtml.replace(
      /<meta\s+property="og:url"\s+content="[\s\S]*?"\s*\/?>/i,
      `<meta property="og:url" content="${route.canonicalUrl}" />`
    );
    routeHtml = routeHtml.replace(
      /<meta\s+name="twitter:title"\s+content="[\s\S]*?"\s*\/?>/i,
      `<meta name="twitter:title" content="${route.title}" />`
    );
    routeHtml = routeHtml.replace(
      /<meta\s+name="twitter:description"\s+content="[\s\S]*?"\s*\/?>/i,
      `<meta name="twitter:description" content="${route.description}" />`
    );

    // 5. For subroutes, replace noscript block with route-specific semantic summary
    if (route.dir !== '') {
      const routeNoscript = `
  <noscript>
    <div style="max-width: 960px; margin: 0 auto; padding: 2rem; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.7; color: #1e293b;">
      <header>
        <h1>${route.heading}</h1>
        <p>${route.intro}</p>
        <p>${route.description}</p>
        <nav aria-label="Platform Navigation" style="margin: 1.5rem 0;">
          <ul style="display: flex; flex-wrap: wrap; gap: 0.75rem; list-style: none; padding: 0;">
            <li><a href="/">Home</a></li>
            <li><a href="/about">About Us</a></li>
            <li><a href="/pricing">Pricing</a></li>
            <li><a href="/ai-interview-platform">AI Interviews</a></li>
            <li><a href="/ai-recruitment-software">Recruitment Software</a></li>
            <li><a href="/candidate-screening">Candidate Screening</a></li>
            <li><a href="/resume-analysis">Resume Analysis</a></li>
            <li><a href="/blog">Blog</a></li>
            <li><a href="/contact">Contact</a></li>
          </ul>
        </nav>
      </header>
    </div>
  </noscript>`;

      routeHtml = routeHtml.replace(/<noscript>[\s\S]*?<\/noscript>/i, routeNoscript);
    }

    // 6. Write out file
    const targetDir = route.dir ? path.join(DIST_DIR, route.dir) : DIST_DIR;
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const targetFile = path.join(targetDir, 'index.html');
    fs.writeFileSync(targetFile, routeHtml, 'utf-8');
    console.log(`  ✓ Prerendered: ${route.path} -> ${path.relative(DIST_DIR, targetFile)} (canonical: ${route.canonicalUrl})`);
  }

  console.log('[Prerender SEO] All routes prerendered successfully with unique canonical tags.');
}

prerender();
