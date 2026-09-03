import React from 'react';
import { Helmet } from 'react-helmet-async';

export default function SEO({ title, description, keywords, canonicalUrl, robots }) {
  const baseUrl = 'https://www.hire1percent.com';
  // Ensure canonicalUrl starts with a slash if provided
  const formattedUrl = canonicalUrl 
    ? (canonicalUrl.startsWith('/') ? canonicalUrl : `/${canonicalUrl}`) 
    : '';
  
  const absoluteCanonicalUrl = `${baseUrl}${formattedUrl}`;

  return (
    <Helmet>
      {title && <title>{title}</title>}
      {description && <meta name="description" content={description} />}
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={absoluteCanonicalUrl} />
      {robots && <meta name="robots" content={robots} />}
    </Helmet>
  );
}
