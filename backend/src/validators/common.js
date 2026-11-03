import { z } from 'zod';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
export const services = ['inventory-receiving', 'warehousing-storage', 'inventory-management', 'order-fulfillment', 'packaging-labeling', 'courier-dispatch', 'returns-handling'];
export const requiredServicesSchema = z.array(z.enum(services)).min(1, 'Select at least one service').max(7);
const string = (max, label) => z.string({ required_error: `${label} is required` }).trim().min(1, `${label} is required`).max(max, `${label} must be ${max} characters or fewer`);
export const emailSchema = string(254, 'Email').email('Enter a valid email address').transform((v) => v.toLowerCase());
export const phoneSchema = string(30, 'Phone').transform((value, ctx) => {
  const parsed = parsePhoneNumberFromString(value, 'GB', { extract: false });
  if (!parsed?.isValid() || parsed.country !== 'GB') {
    ctx.addIssue({ code: 'custom', message: 'Enter a valid UK phone number, such as 07123 456789 or +44 20 7946 0958' });
    return z.NEVER;
  }
  return parsed.number;
});
export const optionalText = (max, label) => z.string().trim().max(max, `${label} must be ${max} characters or fewer`).default('');
export const honeypotField = z.string().trim().max(500).default('');
