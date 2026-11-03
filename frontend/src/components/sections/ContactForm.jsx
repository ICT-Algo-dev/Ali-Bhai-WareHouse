import { useRef, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { ArrowRight, LoaderCircle } from 'lucide-react'
import { applyServerFieldErrors, getSubmissionError, submitContact } from '../../lib/api'
import { contactSchema } from '../../lib/schemas'
import { SERVICE_OPTIONS } from '../../lib/constants'
import Button from '../ui/Button'
import { CheckboxGroup, ConsentCheckbox, Input, Select, Textarea } from '../ui/FormFields'
import { FormError, FormSuccess } from '../ui/FormMessages'
import Honeypot from '../ui/Honeypot'

const defaultValues = {
  fullName: '',
  businessName: '',
  phone: '',
  email: '',
  consent: false,
  requiredServices: [],
  estimatedMonthlyOrders: '',
  message: '',
}
const contactFields = Object.keys(defaultValues)

export default function ContactForm() {
  const [serverError, setServerError] = useState('')
  const [success, setSuccess] = useState(false)
  const honeypotRef = useRef(null)
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(contactSchema), defaultValues })

  async function onSubmit(values) {
    setServerError('')
    try {
      const response = await submitContact({ ...values, website: honeypotRef.current?.value ?? '' })
      if (response?.success !== true) {
        applyServerFieldErrors(response, setError, contactFields)
        setServerError(response?.message || 'We could not submit your message. Please try again.')
        return
      }
      setSuccess(true)
    } catch (error) {
      applyServerFieldErrors(error, setError, contactFields)
      setServerError(getSubmissionError(error))
    }
  }

  if (success) return <FormSuccess>Thank you for getting in touch. Our team will review your message and follow up soon.</FormSuccess>

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <FormError>{serverError}</FormError>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input id="fullName" label="Full name" autoComplete="name" placeholder="Your name" error={errors.fullName?.message} {...register('fullName')} />
        <Input id="businessName" label="Business name" autoComplete="organization" placeholder="Your business" error={errors.businessName?.message} {...register('businessName')} />
        <Input id="phone" label="Phone number" type="tel" autoComplete="tel" placeholder="07XXX XXXXXX" hint="UK phone number" error={errors.phone?.message} {...register('phone')} />
        <Input id="email" label="Email address" type="email" autoComplete="email" placeholder="you@business.com" error={errors.email?.message} {...register('email')} />
        <Select id="estimatedMonthlyOrders" label="Estimated monthly orders" error={errors.estimatedMonthlyOrders?.message} {...register('estimatedMonthlyOrders')}>
          <option value="">Select an order range</option>
          <option value="under-100">Under 100</option>
          <option value="100-500">100–500</option>
          <option value="501-2000">501–2,000</option>
          <option value="2000-plus">More than 2,000</option>
          <option value="not-sure">Not sure yet</option>
        </Select>
        <div className="sm:col-span-2">
          <CheckboxGroup
            label="Services you’re interested in"
            options={SERVICE_OPTIONS}
            value={watch('requiredServices') || []}
            onChange={(value, options) => setValue('requiredServices', value, options)}
            error={errors.requiredServices?.message}
          />
        </div>
        <Textarea id="message" label="How can we help?" placeholder="Tell us about your products and fulfilment needs" maxLength={2000} error={errors.message?.message} className="sm:col-span-2" {...register('message')} />
        <div className="sm:col-span-2">
          <ConsentCheckbox error={errors.consent?.message} register={register('consent')} />
        </div>
      </div>
      <Honeypot ref={honeypotRef} />
      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting ? <><LoaderCircle size={17} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> Sending…</> : <>Send message <ArrowRight size={17} aria-hidden="true" /></>}
      </Button>
      <p className="text-xs leading-5 text-slate-500">Your information will only be used to respond to your enquiry.</p>
    </form>
  )
}
