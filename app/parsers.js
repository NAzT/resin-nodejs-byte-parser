const Parser = require('binary-parser').Parser;
const toHexString = function (arr) {
  return Buffer.from(arr).toString('hex');
};

const HeaderParser = new Parser().endianess('big')
  .array('header', {
    type: 'uint8',
    length: 2,
    formatter: toHexString
  })
  .uint8('version')
  .endianess('little')
  .uint32('reserved')
  .uint16('type');

const CMMCParser = new Parser().endianess('big')
  .array('header', {
    type: 'uint8',
    length: 2,
    formatter: toHexString
  })
  .uint8('version')
  .endianess('little')
  .uint32('reserved')
  .uint16('type')
  .endianess('big')
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
  .uint32('battery')
  .uint32('temperature')
  .uint32('humidity')
  .uint32('field3')
  .uint32('field4')
  .uint32('field5')
  .uint32('field6')
  .uint32('ms')
  .uint32('sum')
  .uint32('sleep_s')
  .uint32('ms_controller')
  .uint32('sum_controller');

versions = {
  header: HeaderParser,
  version_1: CMMCParser
};
module.exports = versions;
