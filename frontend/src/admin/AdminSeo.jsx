import { Helmet } from 'react-helmet-async'

export default function AdminSeo({ title }) {
  return (
    <Helmet>
      <title>{title} | Admin</title>
      <meta name="robots" content="noindex, nofollow" />
    </Helmet>
  )
}
