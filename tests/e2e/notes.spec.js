import { test, expect } from '@playwright/test'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { startFixture } from './server.fixture.js'

let dir
let server

test.beforeAll(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'mote-e2e-'))
  await fs.writeFile(path.join(dir, 'welcome.md'), '# Welcome\n\nHello from Mote.')
  server = await startFixture(dir)
})
test.afterAll(async () => {
  await server?.close()
  if (dir) await fs.rm(dir, { recursive: true, force: true })
})

test('serves and renders a markdown note in the browser', async ({ page }) => {
  await page.goto(`${server.url}/welcome`)
  await expect(page).toHaveTitle('Welcome')
  await expect(page.locator('.content h1')).toHaveText('Welcome')
  await expect(page.locator('.content')).toContainText('Hello from Mote.')
})

test('returns 404 for a missing note', async ({ request }) => {
  const response = await request.get(`${server.url}/missing`)
  expect(response.status()).toBe(404)
})
