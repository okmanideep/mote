/**
* Mote Config file for different operating systems
* Windows: ~/AppData/Local/mote/config.json
* Linux, MacOs: ~/.config/mote/config.json
*
* Server will fail to start if the config file is not found
* or accessible
*/

/*
Example configuration 
{
  "site_port": 3000, // http://localhost:<site_port>/file_name serves the HTML
  "websocket_port": 8383, // file changes are communited to browser using this port
  "motes_dir": "~/Dropbox/notes/"
}
*/

import path from "node:path"
import envPaths from "env-paths"
import process from "node:process"
import fs from "node:fs/promises"

async function getConfig() {
  const paths = envPaths('mote', { suffix: '' })
  const configFilePath = path.join(paths.config, "config.json")
  return JSON.parse(await fs.readFile(configFilePath))
}

export default getConfig
