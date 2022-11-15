#! /usr/bin/env node

import { program } from 'commander'
import start from './start.js'
import stop from './stop.js'
import open from './open.js'

async function restart() {
  await stop()
  await start()
}

program
  .command('start')
  .description('Start the mote server if it\'s not already started')
  .action(start)

program
  .command('stop')
  .description('Stop the mote server if it is running')
  .action(stop)

program
  .command('restart')
  .description('Restart the mote server')
  .action(restart)

program
  .command('open')
  .description('Open a markdown file in browser')
  .argument('<path>', 'path of the markdown file')
  .action(open)

program.parse()
