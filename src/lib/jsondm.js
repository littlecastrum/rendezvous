/*
 * Library for storing and editing data
 *
 */

// Dependencies
const fs = require('fs');
const path = require('path');
const { promisify, to, parseJsonToObject } = require('./helpers');

const baseDir = path.join(__dirname, '/../../.data/');
const openFile = promisify(fs.open);
const writeFile = promisify(fs.writeFile);
const closeFile = promisify(fs.close);
const readFile = promisify(fs.readFile);
const truncateFile = promisify(fs.ftruncate);
const unlinkFile = promisify(fs.unlink);

function create(dir, file, data) {
  return new Promise(async(resolve, reject) => {
    try {
      const fd = await openFile(`${baseDir}${dir}/${file}.json`, 'wx');
      const stringData = JSON.stringify(data);
      await writeFile(fd, stringData);
      await closeFile(fd);
      resolve(`Sucessfully created ${file}.json` );
    } catch(err) {
      reject(err);
    }
  });
};

function read(dir, file) {
  return new Promise(async (resolve, reject) => {
    const { error, response } = await to(readFile(`${baseDir}${dir}/${file}.json`, 'utf8'));
    if (!error && response) {
      const parsedResponse = parseJsonToObject(response);
      resolve(parsedResponse);
    } else { 
      reject(error);
    }
  });
};

function update(dir, file, data) {
  return new Promise(async(resolve, reject) => {
    try {
      const fd = await openFile(`${baseDir}${dir}/${file}.json`, 'r+');
      const stringData = JSON.stringify(data);
      await truncateFile(fd);
      await writeFile(fd, stringData);
      await closeFile(fd);
      resolve(`Sucessfully updated ${file}.json` );
    } catch(err) {
      reject(err);
    }
  });
};

function remove(dir, file) {
  return new Promise(async (resolve, reject) => {
    try {
      const data = await unlinkFile(`${baseDir}${dir}/${file}.json`);
      resolve(data);
    } catch(err) {
      reject(err);
    }
  });
};

function fileExists(dir, file) {
  return fs.existsSync(`${baseDir}${dir}/${file}.json`);
}

module.exports = {
  create,
  read,
  update,
  remove,
  fileExists
}