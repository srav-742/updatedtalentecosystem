/**
 * Hire1Percent - Structured Data Schema Generators (JSON-LD)
 * Compliant with Schema.org specifications for AEO / GEO / SEO engines.
 */

const BASE_URL = 'https://www.hire1percent.com';

/**
 * Generates Organization Schema
 */
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${BASE_URL}/#organization`,
    'name': 'Hire1Percent',
    'alternateName': 'Hire 1 Percent',
    'url': BASE_URL,
    'logo': `${BASE_URL}/favicon.ico`,
    'description': 'Hire1Percent is an enterprise AI recruitment platform providing automated skill assessments, AI-driven video interviews, live proctored coding environments, resume intelligence, and predictive candidate scoring.',
    'email': 'contact@hire1percent.com',
    'sameAs': [
      'https://twitter.com/hire1percent',
      'https://linkedin.com/company/hire1percent',
      'https://github.com/hire1percent'
    ],
    'contactPoint': {
      '@type': 'ContactPoint',
      'contactType': 'Customer Support',
      'email': 'contact@hire1percent.com',
      'url': `${BASE_URL}/contact`,
      'availableLanguage': ['English']
    }
  };
}

/**
 * Generates WebSite Schema with SearchAction
 */
export function generateWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${BASE_URL}/#website`,
    'name': 'Hire1Percent',
    'url': BASE_URL,
    'description': 'AI-Powered Technical Recruitment, Skill Assessment & Video Interview Platform',
    'publisher': {
      '@id': `${BASE_URL}/#organization`
    },
    'potentialAction': {
      '@type': 'SearchAction',
      'target': `${BASE_URL}/blog?search={search_term_string}`,
      'query-input': 'required name=search_term_string'
    }
  };
}

/**
 * Generates SoftwareApplication Schema for the platform
 */
export function generateSoftwareApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    'name': 'Hire1Percent Recruitment & Assessment Suite',
    'applicationCategory': 'BusinessApplication',
    'operatingSystem': 'Web Browser',
    'url': BASE_URL,
    'offers': {
      '@type': 'AggregateOffer',
      'priceCurrency': 'USD',
      'lowPrice': '0',
      'highPrice': '499',
      'offerCount': '3'
    },
    'description': 'Complete technical recruitment automation software featuring AI coding assessments, asynchronous video interviews with real-time integrity monitoring, semantic resume scoring, and talent ecosystem matching.',
    'featureList': [
      'Automated Coding Assessments in 20+ Languages',
      'AI Video Interviews with Speech & Sentiment Analysis',
      'Anti-Cheat Proctoring with Tab-Switch & Multi-face Detection',
      'Semantic Resume Intelligence & ATS Matching',
      'Predictive Candidate Scoring and Benchmark Rankings'
    ]
  };
}

/**
 * Generates FAQPage Schema from an array of { question, answer }
 * @param {Array<{question: string, answer: string}>} faqs
 */
export function generateFAQPageSchema(faqs = []) {
  if (!faqs || faqs.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    'mainEntity': faqs.map(faq => ({
      '@type': 'Question',
      'name': faq.question,
      'acceptedAnswer': {
        '@type': 'Answer',
        'text': faq.answer
      }
    }))
  };
}

/**
 * Generates BreadcrumbList Schema from an array of items { name, url }
 * @param {Array<{name: string, url: string}>} items
 */
export function generateBreadcrumbSchema(items = []) {
  if (!items || items.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    'itemListElement': items.map((item, index) => {
      const fullUrl = item.url.startsWith('http') 
        ? item.url 
        : `${BASE_URL}${item.url.startsWith('/') ? item.url : `/${item.url}`}`;

      return {
        '@type': 'ListItem',
        'position': index + 1,
        'name': item.name,
        'item': fullUrl
      };
    })
  };
}

/**
 * Generates WebPage Schema
 */
export function generateWebPageSchema({ title, description, url, breadcrumbs = [] }) {
  const fullUrl = url.startsWith('http') 
    ? url 
    : `${BASE_URL}${url.startsWith('/') ? url : `/${url}`}`;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    'name': title,
    'description': description,
    'url': fullUrl,
    'isPartOf': {
      '@id': `${BASE_URL}/#website`
    },
    'about': {
      '@id': `${BASE_URL}/#organization`
    }
  };

  if (breadcrumbs.length > 0) {
    schema.breadcrumb = generateBreadcrumbSchema(breadcrumbs);
  }

  return schema;
}
