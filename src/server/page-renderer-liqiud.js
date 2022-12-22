import { Liquid } from 'liquidjs'
import cssmin from 'cssmin'
import esbuild from 'esbuild'
import mdRenderer from './md-renderer.js'
import path from 'node:path'
import * as url from 'url';

const __dirname = url.fileURLToPath(new URL('.', import.meta.url));
function liquidRootPaths() {
  return [
    path.resolve(__dirname, '..', 'client'),
    path.resolve(__dirname, '..', 'client', 'css'),
  ]
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

class LiquidPageRenderer {
  constructor(websocketPort) {
    this.engine = new Liquid({
        root: liquidRootPaths(),
    })
    this.engine.registerFilter('cssmin', cssmin)
    this.template = this.engine.parseFileSync("default.liquid")
    const buildOutput = esbuild.buildSync({
      entryPoints: clientJsPaths(),
      write: false,
      bundle: true,
      platform: 'browser',
      nodePaths: nodeModulesPaths(),
      format: 'iife',
      outdir: 'out',
    })
    this.js = buildOutput.outputFiles[0].text.replace('{{WEBSOCKET_PORT}}', `${websocketPort}`)
  }

  async render(path) {
    const content = mdRenderer.render(path)
    return await this.engine.render(this.template, {content, js: this.js})
  }
}

export default LiquidPageRenderer
