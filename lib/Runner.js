const path = require('path')
const util = require('util')
const Transport = require('./Transport')
const tools = require('./Tools')
const esprima = require('esprima')
const uuid = require('uuid')
const os = require('os')

class Runner {

  constructor(broker) {
    this.ws = null
    this.id = 'r-' + uuid.v4()
    this.tags = ['global', os.arch(), os.platform()]

    if(broker)
      this.connect(broker)
  }

  connect(broker) {
    this.transport = new Transport()
    this.transport.connect(broker)
    this.transport.on('open', () => {
      this.transport.rpc.call('registerRunner', this.id, this.tags).catch(_ => {
        console.log('error while registering to the broker')
      })
    })

    this.transport.on('executeCode', (code, params, resolve, reject) => {
      let newParams =  Object.keys(params).concat(['error', 'success', 'require', code])
      let fn = new (Function.prototype.bind.apply(Function, [null].concat(newParams)));

      // parse the code
      let ast = esprima.parse(fn.toString())

      // install needed modules
      tools.astWalk(ast, (node) => {
        if(node.type == 'CallExpression' && node.callee && node.callee.name == 'require' && node.arguments)
          tools.installModule(node.arguments.shift().value)
      })

      // execute the code
      let callParams = []
      Object.keys(params).forEach((key) => {
        callParams.push(params[key])
      })

      let _require = (module) => { return require(module) }

      callParams = callParams.concat([ reject, resolve, _require ])

      let result = fn.apply(null, callParams)
      if(result != undefined)
        resolve(result)
    })
  }

}

module.exports = Runner
