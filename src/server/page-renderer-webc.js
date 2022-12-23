import { WebC } from '@11ty/webc'
import cssmin from 'cssmin'
import mdRenderer from './md-renderer.js'
import path from 'node:path'
import esbuild from 'esbuild'
import os from 'node:os'
import * as url from 'url'
import fs from 'node:fs/promises'
import normalizePath from 'normalize-path'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

function nodeModulesPaths() {
  return [
    path.resolve(__dirname, '..', '..', 'node_modules')
  ]
}

function pageInputPath() {
  return path.resolve(__dirname, 'page.webc')
}

function indexInputPath() {
  return path.resolve(__dirname, 'index.webc')
}

function componentsPath() {
  return path.resolve(__dirname, 'components', '**.webc')
}

class WebCPageRenderer {
  constructor(websocketPort) {
    this.websocketPort = websocketPort
    this.pageC = new WebC()
    this.pageC.setBundlerMode(true)
    // https://github.com/11ty/webc/issues/92
    // normalized path is required for path provided to `defineComponents`
    this.pageC.defineComponents(normalizePath(componentsPath()))
    this.pageC.setInputPath(pageInputPath())
    console.log({globalComponents: this.pageC.globalComponents})

    this.indexC = new WebC()
    this.indexC.setInputPath(indexInputPath())
  }

  async getCompiledResults() {
    if (this.compiled) {
      return this.compiled
    }

    let { html, css, js } = await this.pageC.compile()

    let finalCss = cssmin(css.join("\n"))
    let webcBundledJs = [...js].join("\n")

    let tmpDir
    let finalJs
    try {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mote'))
      let jsPath = path.join(tmpDir, 'webc-bundled.js')
      await fs.writeFile(jsPath, webcBundledJs)
      let buildOutput = esbuild.buildSync({
        entryPoints: [jsPath],
        write: false,
        bundle: true,
        platform: 'browser',
        nodePaths: nodeModulesPaths(),
        format: 'iife',
        outdir: 'out',
      })
      finalJs = buildOutput.outputFiles[0].text.replace("{{WEBSOCKET_PORT}}", `${this.websocketPort}`)
    } catch (e) {
      console.error(e)
    } finally {
      fs.rm(tmpDir, {recursive: true})
    }

    this.compiled = {
      html,
      css: finalCss,
      js: finalJs
    }

    return this.compiled
  }

  async render(path) {
    let content = mdRenderer.render(path)
    let { html, css, js } = await this.getCompiledResults()

    let { html: finalHtml } = await this.indexC.compile({
      data: {
        html, css, js, content
      }
    })

    return finalHtml
  }
}

export default WebCPageRenderer
