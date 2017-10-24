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

const DEBUG_SHOW_HEADER = parseInt(process.env.DEBUG_SHOW_HEADER);
const DEBUG_SHOW_RESULT_DATA = parseInt(process.env.DEBUG_SHOW_RESULT_DATA);
const DEBUG_SHOW_SLEEP_TIME = parseInt(process.env.DEBUG_SHOW_SLEEP_TIME);
const CONF_SLEEP_TIME_ = process.env.SLEEP_TIME_S;
const DEBUG_SHOW_SERIAL_DATA_PARSER = process.env.DEBUG_SHOW_SERIAL_DATA_PARSER;

let portOk = false;
let swCounter = 0;

const writeCmd = function () {
  const SLEEP_TIME_ENV = CONF_SLEEP_TIME_;
  const sleepTimeS = parseInt(SLEEP_TIME_ENV);
  let sleepTimeBuffer = Buffer.allocUnsafe(4);
  sleepTimeBuffer.writeUInt32LE(sleepTimeS);
  const CMD = {
    UPDATE_TIME: 0x88
  };
  const header = Buffer.from([0x7e, 0x7f]);
  const tail = Buffer.from([0x0d, 0x0a]);
  const data = Buffer.concat([header, Buffer.from([CMD.UPDATE_TIME]), sleepTimeBuffer, tail]);

  if (DEBUG_SHOW_SLEEP_TIME) {
    console.log(`sleepTimeS = ${sleepTimeS}`);
    console.log(`being written `, data);
  }

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
  if (DEBUG_SHOW_SERIAL_DATA_PARSER) {
    console.log(data.toString('hex'));
  }
  try {
    const data_header = parsers.header.parse(data);
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

    if (DEBUG_SHOW_HEADER) {
      console.log(data_header);
    }

    if (DEBUG_SHOW_RESULT_DATA) {
      console.log(out);
    }

  }
  catch (ex) {
    console.log('exception...', ex);
  }
});

