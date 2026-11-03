import Container from '../components/ui/Container'
import Seo from '../components/ui/Seo'
import { ADDRESS } from '../lib/constants'

export default function CookiePolicy() {
  return (
    <>
      <Seo title="UK Cookie Policy" description="Draft UK cookie policy covering essential storage, PECR consent and the current absence of analytics or non-essential cookies." />
      <section className="bg-navy-950 py-14 text-white sm:py-20">
        <Container>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-400">Legal draft — review required</p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">Cookie Policy</h1>
          <p className="mt-4 max-w-2xl leading-7 text-slate-300">Draft wording for review by the client’s legal adviser before publication.</p>
        </Container>
      </section>
      <section className="py-12 sm:py-16">
        <Container className="max-w-3xl space-y-8 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-navy-900 [&_p]:mt-3 [&_p]:leading-7 [&_p]:text-slate-600">
          <article>
            <h2>How this website uses storage</h2>
            <p>This website does not currently load analytics or set non-essential cookies. Essential browser storage is used to remember whether you accepted or rejected optional cookies, so the preference banner does not need to be shown again on each visit.</p>
          </article>
          <article>
            <h2>Optional cookies and PECR</h2>
            <p>No optional analytics or advertising cookies are active. If non-essential cookies or similar technologies are introduced, they must not be loaded before valid consent is given in accordance with the Privacy and Electronic Communications Regulations (PECR). The cookie list and consent choices must then be updated before release.</p>
          </article>
          <article>
            <h2>Your choice</h2>
            <p>You can reject optional cookies or accept them using the preference banner. Rejecting optional cookies does not affect essential website functions. As no optional cookies are currently active, accepting does not enable analytics or advertising on this version of the website.</p>
          </article>
          <article>
            <h2>Business contact address</h2>
            <address className="mt-3 not-italic leading-7 text-slate-600">{ADDRESS.line1}<br />{ADDRESS.city}<br />{ADDRESS.postcode}<br />{ADDRESS.country}</address>
          </article>
          <article>
            <h2>Draft review</h2>
            <p>This is draft information, not legal advice. The client’s legal adviser should review the live website, its hosting and any future integrations, and confirm whether this notice meets the business’s obligations before publication.</p>
          </article>
        </Container>
      </section>
    </>
  )
}