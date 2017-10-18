#!/bin/env node

{

  const chalk = require('chalk');
  const SerialPort = require('serialport');
  const port = new SerialPort(process.env.TARGET_PORT, {
    baudRate: parseInt(process.env.TARGET_BAUDRATE)
  });

  port.on('open', () => { });

  // open errors will be emitted as an error event
  port.on('error', (err) => {
    // console.log(chalk.red('Error: ', err.message));
  });

  port.on('data', (data) => {
    console.log(data);
    // console.log(chalk.cyan('Data: ' + data));
  });

}
