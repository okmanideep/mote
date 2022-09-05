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
import process from "node:process"
import fs from "node:fs/promises"

function getOsConfigDir() {
  if (process.platform === 'win32') {
    return path.resolve(process.env.HOME, "AppData/Local")
  } else {
    return path.resolve(process.env.HOME, ".config")
  }
}

async function getConfig() {
  const configFilePath = path.join(getOsConfigDir(), "mote", "config.json")
  return JSON.parse(await fs.readFile(configFilePath))
}

export default getConfig
