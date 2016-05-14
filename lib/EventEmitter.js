class EventEmitter {

  constructor() {
    this.eventMappings = []
  }

  emit(event, parameters) {
    let args = new Array(arguments.length - 1)
    for(let n = 1; n < arguments.length; n++)
      args[n - 1] = arguments[n]

    this.eventMappings.filter(_ => _.event == event).forEach(mapping => {
      mapping.handlers.forEach(handler => {
        handler.apply(this, args)
      })
    })
  }

  on(event, handlers) {
    let args = new Array(arguments.length - 1)
    for(let n = 1; n < arguments.length; n++)
      args[n - 1] = arguments[n]

    this.eventMappings.push({
      event: event,
      handlers: args
    })
  }

}

module.exports = EventEmitter
