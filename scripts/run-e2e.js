import { chromium } from '@playwright/test'
import { access } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const executable = chromium.executablePath()

try {
  await access(executable)
} catch {
  console.log('Playwright Chromium is not installed; installing it now...')
  execFileSync('npx', ['playwright', 'install', 'chromium'], { cwd: root, stdio: 'inherit' })
}

execFileSync('npx', ['playwright', 'test'], { cwd: root, stdio: 'inherit' })
