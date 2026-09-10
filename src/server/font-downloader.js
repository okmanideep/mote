import fetch from 'node-fetch'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const fontsDirectory = path.join(__dirname, 'assets', 'fonts')

// Keep these URLs aligned with the @font-face declarations in css/fonts.css.
const fontUrls = [
  
"https://fonts.gstatic.com/s/inter/v20/UcCm3FwrK3iLTcvnUwkT9mI1F55MKw.woff2",
  "https://fonts.gstatic.com/s/inter/v20/UcCm3FwrK3iLTcvnUwAT9mI1F55MKw.woff2",
  "https://fonts.gstatic.com/s/inter/v20/UcCm3FwrK3iLTcvnUwgT9mI1F55MKw.woff2",
  "https://fonts.gstatic.com/s/inter/v20/UcCm3FwrK3iLTcvnUwcT9mI1F55MKw.woff2",
  "https://fonts.gstatic.com/s/inter/v20/UcCm3FwrK3iLTcvnUwsT9mI1F55MKw.woff2",
  "https://fonts.gstatic.com/s/inter/v20/UcCm3FwrK3iLTcvnUwoT9mI1F55MKw.woff2",
  "https://fonts.gstatic.com/s/inter/v20/UcCm3FwrK3iLTcvnUwQT9mI1F54.woff2",
  "https://fonts.gstatic.com/s/inter/v20/UcCo3FwrK3iLTcvvYwYZ8UA3J58.woff2",
  "https://fonts.gstatic.com/s/inter/v20/UcCo3FwrK3iLTcvmYwYZ8UA3J58.woff2",
  "https://fonts.gstatic.com/s/inter/v20/UcCo3FwrK3iLTcvuYwYZ8UA3J58.woff2",
  "https://fonts.gstatic.com/s/inter/v20/UcCo3FwrK3iLTcvhYwYZ8UA3J58.woff2",
  "https://fonts.gstatic.com/s/inter/v20/UcCo3FwrK3iLTcvtYwYZ8UA3J58.woff2",
  "https://fonts.gstatic.com/s/inter/v20/UcCo3FwrK3iLTcvsYwYZ8UA3J58.woff2",
  "https://fonts.gstatic.com/s/inter/v20/UcCo3FwrK3iLTcviYwYZ8UA3.woff2",
  "https://fonts.gstatic.com/s/newsreader/v26/cY9CfjOCX1hbuyalUrK439vCgYhCBJWxZCPp.woff2",
  "https://fonts.gstatic.com/s/newsreader/v26/cY9CfjOCX1hbuyalUrK439vCgIhCBJWxZCPp.woff2",
  "https://fonts.gstatic.com/s/newsreader/v26/cY9CfjOCX1hbuyalUrK439vCjohCBJWxZA.woff2",
  "https://fonts.gstatic.com/s/newsreader/v26/cY9AfjOCX1hbuyalUrK439HyjIJFJpeBZQ.woff2",
  "https://fonts.gstatic.com/s/newsreader/v26/cY9AfjOCX1hbuyalUrK439DyjIJFJpeBZQ.woff2",
  "https://fonts.gstatic.com/s/newsreader/v26/cY9AfjOCX1hbuyalUrK4397yjIJFJpc.woff2",
  "https://fonts.gstatic.com/s/sourcecodepro/v31/HI_QiYsKILxRpg3hIP6sJ7fM7PqlONvZlMIFxGC8NAU.woff2",
  "https://fonts.gstatic.com/s/sourcecodepro/v31/HI_QiYsKILxRpg3hIP6sJ7fM7PqlONvQlMIFxGC8NAU.woff2",
  "https://fonts.gstatic.com/s/sourcecodepro/v31/HI_QiYsKILxRpg3hIP6sJ7fM7PqlONvYlMIFxGC8NAU.woff2",
  "https://fonts.gstatic.com/s/sourcecodepro/v31/HI_QiYsKILxRpg3hIP6sJ7fM7PqlONvXlMIFxGC8NAU.woff2",
  "https://fonts.gstatic.com/s/sourcecodepro/v31/HI_QiYsKILxRpg3hIP6sJ7fM7PqlONvblMIFxGC8NAU.woff2",
  "https://fonts.gstatic.com/s/sourcecodepro/v31/HI_QiYsKILxRpg3hIP6sJ7fM7PqlONvalMIFxGC8NAU.woff2",
  "https://fonts.gstatic.com/s/sourcecodepro/v31/HI_QiYsKILxRpg3hIP6sJ7fM7PqlONvUlMIFxGC8.woff2",
  "https://fonts.gstatic.com/s/sourcecodepro/v31/HI_SiYsKILxRpg3hIP6sJ7fM7PqlMOvWnsUnxlC9.woff2",
  "https://fonts.gstatic.com/s/sourcecodepro/v31/HI_SiYsKILxRpg3hIP6sJ7fM7PqlOevWnsUnxlC9.woff2",
  "https://fonts.gstatic.com/s/sourcecodepro/v31/HI_SiYsKILxRpg3hIP6sJ7fM7PqlMevWnsUnxlC9.woff2",
  "https://fonts.gstatic.com/s/sourcecodepro/v31/HI_SiYsKILxRpg3hIP6sJ7fM7PqlPuvWnsUnxlC9.woff2",
  "https://fonts.gstatic.com/s/sourcecodepro/v31/HI_SiYsKILxRpg3hIP6sJ7fM7PqlMuvWnsUnxlC9.woff2",
  "https://fonts.gstatic.com/s/sourcecodepro/v31/HI_SiYsKILxRpg3hIP6sJ7fM7PqlM-vWnsUnxlC9.woff2",
  "https://fonts.gstatic.com/s/sourcecodepro/v31/HI_SiYsKILxRpg3hIP6sJ7fM7PqlPevWnsUnxg.woff2"]

async function fontExists(filename) {
  try {
    return (await fs.stat(path.join(fontsDirectory, filename))).size > 0
  } catch {
    return false
  }
}

async function downloadFont(url) {
  const filename = path.basename(new URL(url).pathname)
  if (await fontExists(filename)) return

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Could not download ${filename}: ${response.status} ${response.statusText}`)
  }

  const temporaryPath = path.join(fontsDirectory, `.${filename}.tmp`)
  await fs.writeFile(temporaryPath, Buffer.from(await response.arrayBuffer()))
  await fs.rename(temporaryPath, path.join(fontsDirectory, filename))
}

export default async function ensureFonts() {
  await fs.mkdir(fontsDirectory, { recursive: true })
  await Promise.all(fontUrls.map(downloadFont))
}
