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
  await fs.writeFile(path.join(dir, 'long.md'), `# Long note\n\n${Array.from({ length: 45 }, (_, index) => `Paragraph ${index + 1}: enough content to make this note scroll on screen.`).join('\n\n')}`)
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
  const headingMargins = await page.locator('.content h1').evaluate(element => {
    const style = getComputedStyle(element)
    return { top: parseFloat(style.marginTop), bottom: parseFloat(style.marginBottom) }
  })
  expect(headingMargins.top).toBeGreaterThan(65)
  expect(headingMargins.bottom).toBeLessThan(20)
  await expect(page.locator('.content')).toContainText('Hello from Mote.')
  const themeToggle = page.getByRole('button', { name: 'Toggle color theme' })
  await expect(themeToggle).toBeVisible()
  await expect(themeToggle).toHaveCSS('opacity', '0.55')
  await expect(themeToggle.locator('.sun-icon')).toBeVisible()
  await expect(themeToggle.locator('.moon-icon')).toBeHidden()
  await expect(themeToggle).toHaveAttribute('aria-pressed', 'false')
  await expect(themeToggle).toHaveCSS('-webkit-tap-highlight-color', 'rgba(0, 0, 0, 0)')
  await expect(themeToggle).toHaveCSS('width', '44px')
  await expect(page.locator('theme-switch')).toHaveCSS('position', 'static')
  await themeToggle.click()
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'dark')
  await expect(themeToggle).toHaveAttribute('aria-pressed', 'true')
  await expect(themeToggle.locator('.sun-icon')).toBeHidden()
  await expect(themeToggle.locator('.moon-icon')).toBeVisible()
  const homeLink = page.getByRole('link', { name: 'Mote home' })
  await expect(homeLink).toBeVisible()
  await expect(homeLink).toHaveAttribute('href', '/')
  await expect(homeLink.locator('img')).toBeVisible()
  await expect(homeLink.locator('img')).toHaveAttribute('src', '/favicon.png?v=2')
  await expect(homeLink.locator('img')).toHaveCSS('width', '28px')
  await expect(themeToggle.locator('.sun-icon')).toHaveCSS('width', '24px')
  const controlCenters = await page.evaluate(() => {
    const logo = document.querySelector('.home-link img').getBoundingClientRect()
    const theme = document.querySelector('theme-switch button').getBoundingClientRect()
    return { logo: logo.top + logo.height / 2, theme: theme.top + theme.height / 2 }
  })
  expect(Math.abs(controlCenters.logo - controlCenters.theme)).toBeLessThan(1)
  const contentTopPadding = await page.locator('.content').evaluate(element => parseFloat(getComputedStyle(element).paddingTop))
  expect(contentTopPadding).toBeGreaterThan(12)
  await homeLink.click()
  await expect(page).toHaveURL(`${server.url}/`)
  await expect(page.getByRole('heading', { name: 'mote' })).toBeVisible()
  await expect(page.locator('[data-recent-list="viewed"] li').first().locator('span')).toHaveText('Welcome')
})

test('returns 404 for a missing note', async ({ request }) => {
  const response = await request.get(`${server.url}/missing`)
  expect(response.status()).toBe(404)
})

test('note page header scrolls away with the note', async ({ page }) => {
  await page.goto(`${server.url}/long`)
  const header = page.locator('.page-header')
  await expect(header).toBeVisible()
  await expect(header).toHaveCSS('position', 'absolute')
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  await expect.poll(() => header.evaluate(element => element.getBoundingClientRect().bottom)).toBeLessThan(0)
})

test('note theme toggle is visible before JavaScript runs', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto(`${server.url}/welcome`)
  await expect(page.getByRole('button', { name: 'Toggle color theme' })).toBeVisible()
  await context.close()
})

