import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

export function getPlaywrightCredentials() {
  const email = process.env.PLAYWRIGHT_EMAIL
  const password = process.env.PLAYWRIGHT_PASSWORD

  return {
    email,
    password,
    locale: process.env.PLAYWRIGHT_LOCALE || 'fi',
  }
}

export async function loginToErp(page: Page, locale = 'fi') {
  const { email, password } = getPlaywrightCredentials()
  expect(email, 'PLAYWRIGHT_EMAIL is required').toBeTruthy()
  expect(password, 'PLAYWRIGHT_PASSWORD is required').toBeTruthy()

  await page.goto(`/${locale}/login`)
  await page.getByTestId('login-identifier').fill(email!)
  await page.getByTestId('login-password').fill(password!)
  await page.getByTestId('login-submit').click()
  await page.waitForURL(new RegExp(`/${locale}/(dashboard|driver)`))
}

export async function createAssignedOrder(page: Page, options: { locale?: string; pickup: string; delivery: string }) {
  const locale = options.locale || 'fi'
  await page.goto(`/${locale}/orders/new`)

  await page.getByLabel('Customer').selectOption({ label: 'Arctic Timber Solutions' })
  await page.getByLabel('Status').selectOption('planned')
  await page.getByLabel('Pickup Location').fill(options.pickup)
  await page.getByLabel('Delivery Location').fill(options.delivery)
  await page.getByLabel('Vehicle').selectOption({ label: 'ABC-123' })
  await page.getByLabel('Driver').selectOption({ label: 'Mika Lehtinen' })
  await page.getByLabel('Scheduled At').fill('2026-03-07T09:00')
  await page.getByLabel('Cargo Description').fill(`Playwright cargo for ${options.pickup}`)
  await page.getByLabel('Notes').fill('Created by Playwright transport ERP flow.')
  await page.getByRole('button', { name: 'Create order' }).click()

  await page.waitForURL(`**/${locale}/orders`)
  const row = page.locator('tr').filter({ hasText: options.pickup }).filter({ hasText: options.delivery })
  await expect(row).toContainText('Arctic Timber Solutions')
  return row
}
