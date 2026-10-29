import { test, expect, type Page } from '@playwright/test'
import type { Workspace } from '../src/app/core/domain'

const property = '1248 Willow Creek Lane'
const dialog = (page: Page) => page.getByRole('dialog').last()
async function snapshot(page: Page): Promise<Workspace> {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open('haven-property-desk')
        request.onerror = () => reject(request.error)
        request.onsuccess = () => {
          const db = request.result
          const read = db.transaction('workspace').objectStore('workspace').get('data')
          read.onsuccess = () => {
            resolve(read.result)
            db.close()
          }
          read.onerror = () => {
            reject(read.error)
            db.close()
          }
        }
      }),
  )
}
async function visit(page: Page, route = '/overview') {
  await page.goto(route)
  await expect(page.locator('main h1')).toBeVisible()
  await expect(page.locator('.workspace-loading')).toHaveCount(0)
}
async function openOffer(page: Page, address = property, buyer = 'Olivia Bennett') {
  await visit(page, '/offers')
  await page.getByRole('textbox', { name: 'Search offers' }).fill(address)
  await page
    .getByRole('button', { name: `Open offer for ${address} from ${buyer}`, exact: true })
    .click()
  await expect(dialog(page).getByRole('heading', { name: 'A step closer to home.' })).toBeVisible()
}
async function draft(page: Page, buyerId: string, amount = '1230000.25') {
  await page.getByRole('button', { name: 'New offer', exact: true }).click()
  await dialog(page).getByLabel('Offer property', { exact: true }).selectOption('property-001')
  await dialog(page).getByLabel('Offer buyer', { exact: true }).selectOption(buyerId)
  await dialog(page).getByLabel('Offer amount (USD)').fill(amount)
  await dialog(page).getByRole('button', { name: 'Save draft' }).click()
}
async function viewingForm(
  page: Page,
  propertyId: string,
  buyerId: string,
  agentId: string,
  starts: string,
) {
  await page.getByRole('button', { name: 'Schedule viewing', exact: true }).click()
  await dialog(page).getByLabel('Viewing property', { exact: true }).selectOption(propertyId)
  await dialog(page).getByLabel('Viewing buyer', { exact: true }).selectOption(buyerId)
  await dialog(page).getByLabel('Showing agent', { exact: true }).selectOption(agentId)
  await dialog(page).getByLabel('Date & time').fill(starts)
}
async function nextWeek(page: Page) {
  return page.evaluate(() => {
    const d = new Date()
    d.setDate(d.getDate() + 7)
    return d.toLocaleDateString('en-CA') + 'T10:00'
  })
}

