import { kill } from 'node:process'
import find from 'find-process'

async function stop() {
  const processes = await find('name', 'mote-server')
  for (process of processes) {
    kill(process.pid)
    console.log('Mote Stopped 🔴')
  }
}

export default stop
