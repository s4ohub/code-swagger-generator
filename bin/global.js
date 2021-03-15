#!/usr/bin/env node

const lib = require('../tasks');
const path = require('path');

if (process.argv.length < 5) {
  return console.error('incomplete arguments');
}

let title = process.argv[2];
let host = process.argv[3];
let ctrlFolder = path.resolve(process.argv[4]);
let outputFile = path.resolve(process.argv[5]);
let addQuota = process.argv[6] ? true : false;

lib.task(title, host, ctrlFolder, outputFile, addQuota);
