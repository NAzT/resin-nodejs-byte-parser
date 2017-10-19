#!/bin/env node


var Parser = require('binary-parser').Parser;
const chalk = require('chalk');
const SerialPort = require('serialport');
const Delimiter = SerialPort.parsers.Delimiter;
const port = new SerialPort(process.env.TARGET_PORT, {
  baudRate: parseInt(process.env.TARGET_BAUDRATE)
});

port.on('open', () => {
  if (process.env.CONTROLLER_CMD) {
    console.log("writing... CONTROLLER_CMD")
    const cmd =  Buffer.from(process.env.CONTROLLER_CMD, 'hex')
    port.write(process.env.CONTROLLER_CMD, (err) => {
      console.log(err);
    }
  }
});

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
  .uint8('version')
  .uint8('type')
  .uint32('reserved')
  .array('from', {
    type: 'uint8',
    length: 6,
    formatter: toHexString
  })
  .array('to', {
    type: 'uint8',
    length: 6,
    formatter: toHexString
  })
  .endianess('little')
  .uint16('battery')
  .float('temperature')
  .float('humidity')
  .uint32('ms')
  .uint32('sum')
  .uint32('sleep_s')
  .uint32('ms_controller')
  .uint32('sum_controller')
  
const parser = port.pipe(new Delimiter({delimiter: Buffer.from('0d0a', 'hex')}));
parser.on('data', function (data) {
  console.log(data);
  const sensor = CMMCParser.parse(data);
  sensor.temperature = sensor.temperature.toFixed(2);
  sensor.humidity = sensor.humidity.toFixed(2);
  console.log(sensor);
  // console.log(CMMCParser.parse(data))
});

