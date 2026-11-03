import { asyncHandler } from '../utils/asyncHandler.js';
import { createInquiry } from '../services/inquiry.service.js';

export const submitContact = asyncHandler(async (req, res) => {
  const inquiry = await createInquiry('contact', req.validatedBody, req);
  res.status(201).json({ success: true, message: 'Contact inquiry submitted successfully', data: { id: inquiry.id } });
});

export const submitQuote = asyncHandler(async (req, res) => {
  const inquiry = await createInquiry('quote', req.validatedBody, req);
  res.status(201).json({ success: true, message: 'Quote request submitted successfully', data: { id: inquiry.id } });
});
