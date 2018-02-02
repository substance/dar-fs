const fs = require('fs')
const path = require('path')
const listDir = require('./listDir')

// these extensions are considered to have text content
const TEXTISH = ['txt', 'html', 'xml', 'json']

/*
  Provides a list of records found in an archive folder.

  @param {object} opts
    - `noBinaryData`: do not load the content of binary files
    - `ignoreDotFiles`: ignore dot-files
*/
module.exports = async function readArchive(archiveDir, opts = {}) {
  // make sure that the given path is a dar
  if (await _isDocumentArchive(archiveDir)) {
    // first get a list of stats
    const entries = await listDir(archiveDir, opts)
    // then get file records as specified TODO:link
    let result = await Promise.all(entries.map(entry => {
      return _getFileRecord(entry, opts)
    }))
    return result
  } else {
    throw new Error(archiveDir + ' is not a document archive')
  }
}

/*
  Provides a record for a file as it is used for the DocumentArchive presistence protocol.

  Binary files can be exluced using `opts.noBinaryData`.

  @example

  ```
  {
    id: 'manuscript.xml',
    encoding: 'utf8',
    data: '<article>....</article>',
    size: 5782,
    createdAt: 123098123098,
    updatedAt: 123234567890,
  }
  ```
*/
async function _getFileRecord(fileEntry, opts) {
  // for text files load content
  // for binaries use a url
  let record = {
    id: fileEntry.name,
    encoding: null,
    size: fileEntry.size,
    createdAt: fileEntry.birthtime.getTime(),
    updatedAt: fileEntry.mtime.getTime()
  }
  if(_isTextFile(fileEntry.name)) {
    return new Promise((resolve, reject) => {
      fs.readFile(fileEntry.path, 'utf8', (err, content) => {
        if (err) return reject(err)
        record.encoding = 'utf8'
        record.data = content
        resolve(record)
      })
    })
  } else {
    // used internally only
    record._binary = true
    if (opts.noBinaryContent) {
      return Promise.resolve(record)
    } else {
      return new Promise((resolve, reject) => {
        fs.readFile(fileEntry.path, 'hex', (err, content) => {
          if (err) return reject(err)
          record.encoding = 'hex'
          record.data = content
          resolve(record)
        })
      })
    }
  }
}

async function _isDocumentArchive(archiveDir) {
  // assuming it is a DAR if the folder exists and there is a manifest.xml
  return _fileExists(path.join(archiveDir, 'manifest.xml'))
}

function _fileExists(path) {
  return new Promise(resolve => {
    fs.exists(path, (exists) => {
      resolve(exists)
    })
  })
}

function _isTextFile(f) {
  return new RegExp(`\\.(${TEXTISH.join('|')})$`).exec(f)
}