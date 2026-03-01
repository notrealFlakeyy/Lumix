import { test, expect } from '@playwright/test'

test('AR: create customer -> invoice -> payment -> paid', async ({ page }) => {
  const email = process.env.PLAYWRIGHT_EMAIL
  const password = process.env.PLAYWRIGHT_PASSWORD
  expect(email, 'PLAYWRIGHT_EMAIL is required').toBeTruthy()
  expect(password, 'PLAYWRIGHT_PASSWORD is required').toBeTruthy()
  const customerName = `Test Customer ${Date.now()}`

  await page.goto('/fi/login')
  await page.getByTestId('login-email').fill(email!)
  await page.getByTestId('login-password').fill(password!)
  await page.getByTestId('login-submit').click()

  await page.goto('/fi/sales/customers')
  await page.getByTestId('create-customer').click()
  await page.getByTestId('customer-name').fill(customerName)
  await page.getByTestId('customer-submit').click()

  await page.goto('/fi/sales/invoices')
  await page.getByTestId('create-invoice').click()
  await page.getByTestId('invoice-customerName').fill(customerName)
  await page.getByTestId('invoice-description').fill('Service')
  await page.getByTestId('invoice-quantity').fill('1')
  await page.getByTestId('invoice-unitPrice').fill('100')
  await page.getByTestId('invoice-vatRate').fill('24')
  await page.getByTestId('invoice-submit').click()

  const row = page.locator('tr').nth(1)
  await row.getByRole('button').filter({ hasText: 'Merkitse lähetetyksi' }).click()

  await row.getByRole('button').filter({ hasText: 'Kirjaa maksu' }).click()
  await page.getByTestId('payment-amount').fill('124')
  await page.getByTestId('payment-submit').click()

  await expect(row.getByText('Maksettu')).toBeVisible()
})
