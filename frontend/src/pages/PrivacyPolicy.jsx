import Container from '../components/ui/Container'
import Seo from '../components/ui/Seo'
import { ADDRESS } from '../lib/constants'

export default function PrivacyPolicy() {
  return (
    <>
      <Seo title="Privacy Policy" description="Draft privacy policy for UK GDPR and the Data Protection Act 2018. For review by the client's legal adviser." />
      <section className="bg-navy-950 py-14 text-white sm:py-20">
        <Container>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-400">Legal draft — review required</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">Privacy Policy</h1>
          <p className="mt-4 max-w-2xl leading-7 text-slate-300">Draft wording for review by the client’s legal adviser before publication.</p>
        </Container>
      </section>
      <section className="py-12 sm:py-16">
        <Container className="max-w-3xl space-y-8 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-navy-900 [&_p]:mt-3 [&_p]:leading-7 [&_p]:text-slate-600">
          <article>
            <h2>Who we are</h2>
            <p>This draft applies to Warehouse &amp; Fulfilment, a placeholder name for a warehousing and fulfilment business operating in the United Kingdom. Replace this description with the legal entity name and verified contact details before publication.</p>
            <p>Data controller address:</p>
            <address className="not-italic leading-7 text-slate-600">{ADDRESS.line1}<br />{ADDRESS.city}<br />{ADDRESS.postcode}<br />{ADDRESS.country}</address>
          </article>
          <article>
            <h2>Information we collect</h2>
            <p>When you submit an enquiry or quote request, we may collect your name, business name, telephone number, email address, service requirements, estimated volumes and any details you include in your message.</p>
          </article>
          <article>
            <h2>How we use your information</h2>
            <p>We use enquiry information to respond to your request, discuss potential services and keep appropriate records. The client must confirm its lawful bases, retention periods and any processor arrangements with its legal adviser before this draft is adopted.</p>
          </article>
          <article>
            <h2>Sharing and international transfers</h2>
            <p>Information may be shared with service providers where needed to operate the website or respond to an enquiry. The client should identify those providers and confirm any required safeguards for international transfers before publication.</p>
          </article>
          <article>
            <h2>Your rights</h2>
            <p>Under the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018, you may have rights to access, correct, erase or restrict the use of your personal information, and to object to certain processing. Contact the business using its confirmed contact details to make a request.</p>
          </article>
          <article>
            <h2>Complaints and the ICO</h2>
            <p>You can raise a concern with the Information Commissioner’s Office (ICO). ICO registration/reference: [ICO reference placeholder — confirm details and whether applicable].</p>
          </article>
          <article>
            <h2>Contact and review</h2>
            <p>Privacy contact: [insert confirmed privacy contact email]. This draft must be reviewed by the client’s legal adviser, completed with accurate business details and approved before it is relied upon.</p>
            <address className="mt-3 not-italic leading-7 text-slate-600">{ADDRESS.line1}<br />{ADDRESS.city}<br />{ADDRESS.postcode}<br />{ADDRESS.country}</address>
          </article>
        </Container>
      </section>
    </>
  )
}