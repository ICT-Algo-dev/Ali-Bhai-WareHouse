import Container from '../components/ui/Container'
import Seo from '../components/ui/Seo'
import { ADDRESS } from '../lib/constants'

export default function Terms() {
  return (
    <>
      <Seo title="Terms and Conditions" description="Draft website terms for a UK warehousing and fulfilment provider. For review by the client's legal adviser." />
      <section className="bg-navy-950 py-14 text-white sm:py-20">
        <Container>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-400">Legal draft — review required</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">Terms</h1>
          <p className="mt-4 max-w-2xl leading-7 text-slate-300">Draft wording for review by the client’s legal adviser before publication.</p>
        </Container>
      </section>
      <section className="py-12 sm:py-16">
        <Container className="max-w-3xl space-y-8 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-navy-900 [&_p]:mt-3 [&_p]:leading-7 [&_p]:text-slate-600">
          <article>
            <h2>About these terms</h2>
            <p>This draft concerns use of the Warehouse &amp; Fulfilment website. Replace the placeholder business name with the correct legal entity and have the complete terms reviewed before publication.</p>
          </article>
          <article>
            <h2>Website information</h2>
            <p>Website content is provided for general information. Submitting an enquiry or requesting a quote does not create a warehousing, fulfilment or delivery agreement.</p>
          </article>
          <article>
            <h2>Services and carriers</h2>
            <p>The business provides warehousing and fulfilment services, including inventory handling and preparation of orders for dispatch. Carriers perform delivery under their own services and terms. Carrier names on this website indicate dispatch options only; no official partnership or endorsement is implied.</p>
          </article>
          <article>
            <h2>Quotes and service agreements</h2>
            <p>Any quote, scope of work, charges, service levels, responsibilities, insurance arrangements and applicable exclusions must be set out in a separate agreement agreed by the parties.</p>
          </article>
          <article>
            <h2>Contact and legal review</h2>
            <p>Replace this draft with terms prepared or approved by the client’s legal adviser, including applicable governing law, business details and all required consumer and commercial provisions.</p>
            <address className="mt-3 not-italic leading-7 text-slate-600">{ADDRESS.line1}<br />{ADDRESS.city}<br />{ADDRESS.postcode}<br />{ADDRESS.country}</address>
          </article>
        </Container>
      </section>
    </>
  )
}