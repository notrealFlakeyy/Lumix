import { test, expect } from '@playwright/test'

import { createAssignedOrder, getPlaywrightCredentials, loginToErp } from './helpers'

test.describe.configure({ mode: 'serial' })

test('Driver mobile preview: start and complete assigned trip', async ({ page }) => {
  const { email, password, locale } = getPlaywrightCredentials()
  test.skip(!email || !password, 'PLAYWRIGHT_EMAIL and PLAYWRIGHT_PASSWORD are required')

  const stamp = Date.now()
  const pickup = `Espoo Driver ${stamp}`
  const delivery = `Lahti Driver ${stamp}`

  await loginToErp(page, locale)
  const orderRow = await createAssignedOrder(page, { locale, pickup, delivery })

  await orderRow.getByRole('link').first().click()
  await page.getByRole('button', { name: 'Create trip from order' }).click()
  await page.waitForURL(new RegExp(`/${locale}/trips/.+`))

  await page.goto(`/${locale}/driver`)
  await page.getByRole('link', { name: 'Mika Lehtinen' }).click()
  await expect(page.getByText('Preview mode')).toBeVisible()

  await page.getByRole('link', { name: 'View all' }).click()
  const tripCard = page.locator('div,article,section').filter({ hasText: pickup }).filter({ hasText: delivery }).first()
  await expect(tripCard).toBeVisible()
  await tripCard.getByRole('link', { name: 'Open trip workflow' }).click()

  await page.getByLabel('Start odometer (km)').fill('182460')
  await page.getByLabel('Kickoff note').fill('Loaded and leaving terminal.')
  await page.getByRole('button', { name: 'Start trip' }).click()
  await expect(page.getByText('Trip started successfully.')).toBeVisible()

  await page.getByLabel('End odometer').fill('182610')
  await page.getByLabel('Waiting min').fill('15')
  await page.getByLabel('Delivery confirmation').fill('Signed by site receiver')
  await page.getByLabel('Driver note').fill('Delivery completed without issues.')
  await page.getByRole('button', { name: 'Complete trip' }).click()

  await expect(page.getByText('Trip completed successfully.')).toBeVisible()
  await expect(page.getByText('Signed by site receiver')).toBeVisible()
})
