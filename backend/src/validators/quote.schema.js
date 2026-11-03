import { z } from 'zod';
import { emailSchema, honeypotField, optionalText, phoneSchema, requiredServicesSchema } from './common.js';
export const quoteSchema = z.object({
  businessName: z.string({ required_error: 'Business name is required' }).trim().min(1).max(160),
  contactPerson: z.string({ required_error: 'Contact person is required' }).trim().min(2).max(120),
  phone: phoneSchema, email: emailSchema, businessType: z.string({ required_error: 'Business type is required' }).trim().min(1).max(100),
  estimatedInventoryVolume: optionalText(100, 'Estimated inventory volume'), monthlyOrderVolume: optionalText(100, 'Monthly order volume'),
  requiredServices: requiredServicesSchema, additionalRequirements: optionalText(3000, 'Additional requirements'), website: honeypotField,
  consent: z.boolean({ required_error: 'Consent is required', invalid_type_error: 'Consent must be true' }).refine((value) => value, 'Consent is required')
});
