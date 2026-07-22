import { Helmet } from 'react-helmet-async';
import { siteConfig } from '../utils/siteConfig';

export default function Seo({ title, description, path = '/', image = '/favicon.png', structuredData }) {
  const pageTitle = `${title} | ${siteConfig.brandName}`;
  const canonicalUrl = `${siteConfig.siteUrl}${path}`;

  return (
    <Helmet>
      <title>{pageTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonicalUrl} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content={`${siteConfig.siteUrl}${image}`} />
      <meta property="og:type" content="website" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={`${siteConfig.siteUrl}${image}`} />
      <script type="application/ld+json">{JSON.stringify(structuredData || { '@context': 'https://schema.org', '@type': 'WebSite', name: siteConfig.brandName, url: siteConfig.siteUrl })}</script>
    </Helmet>
  );
}
