import Seo from '../components/ui/Seo'
import Hero from '../components/sections/Hero'
import ServicesOverview from '../components/sections/ServicesOverview'
import WhyChooseUs from '../components/sections/WhyChooseUs'
import HowItWorks from '../components/sections/HowItWorks'
import CourierPartners from '../components/sections/CourierPartners'
import Benefits from '../components/sections/Benefits'
import Testimonials from '../components/sections/Testimonials'
import FinalCTA from '../components/sections/FinalCTA'

export default function Home() {
  return (
    <>
      <Seo title="Warehousing & Order Fulfilment Across the UK" description="Complete warehousing, inventory management and order fulfilment solutions across the United Kingdom. We store, pack and prepare orders for dispatch with UK carriers." includePostalAddress />
      <Hero />
      <ServicesOverview compact />
      <WhyChooseUs />
      <HowItWorks preview />
      <CourierPartners />
      <Benefits />
      <Testimonials />
      <FinalCTA />
    </>
  )
}
