const Transport = require('./Transport')
const uuid = require('uuid')
const util = require('util')

class Client {

  constructor(broker, tags) {
    this.id = 'c-' + uuid.v4()
    this.tags = tags ? tags : []

    if(broker)
      this.connect(broker)
  }

  connect(broker) {
    this.transport = new Transport()
    this.transport.connect(broker)
    this.transport.on('open', () => {
      this.transport.rpc.call('registerClient', this.id).catch(_ => {
        console.log('error while registering to the broker')
      })
    })
  }

  run(_fn) {
    let self = this
    let args = new Array(arguments.length)
    for(let n = 0; n < arguments.length; n++)
      args[n] = arguments[n]

    let fn = arguments[arguments.length - 1]
    let match = fn.toString().match(/(.+?)?\((.+?)\)[^]*?\{([^]*)}/)
    let paramNames = match[2].split(',')
    let body = '"use strict";' + match[3]

    let params = {}
    for(let n = 0; n < paramNames.length; n++)
      params[paramNames[n]] = args[n]

    console.log(['global'].concat(this.tags))
    return this.transport.rpc.call('executeCode', body, params, ['global'].concat(this.tags))
  }

}

module.exports = Client
