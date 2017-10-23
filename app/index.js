#!/bin/env node

const Parser = require('binary-parser').Parser;
const chalk = require('chalk');
const SerialPort = require('serialport');
const Delimiter = SerialPort.parsers.Delimiter;
const port = new SerialPort(process.env.TARGET_PORT, {
  baudRate: parseInt(process.env.TARGET_BAUDRATE)
});
const mqtt = require('cmmc-mqtt').mqtt;

const mqttClient1 = mqtt.create('mqtt://mqtt.cmmc.io', []);

let portOk = false;
let swCounter = 0;

const writeCmd = function () {
  const SLEEP_TIME = process.env.SLEEP_TIME_S || 60;
  const sleepTimeS = parseInt(SLEEP_TIME, 10);
  let cmd = Buffer.allocUnsafe(3);

  cmd.writeUInt8(sleepTimeS, 0);
  cmd.writeUInt8(sleepTimeS, 1);
  cmd.writeUInt8(sleepTimeS, 2);

  const data = [0x7e, 0x7f, 0x0a, swCounter++, 0x01, 0x02, 0x0d, 0x0a];
  console.log(`being written `, data);
  cmd = data;
  port.write(cmd, (err) => {
    if (err) {
      console.log('write port error =>', err);
    }
  });
};

port.on('open', () => {
  portOk = true;
  writeCmd();
});

port.on('error', () => { portOk = false; });

setInterval(function () {
  if (!portOk) {
    console.log('serial port closed.');
    return;
  }
  writeCmd();
}, 200);
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
  .uint32('sum_controller');

const parser = port.pipe(new Delimiter({delimiter: Buffer.from('0d0a', 'hex')}));
parser.on('data', function (data) {
  try {
    const sensor = CMMCParser.parse(data);
    sensor.temperature = parseFloat(sensor.temperature.toFixed(2));
    sensor.humidity = parseFloat(sensor.humidity.toFixed(2));
    const out = {
      info: {ssid: 'espnow', from: sensor.from, to: sensor.to},
      d: {}
    };

    Object.keys(sensor).forEach((key, idx) => {
      out.d[key] = sensor[key];
    });

    setTimeout(() => {
      mqttClient1.publish(`NAT/ODIN/now/${sensor.to}/${sensor.from}/status`, JSON.stringify(out), {retain: false});
    }, 100);
    console.log(out);
  }
  catch (ex) {
    console.log('exception...', ex);
  }
});

