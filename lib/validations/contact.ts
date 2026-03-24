import { z } from 'zod'

export const contactSubmissionSchema = z.object({
  name: z.string().trim().min(2, 'Please enter your name.').max(100, 'Name is too long.'),
  email: z.string().trim().email('Please enter a valid email address.'),
  company: z.string().trim().min(2, 'Please enter a company name.').max(120, 'Company name is too long.'),
  phone: z.string().trim().max(40, 'Phone number is too long.').optional().or(z.literal('')),
  serviceInterest: z.string().trim().max(120, 'Selected service is too long.').optional().or(z.literal('')),
  message: z.string().trim().min(20, 'Tell us a little more about what you need.').max(2500, 'Message is too long.'),
  website: z.string().trim().max(120).optional().or(z.literal('')),
})

export type ContactSubmission = z.infer<typeof contactSubmissionSchema>

