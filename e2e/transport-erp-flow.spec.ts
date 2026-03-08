import { test, expect } from '@playwright/test'

import { createAssignedOrder, getPlaywrightCredentials, loginToErp } from './helpers'

test.describe.configure({ mode: 'serial' })

test('ERP flow: create order -> trip -> invoice -> payment', async ({ page }) => {
  const { email, password, locale } = getPlaywrightCredentials()
  test.skip(!email || !password, 'PLAYWRIGHT_EMAIL and PLAYWRIGHT_PASSWORD are required')

  const stamp = Date.now()
  const pickup = `Turku Playwright ${stamp}`
  const delivery = `Helsinki Playwright ${stamp}`

  await loginToErp(page, locale)
  const orderRow = await createAssignedOrder(page, { locale, pickup, delivery })

  await orderRow.getByRole('link').first().click()
  await expect(page.getByRole('button', { name: 'Create trip from order' })).toBeVisible()

  await page.getByRole('button', { name: 'Create trip from order' }).click()
  await page.waitForURL(new RegExp(`/${locale}/trips/.+`))
  await expect(page.getByText('Trip Summary')).toBeVisible()

  await page.getByRole('button', { name: 'Start trip' }).click()
  await expect(page.getByText('started', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Complete trip' }).click()
  await expect(page.getByText('completed', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Create invoice from trip' }).click()
  await page.waitForURL(new RegExp(`/${locale}/invoices/.+`))
  await expect(page.getByText('Invoice Header')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Download PDF' })).toBeVisible()

  await page.getByLabel('Amount').fill('10000')
  await page.getByRole('button', { name: 'Register Payment' }).click()
  await expect(page.getByText('paid', { exact: true })).toBeVisible()
})
