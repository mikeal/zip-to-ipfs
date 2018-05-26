const tar = require('tar')
const api = require('ipfs-api')
const fs = require('fs')
const unzip = require('unzipper')
const {PassThrough} = require('stream')

const archiveStream = str => {
  if (str.endsWith('.tar.gz') || str.endsWith('.tgz')) {
    return fs.createReadStream(str).pipe(tar.t())
  }
  if (str.endsWith('.zip')) {
    console.log(str)
    return fs.createReadStream(str).pipe(unzip.Parse())
  }
}

module.exports = (archive, ipfs) => {
  if (typeof archive === 'string') {
    archive = archiveStream(archive)
  }
  if (typeof ipfs === 'string') {
    ipfs = api(ipfs)
  }
  return new Promise((resolve, reject) => {
    const stream = ipfs.files.addReadableStream({wrapWithDirectory: true})
    const ads = []
    stream.on('data', file => ads.push(file))
    archive.on('entry', entry => {
      console.log(entry.path)
      if (entry.path.includes('__MACOSX')) return entry.autodrain()
      let pass = new PassThrough()
      entry.pipe(pass)
      stream.write({path: entry.path, content: pass})
    })
    archive.on('finish', () => {
      stream.end()
    })
    stream.on('end', () => {
      resolve(ads)
    })
    stream.on('error', reject)
  })
}