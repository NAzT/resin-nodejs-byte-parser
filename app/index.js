#!/bin/env node

const chalk = require('chalk');
const SerialPort = require('serialport');
const Delimiter = SerialPort.parsers.Delimiter;
const port = new SerialPort(process.env.TARGET_PORT, {
  baudRate: parseInt(process.env.TARGET_BAUDRATE)
});

const parsers = require('./parsers');
const mqtt = require('cmmc-mqtt').mqtt;
const mqttClient1 = mqtt.create('mqtt://mqtt.cmmc.io', []);

let portOk = false;
let swCounter = 0;

const writeCmd = function () {
  const SLEEP_TIME_ENV = process.env.SLEEP_TIME_S || 60;
  const sleepTimeS = parseInt(SLEEP_TIME_ENV, 10);
  // console.log(`sleepTimeS = ${sleepTimeS}`);
  let sleepTimeBuffer = Buffer.allocUnsafe(4);
  sleepTimeBuffer.writeUInt32LE(sleepTimeS);
  const CMD = {
    UPDATE_TIME: 0x88
  };
  const header = Buffer.from([0x7e, 0x7f]);
  const tail = Buffer.from([0x0d, 0x0a]);
  const data = Buffer.concat([header, Buffer.from([CMD.UPDATE_TIME]), sleepTimeBuffer, tail]);
  console.log(`being written `, data);
  port.write(data, (err) => {
    if (err) {
      console.log('write port error =>', err);
    }
  });
};

port.on('open', () => {
  portOk = true;
  writeCmd();
});

port.on('error', () => {
  portOk = false;
});

setInterval(function () {
  if (!portOk) {
    console.log('serial port closed.');
    return;
  }
  writeCmd();
}, 60 * 1000);

const parser = port.pipe(new Delimiter({delimiter: Buffer.from('0d0a', 'hex')}));
parser.on('data', function (data) {
  try {
    const data_header = parsers.header.parse(data);
    console.log(data_header);
    const sensor = parsers['version_1'].parse(data);
    const out = {
      info: {ssid: 'espnow', from: sensor.from, to: sensor.to},
      d: {}
    };

    Object.keys(sensor).forEach((key, idx) => {
      out.d[key] = sensor[key];
    });

    mqttClient1.publish(`NAT/ZEUS/now/${sensor.to}/${sensor.from}/status`, JSON.stringify(out), {retain: false});
    mqttClient1.publish(`NAT/ODIN/now/${sensor.to}/${sensor.from}/status`, JSON.stringify(out), {retain: false});
    console.log(out);
  }
  catch (ex) {
    console.log('exception...', ex);
  }
});

