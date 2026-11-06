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

function notePageInputPath() {
  return path.resolve(__dirname, 'note-page.webc')
}

function homePageInputPath() {
  return path.resolve(__dirname, 'home-page.webc')
}

function layoutInputPath() {
  return path.resolve(__dirname, 'layout.webc')
}

function componentsPath() {
  return path.resolve(__dirname, 'components', '**.webc')
}

class WebCPageRenderer {
  constructor(websocketPort) {
    this.websocketPort = websocketPort
    this.notePageC = new WebC()
    this.notePageC.setBundlerMode(true)
    this.esbuildTransform = this.esbuildTransform.bind(this)
    this.notePageC.setTransform("esbuild", this.esbuildTransform)
    // https://github.com/11ty/webc/issues/92
    // normalized path is required for path provided to `defineComponents`
    this.notePageC.defineComponents(normalizePath(componentsPath()))
    this.notePageC.setInputPath(notePageInputPath())
    this.homePageC = new WebC()
    this.homePageC.setBundlerMode(true)
    this.homePageC.defineComponents(normalizePath(componentsPath()))
    this.homePageC.setInputPath(homePageInputPath())
    this.layoutC = new WebC()
    this.layoutC.setInputPath(layoutInputPath())
  }

  async esbuildTransform(content) {
    let tmpDir
    let finalJs
    try {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'mote'))
      let jsPath = path.join(tmpDir, 'input.js')
      await fs.writeFile(jsPath, content)
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
      fs.rm(tmpDir, { recursive: true })
    }

    return finalJs
  }

  async getCompiledNotePage() {
    if (this.compiled) {
      return this.compiled
    }

    let { html, css, js } = await this.notePageC.compile()

    let finalCss = cssmin(css.join("\n"))
    let finalJs = [...js].join("\n")


    this.compiled = {
      html,
      css: finalCss,
      js: finalJs
    }

    return this.compiled
  }

  async render(path) {
    let { content, title } = mdRenderer.render(path)
    let { html, css, js } = await this.getCompiledNotePage()

    let { html: finalHtml } = await this.layoutC.compile({
      data: { html, css, js, content: `<div class="content">${content}</div>`, title }
    })

    return finalHtml
  }

  async renderHome(lists) {
    const { html, css, js } = await this.homePageC.compile({ data: lists })
    const { html: finalHtml } = await this.layoutC.compile({
      data: { html, css: cssmin(css.join("\n")), js: [...js].join("\n"), content: '', title: 'Mote' }
    })
    return finalHtml
  }
}

export default WebCPageRenderer
