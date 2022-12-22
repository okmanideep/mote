import { WebC } from '@11ty/webc'
import mdRenderer from './md-renderer.js'
import path from 'node:path'
import esbuild from 'esbuild'
import * as url from 'url';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

function componentsPath() {
  return path.resolve(__dirname, '..', 'client', 'components', '**.webc')
}

function pageComponentPath() {
  return path.resolve(__dirname, '..', 'client', 'page.webc')
}

function indexComponentPath() {
  return path.resolve(__dirname, '..', 'client', 'index.webc')
}

function clientJsPaths() {
  return [
    path.resolve(__dirname, '..', 'client', 'js', 'index.js')
  ]
}

function nodeModulesPaths() {
  return [
    path.resolve(__dirname, '..', '..', 'node_modules')
  ]
}

class WebCPageRenderer {
  constructor(websocketPort) {
    this.websocketPort = websocketPort
    this.pageC = new WebC()
    this.pageC.setBundlerMode(true)
    this.pageC.defineComponents(componentsPath())
    this.pageC.setInputPath(pageComponentPath())

    this.indexC = new WebC()
    this.indexC.setInputPath(indexComponentPath())
    const buildOutput = esbuild.buildSync({
      entryPoints: clientJsPaths(),
      write: false,
      bundle: true,
      platform: 'browser',
      nodePaths: nodeModulesPaths(),
      format: 'iife',
      outdir: 'out',
    })
    this.indexJs = buildOutput.outputFiles[0].text.replace('{{WEBSOCKET_PORT}}', `${websocketPort}`)
  }
  async render(path) {
    let content = mdRenderer.render(path)
    let {html, css, js} = await this.pageC.compile({
      data: {
        content
      }
    })

    let finalCss = css.join("\n")
    let webcBundledJs = [...js].join("\n")

    let {html: finalHtml } = await this.indexC.compile({
      data: {
        html, css: finalCss, webcBundledJs, indexJs: this.indexJs
      }
    })

    return finalHtml
  }
}

export default WebCPageRenderer
