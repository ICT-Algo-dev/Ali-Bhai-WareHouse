import { z } from 'zod';
import { emailSchema, honeypotField, optionalText, phoneSchema, requiredServicesSchema } from './common.js';
export const contactSchema = z.object({
  fullName: z.string({ required_error: 'Full name is required' }).trim().min(2, 'Full name must be at least 2 characters').max(120),
  businessName: z.string({ required_error: 'Business name is required' }).trim().min(1, 'Business name is required').max(160),
  phone: phoneSchema, email: emailSchema, requiredServices: requiredServicesSchema,
  estimatedMonthlyOrders: optionalText(80, 'Estimated monthly orders'), message: optionalText(3000, 'Message'), website: honeypotField,
  consent: z.boolean({ required_error: 'Consent is required', invalid_type_error: 'Consent must be true' }).refine((value) => value, 'Consent is required')
});
