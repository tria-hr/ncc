const Broker = require('./lib/Broker')
const Runner = require('./lib/Runner')
const Client = require('./lib/Client')

let b = new Broker()
b.listen(9000)

let c = new Client('127.0.0.1:9000')
new Runner('127.0.0.1:9000')
new Runner('127.0.0.1:9000')
new Runner('127.0.0.1:9000')

setTimeout(() => {
  for(let n = 0; n < 10; n++)
    c.run(n + 1, n + 2, (x, y) => {
      require('test')
      return x + y
    }).then(sum => {
      console.log('sum =', sum)
    }).catch(error => {
      console.log('error:', error)
    })
}, 1000)
