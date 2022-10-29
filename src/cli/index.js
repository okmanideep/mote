#! /usr/bin/env node

import { program } from 'commander'
import start from './start.js'
import stop from './stop.js'

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

program.parse()