test('home page shows recent views and recently modified notes', async ({ page }) => {
  await fs.writeFile(path.join(dir, 'older.md'), '# Older')
  await fs.writeFile(path.join(dir, 'newer.md'), '# Newer')
  const old = new Date(Date.now() - 60_000)
  await fs.utimes(path.join(dir, 'older.md'), old, old)

  await page.goto(server.url)
  const logo = page.getByRole('heading', { name: 'mote' })
  await expect(logo).toBeVisible()
  await expect(logo).toHaveCSS('font-family', /Newsreader/)
  const themeToggle = page.getByRole('button', { name: 'Toggle color theme' })
  await expect(themeToggle).toBeVisible()
  await expect(themeToggle).toHaveCSS('opacity', '0.55')
  await expect(page.locator('header')).toHaveCSS('align-items', 'center')
  await expect(page.locator('header')).toHaveCSS('justify-content', 'space-between')
  await expect(themeToggle).toHaveCSS('position', 'static')
  await expect(page.locator('header .brand')).toBeVisible()
  await expect(themeToggle.locator('.sun-icon')).toBeVisible()
  await expect(themeToggle).toHaveAttribute('aria-pressed', 'false')
  await themeToggle.click()
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'dark')
  await expect(themeToggle).toHaveAttribute('aria-pressed', 'true')
  await expect(themeToggle.locator('.sun-icon')).toBeHidden()
  await expect(themeToggle.locator('.moon-icon')).toBeVisible()
  await themeToggle.click()
  await expect(page.locator('body')).toHaveAttribute('data-theme', 'light')
  await expect(themeToggle.locator('.sun-icon')).toBeVisible()
  await expect(themeToggle.locator('.moon-icon')).toBeHidden()
  await expect(page.getByRole('heading', { name: 'Recently modified · Notes' })).toBeVisible()
  const modified = page.locator('section').nth(1)
  await expect(modified.locator('li').first()).toContainText('newer.md')
  await expect(modified.locator('li').first().locator('small')).toHaveText(/ago|just now/)
  await expect(modified.locator('li').first().locator('small')).not.toContainText('~/')
  await expect(modified.locator('li')).toHaveCount(4)

  await page.goto(`${server.url}/newer`)
  await page.goBack()
  const viewed = page.locator('section').first()
  await expect(viewed.locator('li').first().locator('span')).toHaveText('Newer')
  await expect(viewed.locator('li').first().locator('small')).toContainText('newer.md')
})

test('home page remains usable on a narrow mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(server.url)
  await expect(page.getByRole('heading', { name: 'mote' })).toBeVisible()
  await expect(page.locator('body')).toHaveJSProperty('scrollWidth', 375)
  const layout = await page.locator('main').evaluate(element => ({
    columns: getComputedStyle(element).gridTemplateColumns.split(' ').length,
    width: element.getBoundingClientRect().width
  }))
  expect(layout.columns).toBe(1)
  expect(layout.width).toBeLessThanOrEqual(375)
})

test('theme switcher returns to its original appearance after mobile taps', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })
  const page = await context.newPage()
  for (const route of ['/', '/welcome']) {
    await page.goto(`${server.url}${route}`)
    const button = page.getByRole('button', { name: 'Toggle color theme' })
    const initial = await button.evaluate(element => ({
      opacity: getComputedStyle(element).opacity,
      color: getComputedStyle(element.querySelector('.sun-icon')).fill
    }))
    await button.tap()
    await expect(page.locator('body')).toHaveAttribute('data-theme', 'dark')
    await button.tap()
    await expect(page.locator('body')).toHaveAttribute('data-theme', 'light')
    await expect(button.locator('.sun-icon')).toBeVisible()
    const returned = await button.evaluate(element => ({
      opacity: getComputedStyle(element).opacity,
      color: getComputedStyle(element.querySelector('.sun-icon')).fill
    }))
    expect(returned).toEqual(initial)
  }
  await context.close()
})

test('home and note pages use the same base colors in both themes', async ({ page }) => {
  const colorsFor = async (route, theme) => {
    await page.goto(`${server.url}${route}`)
    const toggle = page.getByRole('button', { name: 'Toggle color theme' })
    if (theme === 'dark') await toggle.click()
    await page.waitForTimeout(250)
    return page.evaluate(isHome => ({
      background: getComputedStyle(document.body).backgroundColor,
      bodyFont: getComputedStyle(document.body).fontFamily,
      themeIcon: getComputedStyle(document.querySelector('theme-switch button')).color,
      text: getComputedStyle(document.querySelector(isHome ? '.wrap' : '.content')).color,
      heading: getComputedStyle(document.querySelector('h1')).color,
      border: isHome
        ? getComputedStyle(document.querySelector('ul')).borderTopColor
        : getComputedStyle(document.querySelector('h1')).borderBottomColor
    }), route === '/')
  }

  for (const theme of ['light', 'dark']) {
    const homeColors = await colorsFor('/', theme)
    const noteColors = await colorsFor('/welcome', theme)
    expect(homeColors).toEqual(noteColors)
    expect(homeColors.bodyFont).toMatch(/Inter/)
  }
})
