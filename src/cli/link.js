import { execFile } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'
import conf from '../server/conf.js'
import start from './start.js'

const execFileAsync = promisify(execFile)

export function tailscaleLinks(status, sitePort, pagePath) {
  const links = new Set()
  for (const [address, web] of Object.entries(status?.Web ?? {})) {
    const endpoint = new URL(`http://${address}`)
    const listener = status.TCP?.[endpoint.port || '80']
    const scheme = listener?.HTTPS ? 'https' : listener?.HTTP ? 'http' : null
    if (!scheme) continue

    for (const [mount, handler] of Object.entries(web.Handlers ?? {})) {
      if (!handler.Proxy) continue
      let target
      try {
        target = new URL(handler.Proxy)
      } catch {
        continue
      }
      if (target.protocol !== 'http:' ||
          !['localhost', '127.0.0.1', '[::1]'].includes(target.hostname) ||
          Number(target.port || 80) !== Number(sitePort) ||
          target.pathname !== '/' || target.search || target.hash) continue

      links.add(new URL(`${mount.replace(/\/$/, '')}${pagePath}`, `${scheme}://${address}`).href)
    }
  }
  for (const foreground of Object.values(status?.Foreground ?? {})) {
    for (const link of tailscaleLinks(foreground, sitePort, pagePath)) links.add(link)
  }
  return [...links]
}

export async function getLinks(filePath, sitePort, run = execFileAsync) {
  const pagePath = `/p/${encodeURIComponent(path.resolve(filePath))}`
  const localhost = `http://localhost:${sitePort}${pagePath}`
  try {
    const { stdout } = await run('tailscale', ['serve', 'status', '--json'], { timeout: 5000 })
    return { localhost, tailscale: tailscaleLinks(JSON.parse(stdout), sitePort, pagePath) }
  } catch {
    return { localhost, tailscale: [], warning: 'Could not read Tailscale Serve status; only the localhost link is available.' }
  }
}

export default async function linkFile(filePath) {
  try {
    const file = await fs.stat(path.resolve(filePath))
    if (!file.isFile()) throw new Error('Path must be a file')
    await start({ disableLogging: true })
    const config = await conf.get()
    const links = await getLinks(filePath, config.site_port)
    console.log(links.localhost)
    for (const link of links.tailscale) console.log(link)
    if (links.warning) console.error(links.warning)
    else if (!links.tailscale.length) console.error(`Tailscale Serve is not proxying Mote's port ${config.site_port}.`)
  } catch (error) {
    console.error(`Could not get Mote link: ${error.message}`)
    process.exitCode = 1
  }
}
