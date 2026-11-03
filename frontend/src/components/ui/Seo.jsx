import { Helmet } from 'react-helmet-async'
import { ADDRESS } from '../../lib/constants'

export default function Seo({ title, description, includePostalAddress = false }) {
  const fullTitle = `${title} | Warehouse & Fulfilment`
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Warehouse & Fulfilment',
    description,
    areaServed: {
      '@type': 'Country',
      name: 'United Kingdom',
    },
    knowsAbout: ['Warehousing', 'Inventory management', 'Order fulfilment', 'Courier dispatch'],
    ...(includePostalAddress
      ? {
          address: {
            '@type': 'PostalAddress',
            streetAddress: ADDRESS.line1,
            addressLocality: ADDRESS.city,
            postalCode: ADDRESS.postcode,
            addressCountry: ADDRESS.countryCode,
          },
        }
      : {}),
  }

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:locale" content="en_GB" />
      <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
    </Helmet>
  )
}
