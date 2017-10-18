#!/bin/env node


var Parser = require('binary-parser').Parser;
const chalk = require('chalk');
const SerialPort = require('serialport');
const Delimiter = SerialPort.parsers.Delimiter;
const port = new SerialPort(process.env.TARGET_PORT, {
  baudRate: parseInt(process.env.TARGET_BAUDRATE)
});

// port.on('open', () => {});

// // open errors will be emitted as an error event
// port.on('error', (err) => {
//   // console.log(chalk.red('Error: ', err.message));
// });

// port.on('data', (data) => {
//   // console.log(data);
//   // console.log(chalk.cyan('Data: ' + data));
// });

const toHexString = function (arr) {
  return Buffer.from(arr).toString('hex');
};

const CMMCParser = new Parser().endianess('big')
  .array('header', {
    type: 'uint8',
    length: 2,
    formatter: toHexString
  })
  .array('from', {
    type: 'uint8',
    length: 6,
    formatter: toHexString
  })
  .array('master', {
    type: 'uint8',
    length: 6,
    formatter: toHexString
  })
  .endianess('little')
  .uint16('battery')
  .uint32('temperature')
  .uint32('humidity')
  .uint32('ms')
  .uint32('sum')
  .uint32('sum2')
  
const parser = port.pipe(new Delimiter({delimiter: Buffer.from('0d0a', 'hex')}));
parser.on('data', function (data) {
  console.log(data);
  const sensor = CMMCParser.parse(data);
  sensor.temperature = sensor.temperature/1000;
  sensor.humidity = sensor.humidity/1000;
  console.log(sensor);
  // console.log(CMMCParser.parse(data))
});

