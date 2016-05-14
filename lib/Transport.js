const WebSocket = require('ws')
const WebSocketServer = require('ws').Server
const http = require('http')
const util = require('util')
const EventEmitter = require('./EventEmitter')
const uuid = require('uuid')

const ResponseQueue = {}
const ResponseQueueTimeout = 5000
let ResponseQueueWatchdogRunning = false

class RPC {
  constructor(ws) {
    this.ws = ws
  }

  call(_method, _args) {
    let args = new Array(arguments.length)
    for(let n = 0; n < args.length; n++)
      args[n] = arguments[n]

    let id = uuid.v4()
    let method = args.shift()

    return new Promise((resolve, reject) => {
      ResponseQueue[id] = {
        timestamp: new Date().getTime() + ResponseQueueTimeout,
        resolve: resolve,
        reject: reject
      }

      this.ws.send(JSON.stringify({
        id: id,
        method: method,
        args: args
      }))
    })
  }

  emit(_method, _args) {
    let args = new Array(arguments.length)
    for(let n = 0; n < args.length; n++)
      args[n] = arguments[n]

    let id = uuid.v4()
    let method = args.shift()

    this.ws.send(JSON.stringify({
      id: id,
      method: method,
      args: args
    }))
  }
}

class Transport extends EventEmitter {

  constructor() {
    super()
    this.mode = 'none'
    this.ws = null

    if(!ResponseQueueWatchdogRunning)
      startWatchdog()
  }

  // ---------------------------------------------------------------------------
  listen(port, cb) {
    this.mode = 'server'
    this.server = http.createServer()
    this.server.listen(port, cb)

    this.ws = new WebSocketServer({ server: this.server})
    this.ws.on('connection', (ws) => {
      ws.rpc = new RPC(ws)
      ws.on('message', message => this.onMessage(message, ws))
      this.emit('connection', ws)
    })
  }

  connect(target) {
    this.mode = 'client'
    this.ws = new WebSocket(util.format('ws://%s/', target))
    this.ws.on('open', _ => { this.emit('open') })
    this.ws.on('message', message => this.onMessage(message, this.ws))
    this.rpc = new RPC(this.ws)
  }

  onMessage(message, ws) {
    //console.log('Transport.onMessage: ', message)
    let msg = JSON.parse(message)

    if(msg.id in ResponseQueue && msg.method.startsWith('__')) {
      let fn = msg.method == '__resolve' ? ResponseQueue[msg.id].resolve : ResponseQueue[msg.id].reject
      delete ResponseQueue[msg.id]
      fn(msg.value)
      return
    }

    const params = [msg.method].concat(msg.args).concat(
      (value) => {
        // rpc resolve handler
        ws.send(JSON.stringify({
          id: msg.id,
          method: '__resolve',
          value: value
        }))
      },
      (value) => {
        // rpc reject handler
        ws.send(JSON.stringify({
          id: msg.id,
          method: '__reject',
          value: value
        }))
      },
      ws.rpc)

    this.emit.apply(this, params)
  }

}

function startWatchdog() {
  ResponseQueueWatchdogRunning = true
  // ResponseQueue cleanup watchdog
  setInterval(() => {
    const now = new Date().getTime()
    const list = Object.keys(ResponseQueue).filter(id => now > ResponseQueue[id].timestamp)
    list.forEach(id => {
      ResponseQueue[id].reject('watchdog.timeout')
      delete ResponseQueue[id]
    })
  }, 1000)
}

module.exports = Transport
