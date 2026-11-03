import { z } from 'zod'
import { parsePhoneNumberFromString } from 'libphonenumber-js/max'

const phoneSchema = z
  .string()
  .trim()
  .transform((value, context) => {
    const phoneNumber = parsePhoneNumberFromString(value, 'GB')
    const nationalNumber = phoneNumber?.nationalNumber || ''
    const isUKMobile = nationalNumber.startsWith('7') && phoneNumber?.getType() === 'MOBILE'
    const isUKLandline = /^[123]/.test(nationalNumber)

    if (!phoneNumber?.isValid() || phoneNumber.country !== 'GB' || (!isUKMobile && !isUKLandline)) {
      context.addIssue({ code: 'custom', message: 'Enter a valid UK mobile or landline number.' })
      return z.NEVER
    }

    return phoneNumber.number
  })

const emailSchema = z.string().trim().email('Enter a valid email address.').max(254, 'Email must be 254 characters or fewer.')
const requiredServicesSchema = z
  .array(z.enum([
    'inventory-receiving',
    'warehousing-storage',
    'inventory-management',
    'order-fulfillment',
    'packaging-labeling',
    'courier-dispatch',
    'returns-handling',
  ]))
  .min(1, 'Select at least one service.')

export const contactSchema = z.object({
  fullName: z.string().trim().min(2, 'Enter your name.').max(100, 'Name must be 100 characters or fewer.'),
  businessName: z.string().trim().min(2, 'Enter your business name.').max(120, 'Business name must be 120 characters or fewer.'),
  phone: phoneSchema,
  email: emailSchema,
  consent: z.boolean().refine((value) => value, 'Please agree to be contacted about your enquiry.'),
  requiredServices: requiredServicesSchema,
  estimatedMonthlyOrders: z.string().trim().min(1, 'Select your estimated monthly order volume.').max(50),
  message: z.string().trim().min(10, 'Please share a little more detail (at least 10 characters).').max(2000, 'Message must be 2,000 characters or fewer.'),
})

export const quoteSchema = z.object({
  businessName: z.string().trim().min(2, 'Enter your business name.').max(120, 'Business name must be 120 characters or fewer.'),
  contactPerson: z.string().trim().min(2, 'Enter your name.').max(100, 'Name must be 100 characters or fewer.'),
  phone: phoneSchema,
  email: emailSchema,
  consent: z.boolean().refine((value) => value, 'Please agree to be contacted about your enquiry.'),
  businessType: z.string().trim().min(2, 'Tell us what kind of business you run.').max(100, 'Business type must be 100 characters or fewer.'),
  estimatedInventoryVolume: z.string().trim().min(1, 'Select your estimated inventory volume.').max(50),
  monthlyOrderVolume: z.string().trim().min(1, 'Select your estimated monthly order volume.').max(50),
  requiredServices: requiredServicesSchema,
  additionalRequirements: z.string().trim().max(2000, 'Additional requirements must be 2,000 characters or fewer.'),
})
