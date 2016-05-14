const path = require('path')
const http = require('http')
const util = require('util')
const Transport = require('./Transport')

class Broker {

  constructor() {
    this.transport = new Transport()
    this.clients = []
    this.runners = []
  }

  listen(port, cb) {
    this.transport.listen(port, cb)

    this.transport.on('registerClient', (id, resolve, reject, rpc) => {
      this.clients.push({
        id: id,
        rpc: rpc
      })
      resolve('ok')
    })

    this.transport.on('registerRunner', (id, tags, resolve, reject, rpc) => {
      this.runners.push({
        id: id,
        tags: tags,
        rpc: rpc,
        executions: 0
      })
      resolve('ok')
    })

    this.transport.on('executeCode', (code, params, tags, resolve, reject) => {
      let runner = this.getBestRunner(tags)

      if(!runner)
        return reject('No available runners')

      runner.rpc.call('executeCode', code, params).then(resolve).catch(reject)
    })
  }

  getBestRunner(tags) {
    let runners = this.runners.filter(runner => tags.filter(tag => runner.tags.indexOf(tag) != -1).length == tags.length)

    if(runners.length == 0)
      return

    runners.sort((a, b) => (a.executions - b.executions))

    let best = runners.shift()
    best.executions++
    return best
  }

}

module.exports = Broker
