import { test, expect } from '@playwright/test'

test('AP: create vendor -> purchase invoice -> approve -> pay -> paid', async ({ page }) => {
  const email = process.env.PLAYWRIGHT_EMAIL
  const password = process.env.PLAYWRIGHT_PASSWORD
  expect(email, 'PLAYWRIGHT_EMAIL is required').toBeTruthy()
  expect(password, 'PLAYWRIGHT_PASSWORD is required').toBeTruthy()

  await page.goto('/fi/login')
  await page.getByTestId('login-email').fill(email!)
  await page.getByTestId('login-password').fill(password!)
  await page.getByTestId('login-submit').click()

  await page.goto('/fi/purchases/vendors')
  await page.getByTestId('create-vendor').click()
  await page.getByTestId('vendor-name').fill(`Test Vendor ${Date.now()}`)
  await page.getByTestId('vendor-submit').click()

  await page.goto('/fi/purchases/invoices')
  await page.getByTestId('create-purchase-invoice').click()
  await page.getByTestId('purchase-description').fill('Office supplies')
  await page.getByTestId('purchase-quantity').fill('1')
  await page.getByTestId('purchase-unitPrice').fill('50')
  await page.getByTestId('purchase-vatRate').fill('24')
  await page.getByTestId('purchase-submit').click()

  const row = page.locator('tr').nth(1)
  await row.getByRole('button').filter({ hasText: 'Hyväksy' }).click()

  await row.getByRole('button').filter({ hasText: 'Merkitse maksetuksi' }).click()
  await page.getByTestId('purchase-payment-amount').fill('62')
  await page.getByTestId('purchase-payment-submit').click()

  await expect(row.getByText('Maksettu')).toBeVisible()
})