test('listing creation, exact cents, duplicate validation, edit, archive and durable relist', async ({
  page,
}) => {
  await visit(page, '/properties')
  await page.getByRole('button', { name: 'Add property', exact: true }).click()
  await dialog(page).getByLabel('Property address').fill(property)
  await dialog(page)
    .getByLabel('Listing description')
    .fill('A beautiful new home with generous natural light and private outdoor space.')
  await dialog(page).getByRole('button', { name: 'Create listing' }).click()
  await expect(dialog(page).getByRole('alert')).toContainText('address already exists')
  expect((await snapshot(page)).properties).toHaveLength(24)
  await dialog(page).getByLabel('Property address').fill('42 Cypress Garden Lane')
  await dialog(page).getByLabel('Asking price (USD)').fill('950000.37')
  await dialog(page).getByRole('button', { name: 'Create listing' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  let created = (await snapshot(page)).properties.find(p => p.address === '42 Cypress Garden Lane')!
  expect(created.priceCents).toBe(95000037)
  await visit(page, '/properties/' + created.id)
  await page.getByRole('button', { name: 'Edit listing' }).click()
  await dialog(page).getByLabel('Property address').fill('42 Cypress Garden Court')
  await dialog(page).getByRole('button', { name: 'Save changes' }).click()
  await expect(page.getByRole('heading', { name: '42 Cypress Garden Court' })).toBeVisible()
  await page.getByRole('button', { name: 'Save property', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Saved', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Archive listing', exact: true }).click()
  await dialog(page).getByRole('button', { name: 'Archive listing', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Relist property', exact: true })).toBeVisible()
  await page.reload()
  await page.getByRole('button', { name: 'Relist property', exact: true }).click()
  await dialog(page).getByRole('button', { name: 'Relist property', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Schedule viewing', exact: true })).toBeVisible()
  created = (await snapshot(page)).properties.find(p => p.id === created.id)!
  expect(created).toMatchObject({
    priceCents: 95000037,
    featured: true,
    status: 'available',
    address: '42 Cypress Garden Court',
  })
})

test('listing filters retain focus and URL state; pagination and CSV include every matching record', async ({
  page,
}) => {
  await visit(page, '/properties')
  await expect(page.locator('.property-results')).toHaveAttribute('aria-busy', 'false')
  await expect(page.locator('.property-grid app-property-card')).toHaveCount(9)
  await page.getByRole('button', { name: 'Next page', exact: true }).click()
  await expect(page).toHaveURL(/page=2/)
  await expect(page.locator('.pagination')).toContainText('2 / 3')
  await page
    .getByLabel('Search properties', { exact: true })
    .pressSequentially('Willow', { delay: 50 })
  await expect(page.getByLabel('Search properties', { exact: true })).toBeFocused()
  await expect(page.locator('.property-grid app-property-card')).toHaveCount(1)
  await page.reload()
  await expect(page.getByLabel('Search properties', { exact: true })).toHaveValue('Willow')
  await page.getByLabel('Search properties', { exact: true }).fill('')
  await page.getByLabel('Filter neighborhood', { exact: true }).selectOption('Mueller')
  await expect(page.locator('.property-results')).toHaveAttribute('aria-busy', 'false')
  expect(await page.locator('.property-location').allTextContents()).toEqual(
    expect.arrayContaining([expect.stringContaining('Mueller')]),
  )
  await visit(page, '/properties?view=list&sort=price-asc')
  await expect(page.locator('tbody tr')).toHaveCount(10)
  const values = await page.locator('tbody td:nth-child(2)').allTextContents()
  const numeric = values.map(v => Number(v.replace(/[^\d.]/g, '')))
  expect(numeric).toEqual([...numeric].sort((a, b) => a - b))
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export', exact: true }).click()
  const stream = await (await download).createReadStream()
  const buffers = []
  for await (const buffer of stream!) buffers.push(buffer)
  const csv = Buffer.concat(buffers).toString('utf8')
  expect(csv.trim().split('\r\n')).toHaveLength(25)
  expect(csv).toContain('310 Parkside Avenue, #204')
})

test('buyer validation, matched properties, shortlist and changed preferences survive reload', async ({
  page,
}) => {
  await visit(page, '/buyers')
  await page.getByRole('button', { name: 'Add buyer', exact: true }).click()
  await dialog(page).getByLabel('Full name').fill('Jordan Avery')
  await dialog(page).getByLabel('Email address').fill('jordan@buyer.example')
  await dialog(page).getByLabel('Phone number').fill('5125550199')
  await dialog(page).getByLabel('Minimum budget (USD)').fill('1500000')
  await dialog(page).getByLabel('Maximum budget (USD)').fill('1000000')
  await dialog(page).getByRole('button', { name: 'Add buyer', exact: true }).click()
  await expect(dialog(page).getByRole('alert')).toContainText('maximum budget')
  await dialog(page).getByLabel('Minimum budget (USD)').fill('900000')
  await dialog(page).getByLabel('Maximum budget (USD)').fill('1500000')
  const existing = (await snapshot(page)).buyers[0].email
  await dialog(page).getByLabel('Email address').fill(existing)
  await dialog(page).getByRole('button', { name: 'Add buyer', exact: true }).click()
  await expect(dialog(page).getByRole('alert')).toContainText('email already exists')
  await dialog(page).getByLabel('Email address').fill('jordan@buyer.example')
  await dialog(page).getByRole('button', { name: 'Add buyer', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const buyer = (await snapshot(page)).buyers.find(b => b.email === 'jordan@buyer.example')!
  await visit(page, '/buyers/' + buyer.id)
  const card = page.locator('.buyer-property').filter({ hasText: property })
  await expect(card).toBeVisible()
  await card.getByRole('button', { name: 'Add to buyer shortlist' }).click()
  await expect(card.getByRole('button', { name: 'On Jordan’s shortlist' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.getByRole('button', { name: 'Edit preferences' }).click()
  await dialog(page).getByLabel('Maximum budget (USD)').fill('1000000')
  await dialog(page).getByRole('button', { name: 'Save preferences' }).click()
  await expect(card).toHaveCount(0)
  await page.getByRole('button', { name: /^Shortlist/ }).click()
  await expect(card).toBeVisible()
  await page.reload()
  await expect(card).toBeVisible()
  expect((await snapshot(page)).buyers.find(b => b.id === buyer.id)?.shortlistIds).toContain(
    'property-001',
  )
})

test('viewing conflicts cover agent, buyer and property; adjacent bookings are allowed', async ({
  page,
}) => {
  test.setTimeout(45000)
  await visit(page, '/viewings?scope=all')
  const starts = await nextWeek(page)
  await viewingForm(page, 'property-001', 'buyer-001', 'alex', starts)
  await dialog(page).getByRole('button', { name: 'Schedule viewing', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  for (const [p, b, a] of [
    ['property-002', 'buyer-002', 'alex'],
    ['property-002', 'buyer-001', 'emily'],
    ['property-001', 'buyer-002', 'emily'],
  ]) {
    await viewingForm(page, p, b, a, starts)
    await dialog(page).getByRole('button', { name: 'Schedule viewing', exact: true }).click()
    await expect(dialog(page).getByRole('alert')).toContainText('overlaps another viewing')
    await dialog(page).getByRole('button', { name: 'Cancel', exact: true }).click()
  }
  expect((await snapshot(page)).viewings).toHaveLength(27)
  await viewingForm(page, 'property-001', 'buyer-001', 'alex', starts.replace('10:00', '10:45'))
  await dialog(page).getByRole('button', { name: 'Schedule viewing', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect((await snapshot(page)).viewings).toHaveLength(28)
})

test('future viewings reschedule and cancel with context; past viewings retain feedback', async ({
  page,
}) => {
  await visit(page, '/viewings?scope=all')
  const starts = await nextWeek(page)
  await viewingForm(page, 'property-001', 'buyer-001', 'alex', starts)
  await dialog(page).getByRole('button', { name: 'Schedule viewing', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const viewing = (await snapshot(page)).viewings.at(-1)!
  await page.locator('.viewing-row').filter({ hasText: property }).last().click()
  await expect(dialog(page).getByRole('button', { name: 'Record feedback' })).toBeDisabled()
  await dialog(page).getByRole('button', { name: 'Reschedule', exact: true }).click()
  await dialog(page).getByLabel('Date & time').fill(starts.replace('10:00', '14:00'))
  await dialog(page).getByRole('button', { name: 'Reschedule viewing' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(1)
  await expect(dialog(page).locator('.viewing-facts')).toContainText('2:00 PM')
  await dialog(page).getByRole('button', { name: 'Cancel viewing', exact: true }).click()
  await dialog(page).getByRole('button', { name: 'Confirm cancellation' }).click()
  await expect(dialog(page).getByRole('alert')).toContainText('at least 5 characters')
  await dialog(page)
    .getByLabel('Cancellation reason')
    .fill('Buyer requested a different neighborhood.')
  await dialog(page).getByRole('button', { name: 'Confirm cancellation' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page.reload()
  expect((await snapshot(page)).viewings.find(v => v.id === viewing.id)).toMatchObject({
    status: 'cancelled',
    outcome: 'Buyer requested a different neighborhood.',
  })
  await page.clock.setFixedTime(new Date(new Date().toISOString().slice(0, 10) + 'T23:00:00Z'))
  await page.reload()
  await page.locator('.viewing-row').filter({ hasText: property }).first().click()
  await expect(dialog(page).getByRole('button', { name: 'Record feedback' })).toBeEnabled()
  await dialog(page)
    .getByLabel('Viewing feedback')
    .fill('The buyer loved the light and wants a second visit.')
  await dialog(page).getByRole('button', { name: 'Save feedback' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  expect((await snapshot(page)).viewings.find(v => v.id === 'viewing-001')?.status).toBe(
    'completed',
  )
})

test('offer acceptance reserves atomically, protects the competing offer and closes with all conditions', async ({
  page,
}) => {
  test.setTimeout(60000)
  await visit(page, '/viewings?scope=all')
  await viewingForm(page, 'property-001', 'buyer-002', 'emily', await nextWeek(page))
  await dialog(page).getByRole('button', { name: 'Schedule viewing', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  const viewingId = (await snapshot(page)).viewings.at(-1)!.id
  await visit(page, '/offers')
  await draft(page, 'buyer-002')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  let competitor = (await snapshot(page)).offers.find(
    o => o.propertyId === 'property-001' && o.buyerId === 'buyer-002',
  )!
  expect(competitor.amountCents).toBe(123000025)
  await openOffer(page, property, 'Noah Williams')
  await dialog(page).getByRole('button', { name: 'Edit draft' }).click()
  await dialog(page).getByLabel('Offer amount (USD)').fill('1240000.19')
  await dialog(page).getByRole('button', { name: 'Save draft' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(1)
  await expect(dialog(page).locator('.offer-amount')).toContainText('$1,240,000.19')
  await dialog(page).getByRole('button', { name: 'Mark as submitted' }).click()
  await expect(dialog(page).getByRole('button', { name: 'Accept & reserve' })).toBeVisible()
  await openOffer(page)
  await dialog(page).getByRole('button', { name: 'Accept & reserve' }).click()
  await expect(dialog(page).getByRole('button', { name: 'Record sale' })).toBeVisible()
  let state = await snapshot(page)
  expect(state.properties.find(p => p.id === 'property-001')?.status).toBe('reserved')
  expect(state.viewings.find(v => v.id === viewingId)?.status).toBe('cancelled')
  expect(state.viewings.find(v => v.id === 'viewing-001')?.status).toBe('scheduled')
  await visit(page, '/properties/property-001?tab=viewings')
  await page.locator('.related-list > button').filter({ hasText: 'scheduled' }).click()
  await dialog(page).getByRole('button', { name: 'Reschedule', exact: true }).click()
  await dialog(page)
    .getByLabel('Date & time')
    .fill((await nextWeek(page)).replace('10:00', '15:00'))
  await dialog(page).getByRole('button', { name: 'Reschedule viewing' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(1)
  await expect(dialog(page).locator('.viewing-facts')).toContainText('3:00 PM')
  await openOffer(page, property, 'Noah Williams')
  await dialog(page).getByRole('button', { name: 'Accept & reserve' }).click()
  await expect(dialog(page).getByRole('alert')).toContainText('no longer available')
  expect((await snapshot(page)).offers.find(o => o.id === competitor.id)?.status).toBe('submitted')
  await openOffer(page)
  await dialog(page).getByRole('button', { name: 'Record sale' }).click()
  await expect(dialog(page).getByRole('alert')).toContainText('all three closing conditions')
  for (const name of ['Buyer funds verified', 'Inspection completed', 'Agreement signed']) {
    await dialog(page).getByRole('checkbox', { name }).check()
    await expect(dialog(page).getByRole('checkbox', { name })).toBeChecked()
    await expect(dialog(page).getByRole('button', { name: 'Record sale' })).toBeEnabled()
  }
  await dialog(page).getByRole('button', { name: 'Record sale' }).click()
  await dialog(page).getByRole('button', { name: 'Confirm sale' }).click()
  await expect(dialog(page).locator('.success-note')).toBeVisible()
  await expect(dialog(page).getByRole('button', { name: 'Record sale' })).toHaveCount(0)
  state = await snapshot(page)
  expect(state.properties.find(p => p.id === 'property-001')?.status).toBe('sold')
  expect(state.offers.find(o => o.id === 'offer-001')).toMatchObject({
    status: 'closed',
    conditions: { funds: true, inspection: true, agreement: true },
  })
  expect(state.offers.find(o => o.id === competitor.id)).toMatchObject({
    status: 'withdrawn',
    decisionNote: 'Property sold to another buyer.',
  })
  expect(
    state.viewings.filter(v => v.propertyId === 'property-001' && v.status === 'scheduled'),
  ).toHaveLength(0)
  await visit(page, '/properties/property-001')
  await expect(page.getByRole('button', { name: 'Edit listing' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Schedule viewing' })).toHaveCount(0)
  expect(
    (await snapshot(page)).offers.filter(
      o => o.propertyId === 'property-001' && o.status === 'closed',
    ),
  ).toHaveLength(1)
})

test('withdrawal releases the property and preserves the decision trail', async ({ page }) => {
  await openOffer(page)
  await dialog(page).getByRole('button', { name: 'Accept & reserve' }).click()
  await expect(
    dialog(page).getByRole('button', { name: 'Withdraw offer', exact: true }),
  ).toBeVisible()
  await dialog(page).getByRole('button', { name: 'Withdraw offer', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(2)
  await dialog(page).getByRole('button', { name: 'Withdraw offer', exact: true }).click()
  await expect(dialog(page).getByRole('alert')).toContainText('at least 5 characters')
  await dialog(page).getByLabel('Decision reason').fill('Buyer changed their relocation plans.')
  await dialog(page).getByRole('button', { name: 'Withdraw offer', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(1)
  await expect(dialog(page).locator('.outcome-note')).toContainText('relocation plans')
  await page.reload()
  const state = await snapshot(page)
  expect(state.properties.find(p => p.id === 'property-001')?.status).toBe('available')
  expect(state.offers.find(o => o.id === 'offer-001')).toMatchObject({
    status: 'withdrawn',
    decisionNote: 'Buyer changed their relocation plans.',
  })
})

test('archive guard protects open work; notes are durable and searchable in history', async ({
  page,
}) => {
  await visit(page, '/properties/property-001')
  await page.getByRole('button', { name: 'Archive listing', exact: true }).click()
  await dialog(page).getByRole('button', { name: 'Archive listing', exact: true }).click()
  await expect(page.locator('.toast-error')).toContainText(
    'Resolve open offers and scheduled viewings',
  )
  expect((await snapshot(page)).properties.find(p => p.id === 'property-001')?.status).toBe(
    'available',
  )
  await page.getByRole('button', { name: 'Activity', exact: true }).click()
  await page
    .getByLabel('A little context goes a long way.')
    .fill('Buyer requested a quiet morning visit before their relocation.')
  await page.getByRole('button', { name: 'Add note', exact: true }).click()
  await expect(page.locator('.timeline')).toContainText('quiet morning visit')
  await visit(page, '/activity')
  await page.getByLabel('Search activity', { exact: true }).fill('quiet morning visit')
  await expect(page.locator('.timeline article')).toHaveCount(1)
  await page.locator('.event-link').click()
  await expect(page.getByRole('heading', { name: property, exact: true })).toBeVisible()
})

test('one-shot write failure leaves closing conditions unchanged and retry persists', async ({
  page,
}) => {
  await visit(page, '/settings')
  await page.getByRole('switch', { name: 'Fail the next request' }).click()
  await page.getByRole('link', { name: 'Offers & deals' }).click()
  await page.getByRole('button', { name: 'accepted', exact: true }).click()
  await page.locator('tbody .listing-cell').first().click()
  const inspection = dialog(page).getByRole('checkbox', { name: 'Inspection completed' })
  const before = await snapshot(page)
  const offer = before.offers.find(o => o.status === 'accepted' && !o.conditions.inspection)!
  // The first seeded accepted offer is the one with incomplete inspection.
  if (await inspection.isChecked()) {
    await dialog(page).getByRole('button', { name: 'Close offer details' }).click()
    await page.locator('tbody .listing-cell').last().click()
  }
  await dialog(page).getByRole('checkbox', { name: 'Inspection completed' }).click()
  await expect(dialog(page).getByRole('alert')).toContainText('connection was interrupted')
  await expect(
    dialog(page).getByRole('checkbox', { name: 'Inspection completed' }),
  ).not.toBeChecked()
  expect((await snapshot(page)).offers.find(o => o.id === offer.id)?.conditions.inspection).toBe(
    false,
  )
  await dialog(page).getByRole('checkbox', { name: 'Inspection completed' }).check()
  await expect(dialog(page).getByRole('checkbox', { name: 'Inspection completed' })).toBeChecked()
  await expect(dialog(page).locator('.closing-heading')).toContainText('2 / 3 complete')
  expect((await snapshot(page)).offers.find(o => o.id === offer.id)?.conditions.inspection).toBe(
    true,
  )
})

test('read failure retries and confirmed reset restores original records', async ({ page }) => {
  await visit(page, '/settings')
  await page.getByRole('switch', { name: 'Fail the next request' }).click()
  await page.getByRole('link', { name: 'Properties 24', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'A small interruption.' })).toBeVisible()
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.locator('.property-grid app-property-card')).toHaveCount(9)
  await visit(page, '/buyers/buyer-001?tab=activity')
  await page
    .getByLabel('A little context goes a long way.')
    .fill('Temporary context before resetting the agency.')
  await page.getByRole('button', { name: 'Add note', exact: true }).click()
  await expect(page.locator('.timeline')).toContainText('Temporary context')
  await visit(page, '/settings')
  await page.getByRole('button', { name: 'Reset demo workspace' }).click()
  await dialog(page).getByRole('button', { name: 'Cancel', exact: true }).click()
  expect((await snapshot(page)).activity.some(a => a.text.startsWith('Temporary context'))).toBe(
    true,
  )
  await page.getByRole('button', { name: 'Reset demo workspace' }).click()
  await dialog(page).getByRole('button', { name: 'Reset workspace', exact: true }).click()
  await expect(page.locator('.toast')).toContainText('Workspace reset')
  const state = await snapshot(page)
  expect([
    state.properties.length,
    state.buyers.length,
    state.viewings.length,
    state.offers.length,
    state.activity.length,
  ]).toEqual([24, 18, 26, 14, 102])
})

test('initial network interruption, incompatible saved state and unavailable storage recover explicitly', async ({
  page,
}) => {
  await page.route('**/sample-workspace.json', route =>
    route.fulfill({ status: 503, body: 'unavailable' }),
  )
  await page.goto('/overview')
  await expect(page.getByRole('button', { name: 'Reload workspace' })).toBeVisible()
  await page.unroute('**/sample-workspace.json')
  await page.getByRole('button', { name: 'Reload workspace' }).click()
  await expect(page.locator('.overview-metrics')).toBeVisible()
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open('haven-property-desk')
        request.onsuccess = () => {
          const db = request.result
          const tx = db.transaction('workspace', 'readwrite')
          tx.objectStore('workspace').put({ version: 0 }, 'data')
          tx.oncomplete = () => {
            db.close()
            resolve()
          }
          tx.onerror = () => reject(tx.error)
        }
      }),
  )
  await page.reload()
  await expect(page.locator('.storage-notice')).toContainText('Incompatible local data')
  expect((await snapshot(page)).properties).toHaveLength(24)
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', {
      get() {
        throw new Error('Storage disabled')
      },
    })
  })
  await page.reload()
  await expect(page.locator('.storage-notice')).toContainText('this session')
  await expect(page.locator('.overview-metrics')).toBeVisible()
})

test('keyboard search, dialog focus and mobile navigation keep all routes within the viewport', async ({
  page,
}) => {
  test.setTimeout(60000)
  const errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  await visit(page)
  await page.keyboard.press('/')
  await expect(page.getByLabel('Search workspace properties')).toBeFocused()
  await page.getByLabel('Search workspace properties').pressSequentially('Willow')
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/search=Willow/)
  await expect(page.locator('.property-grid app-property-card')).toHaveCount(1)
  const add = page.getByRole('button', { name: 'Add property', exact: true })
  await add.click()
  await expect(dialog(page)).toBeVisible()
  await page.keyboard.press('Shift+Tab')
  expect(await page.evaluate(() => !!document.activeElement?.closest('[role=dialog]'))).toBe(true)
  await page.keyboard.press('Escape')
  await expect(add).toBeFocused()
  for (const width of [320, 390, 768, 1024]) {
    await page.setViewportSize({ width, height: 900 })
    for (const route of [
      '/overview',
      '/properties',
      '/properties/property-001',
      '/buyers',
      '/buyers/buyer-001',
      '/viewings',
      '/offers',
      '/activity',
      '/settings',
    ]) {
      await visit(page, route)
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      )
      expect(overflow, `${route} at ${width}px`).toBe(false)
    }
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: 'Toggle navigation' }).click()
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toBeVisible()
  await page.getByRole('link', { name: 'Viewings', exact: true }).click()
  await expect(page).toHaveURL(/\/viewings/)
  await expect(page.getByRole('button', { name: 'Toggle navigation' })).toHaveAttribute(
    'aria-expanded',
    'false',
  )
  expect(errors).toEqual([])
})
