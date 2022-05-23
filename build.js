import {Liquid} from 'liquidjs'
import cssmin from 'cssmin'
import fs from 'fs'
import path from 'path'
import {URL} from 'url'
const __dirname = new URL('.', import.meta.url).pathname;

function writeIndexHtml(html) {
  const publicDirPath = path.resolve(__dirname, 'public')
  fs.rmSync(publicDirPath, {recursive: true})
  fs.mkdirSync(publicDirPath)

  const filePath = path.resolve(__dirname, 'public/index.html')

  fs.writeFileSync(filePath, html, {
    encoding: "utf8",
    flag: "w",
  })
}

const engine = new Liquid({
  root: ['./src/client/', './src/client/css/'],
})
engine.registerFilter('cssmin', cssmin)
engine.renderFile("default.liquid", {content: "content"})
  .then(writeIndexHtml)
