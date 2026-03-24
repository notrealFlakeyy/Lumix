import 'server-only'

import nodemailer from 'nodemailer'

import { getEmailEnv, requireEmailDeliveryConfig } from '@/lib/env/email'
import type { ContactSubmission } from '@/lib/validations/contact'

let cachedTransporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (cachedTransporter) return cachedTransporter

  const env = requireEmailDeliveryConfig()
  cachedTransporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: env.SMTP_USER && env.SMTP_PASS ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  })

  return cachedTransporter
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export async function sendContactSubmission(payload: ContactSubmission) {
  const env = getEmailEnv()
  const recipient = env.CONTACT_FORM_TO ?? env.SMTP_REPLY_TO ?? env.SMTP_FROM

  if (!recipient) {
    throw new Error('Contact form recipient is not configured. Set CONTACT_FORM_TO, SMTP_REPLY_TO, or SMTP_FROM.')
  }

  const transporter = getTransporter()
  const subject = `New Lumix contact request from ${payload.company}`
  const lines = [
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    `Company: ${payload.company}`,
    `Phone: ${payload.phone || '-'}`,
    `Service interest: ${payload.serviceInterest || '-'}`,
    '',
    payload.message,
  ]

  const html = `
    <div style="font-family: Arial, sans-serif; color: #18263f; line-height: 1.6;">
      <h2 style="margin-bottom: 16px;">New Lumix contact request</h2>
      <table style="border-collapse: collapse; margin-bottom: 18px;">
        <tr><td style="padding: 4px 16px 4px 0; color: #6c5d4f;">Name</td><td>${escapeHtml(payload.name)}</td></tr>
        <tr><td style="padding: 4px 16px 4px 0; color: #6c5d4f;">Email</td><td>${escapeHtml(payload.email)}</td></tr>
        <tr><td style="padding: 4px 16px 4px 0; color: #6c5d4f;">Company</td><td>${escapeHtml(payload.company)}</td></tr>
        <tr><td style="padding: 4px 16px 4px 0; color: #6c5d4f;">Phone</td><td>${escapeHtml(payload.phone || '-')}</td></tr>
        <tr><td style="padding: 4px 16px 4px 0; color: #6c5d4f;">Service interest</td><td>${escapeHtml(payload.serviceInterest || '-')}</td></tr>
      </table>
      <div style="padding: 16px; border-radius: 16px; background: #fff8f0; border: 1px solid rgba(108,93,79,0.18);">
        ${escapeHtml(payload.message).replaceAll('\n', '<br />')}
      </div>
    </div>
  `

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: recipient,
    replyTo: payload.email,
    subject,
    text: lines.join('\n'),
    html,
  })
}

