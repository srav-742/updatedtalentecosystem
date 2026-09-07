import React from 'react';
import { Helmet } from 'react-helmet-async';

export default function SEO({
  title = 'Hire1Percent - AI-Powered Technical Recruitment Platform',
  description = 'Hire1Percent is an enterprise AI recruitment platform with automated coding assessments, AI video interviews, proctored exams, and resume intelligence.',
  keywords = 'AI recruitment, technical assessment platform, coding interview software, video interview AI, automated proctoring, resume intelligence, developer hiring',
  canonicalUrl,
  robots = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
  ogType = 'website',
  ogImage = 'https://www.hire1percent.com/favicon.ico',
  schema
}) {
  const baseUrl = 'https://www.hire1percent.com';
  
  // Ensure canonicalUrl starts with a slash if provided
  const formattedUrl = canonicalUrl 
    ? (canonicalUrl.startsWith('/') ? canonicalUrl : `/${canonicalUrl}`) 
    : '';
  
  const absoluteCanonicalUrl = `${baseUrl}${formattedUrl}`;

  // Normalize schemas: array of objects or single object
  const schemaList = schema 
    ? (Array.isArray(schema) ? schema.filter(Boolean) : [schema]) 
    : [];

  return (
    <Helmet>
      {/* Primary Meta Tags */}
      {title && <title>{title}</title>}
      {description && <meta name="description" content={description} />}
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={absoluteCanonicalUrl} />
      {robots && <meta name="robots" content={robots} />}

      {/* Modern Web App Manifest & RSS Feeds */}
      <link rel="manifest" href="/manifest.webmanifest" />
      <link rel="alternate" type="application/rss+xml" title="Hire1Percent Recruitment Blog" href="/rss.xml" />

      {/* Multi-Language & Region Hreflang Canonical Annotations */}
      <link rel="alternate" hreflang="en" href={absoluteCanonicalUrl} />
      <link rel="alternate" hreflang="x-default" href={absoluteCanonicalUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={ogType} />
      <meta property="og:url" content={absoluteCanonicalUrl} />
      {title && <meta property="og:title" content={title} />}
      {description && <meta property="og:description" content={description} />}
      <meta property="og:image" content={ogImage} />
      <meta property="og:site_name" content="Hire1Percent" />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={absoluteCanonicalUrl} />
      {title && <meta name="twitter:title" content={title} />}
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={ogImage} />
      <meta name="twitter:site" content="@hire1percent" />

      {/* Structured Data (JSON-LD) for Search & Answer Engines */}
      {schemaList.map((item, index) => (
        <script key={`ld-json-${index}`} type="application/ld+json">
          {JSON.stringify(item)}
        </script>
      ))}
    </Helmet>
  );
}
