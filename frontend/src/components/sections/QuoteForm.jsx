import { useRef, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { ArrowRight, LoaderCircle } from 'lucide-react'
import { applyServerFieldErrors, getSubmissionError, submitQuote } from '../../lib/api'
import { quoteSchema } from '../../lib/schemas'
import { SERVICE_OPTIONS } from '../../lib/constants'
import Button from '../ui/Button'
import { CheckboxGroup, ConsentCheckbox, Input, Select, Textarea } from '../ui/FormFields'
import { FormError, FormSuccess } from '../ui/FormMessages'
import Honeypot from '../ui/Honeypot'

const defaultValues = {
  businessName: '',
  contactPerson: '',
  phone: '',
  email: '',
  consent: false,
  businessType: '',
  estimatedInventoryVolume: '',
  monthlyOrderVolume: '',
  requiredServices: [],
  additionalRequirements: '',
}
const quoteFields = Object.keys(defaultValues)

export default function QuoteForm() {
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
  } = useForm({ resolver: zodResolver(quoteSchema), defaultValues })

  async function onSubmit(values) {
    setServerError('')
    try {
      const response = await submitQuote({ ...values, website: honeypotRef.current?.value ?? '' })
      if (response?.success !== true) {
        applyServerFieldErrors(response, setError, quoteFields)
        setServerError(response?.message || 'We could not submit your quote request. Please try again.')
        return
      }
      setSuccess(true)
    } catch (error) {
      applyServerFieldErrors(error, setError, quoteFields)
      setServerError(getSubmissionError(error))
    }
  }

  if (success) return <FormSuccess>Your quote request has been received. Our team will review your requirements and get back to you.</FormSuccess>

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      <FormError>{serverError}</FormError>
      <div className="grid gap-5 sm:grid-cols-2">
        <Input id="businessName" label="Business name" autoComplete="organization" placeholder="Your business" error={errors.businessName?.message} {...register('businessName')} />
        <Input id="contactPerson" label="Contact person" autoComplete="name" placeholder="Your name" error={errors.contactPerson?.message} {...register('contactPerson')} />
        <Input id="phone" label="Phone Number" type="tel" autoComplete="tel" placeholder="07XXX XXXXXX" hint="UK phone number" error={errors.phone?.message} {...register('phone')} />
        <Input id="email" label="Email address" type="email" autoComplete="email" placeholder="you@business.com" error={errors.email?.message} {...register('email')} />
        <Input id="businessType" label="Business type" placeholder="e.g. Online retail" error={errors.businessType?.message} {...register('businessType')} />
        <Select id="estimatedInventoryVolume" label="Estimated inventory volume" error={errors.estimatedInventoryVolume?.message} {...register('estimatedInventoryVolume')}>
          <option value="">Select a range</option>
          <option value="under-5-pallets">Under 5 pallets / 10 m³</option>
          <option value="5-20-pallets">5–20 pallets / 10–40 m³</option>
          <option value="21-50-pallets">21–50 pallets / 41–100 m³</option>
          <option value="over-50-pallets">Over 50 pallets / over 100 m³</option>
          <option value="not-sure">Not sure yet</option>
        </Select>
        <Select id="monthlyOrderVolume" label="Estimated monthly orders" error={errors.monthlyOrderVolume?.message} {...register('monthlyOrderVolume')}>
          <option value="">Select a range</option>
          <option value="under-100">Under 100</option>
          <option value="100-500">100–500</option>
          <option value="501-2000">501–2,000</option>
          <option value="2000-plus">More than 2,000</option>
          <option value="not-sure">Not sure yet</option>
        </Select>
        <div className="sm:col-span-2">
          <CheckboxGroup
            label="Services required"
            options={SERVICE_OPTIONS}
            value={watch('requiredServices') || []}
            onChange={(value, options) => setValue('requiredServices', value, options)}
            error={errors.requiredServices?.message}
          />
        </div>
        <Textarea id="additionalRequirements" label="Additional requirements" placeholder="Share any special handling, packaging or workflow needs" maxLength={2000} error={errors.additionalRequirements?.message} className="sm:col-span-2" {...register('additionalRequirements')} />
        <div className="sm:col-span-2">
          <ConsentCheckbox error={errors.consent?.message} register={register('consent')} />
        </div>
      </div>
      <Honeypot ref={honeypotRef} />
      <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
        {isSubmitting ? <><LoaderCircle size={17} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> Sending request…</> : <>Request my quote <ArrowRight size={17} aria-hidden="true" /></>}
      </Button>
      <p className="text-xs leading-5 text-slate-500">Your information will only be used to respond to your enquiry.</p>
    </form>
  )
}
