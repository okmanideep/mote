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
import fs from "node:fs/promises"
import prompt from 'prompt'
import os from 'node:os'

async function getConfig() {
  const configFilePath = _configFilePath()
  return JSON.parse(await fs.readFile(configFilePath))
}

async function doesValidConfigExists() {
  let config
  try {
    config = await getConfig()
  } catch(e) {
    return false
  }

  const motesDirPath = path.join(config['motes_dir'], '.')
  let motesDirExists = false
  try {
    await fs.access(motesDirPath)
    motesDirExists = true
  } catch(e) {
    motesDirExists = false
  }

  return typeof config['site_port'] === 'number' && 
    config['site_port'] > 1023 &&
    typeof config['websocket_port'] === 'number' &&
    config['websocket_port'] > 1023 &&
    config['site_port'] !== config['websocket_port'] &&
    motesDirExists
}

async function writeConfig({sitePort, websocketPort, motesDir }) {
  const paths = envPaths('mote', { suffix: '' })
  // make sure the directory exists
  try {
    await fs.mkdir(paths.config, { recursive: true })
  } catch (e) {
    if (e.code !== 'EEXIST') {
      throw e
    }
  }

  let configFilePath = path.join(paths.config, "config.json")

  const configAsJsonString = JSON.stringify({
    "site_port": sitePort,
    "websocket_port": websocketPort,
    "motes_dir": motesDir
  })

  await fs.writeFile(configFilePath, configAsJsonString, 'utf8')
}

async function setupConfig() {
  prompt.start()
  let current = {sitePort: 3000, motesDir: '~/Documents/notes/', websocketPort: 8383}
  try {
	  const currentConfig = await getConfig()
    current = {
      sitePort: currentConfig.site_port,
      motesDir: currentConfig.motes_dir,
      websocketPort: currentConfig.websocket_port
    }
	} catch (e) {
    // do nothing
  }
  const { sitePort, websocketPort, motesDir } = await prompt.get({
    properties: {
      sitePort: {
        description: 'Website Port',
        required: true,
        default: current.sitePort,
        type: 'number',
        conform: (value) => {
          return value > 1023
        }
      },
      websocketPort: {
        description: 'Websocket Port for Browser<->Server Communication',
        default: current.websocketPort,
        type: 'number',
        conform: (value) => {
          return value > 1023
        }
      },
      motesDir: {
        description: 'Notes Directory',
        type: 'string',
        required: true,
        default: current.motesDir,
        before: (value) => {
          return value.replace('~', os.homedir())
        }
      }
    }
  })

  await writeConfig({ sitePort, websocketPort, motesDir })
}

function _configFilePath() {
  const paths = envPaths('mote', { suffix: '' })
  return path.join(paths.config, "config.json")
}

export default {
  get: getConfig,
  exists: doesValidConfigExists,
  setup: setupConfig
}
