const util = require('util')
const execSync = require('child_process').execSync

function astWalk(ast, cb) {
  let list = [ast]

  while(list.length > 0) {
    let node = list.shift()

    Object.keys(node).forEach(key => {
      if(util.isArray(node[key]))
        list = list.concat(node[key])
      else if(util.isObject(node[key]))
        list = list.concat(Object.keys(node[key]).map(k => node[key][k]))
    })

    if(cb) cb(node)
  }

  if(cb) cb(false)
}

function installModule(module) {
  try {
    // check if needed module is available
    require.resolve(module)
  } catch(e) {
    // install the module
    console.log('Missing module', '"' + module + '", installing ...')
    execSync('npm install ' + module)
  }
}

module.exports = {
  'astWalk': astWalk,
  'installModule': installModule
}
