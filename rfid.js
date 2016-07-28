
var util = require('util')
  , ndef = require('ndef')
  , prompt = require('prompt')
  , nfc = require('nfc').nfc
  , devices = nfc.scan();

var text2write = "change me";
/*
prompt.message = "What text you want to write to the card?";
//prompt.delimiter = "\t";
prompt.start();
prompt.get(['value'], function (error, result) {
  if (error) { throw error }
  if (!!result.value) {
    text2write = result.value;
    test(text2write);
  }

});
*/

//------------------------------------------------------------------------------
// Construct tag data format TLV for text type ndef data.
//------------------------------------------------------------------------------
function makeTextTagBuffer(text) {

  message = [
    ndef.textRecord(text)
  ];
  bytes = ndef.encodeMessage(message);

  var buflen = bytes.length+3;
  if (bytes.length > 0xff) buflen+=2;

  var buf = new Buffer(buflen);

  buf.writeUInt8(0x03, 0);

  if (bytes.lenth > 0xff) {
    buf.writeUInt8(0xff, 1);
    buf.writeUint16LE(bytes.length, 2);
    for (var i = 0; i < bytes.length; i++) {
      buf.writeUInt8(bytes[i], 4+i);
    }
  } else {
    buf.writeUInt8(bytes.length, 1);
    for (var i = 0; i < bytes.length; i++) {
      buf.writeUInt8(bytes[i], 2+i);
    }
  }
  buf.writeUInt8(0xfe, buflen-1);
  return buf;
}

//------------------------------------------------------------------------------
// Test function
//------------------------------------------------------------------------------
function test(text2write) {
  message = [
      ndef.textRecord(text2write)
  ];
  bytes = ndef.encodeMessage(message);

  for (var deviceID in devices) {
    var nfcdev = new nfc.NFC();

    nfcdev.on('read', function(tag) {
      if (!!tag.data)  {
        // Print original tag
        console.log("Tag data block size: " + tag.data.length);
        console.log(util.inspect(tag.data, {depth: null}));

        nfc.printTagBuffer(tag.data);      
        // Example output:
        // Block[0] 04 11 11 8c ea 79 4d 81 5f 48 00 00 e1 10 6d 00 
        //         +---+---+------------  --------------------+
        //         | T | L |             V                    |
        //         +---+---+----------------------------------+
        //         |   |   | NDEF header |     payload        |
        //         +---+---+-------------+--------------------+
        //         |   |   |         'T' |  "e  n" e  g  g  s | Terminator
        //         +---+---+------------+---------------------+------------
        // Block[1] 03  0b   d1 01 07 54  02 65 6e 65 67 67 73       fe    00 00 
        // Block[2] 63  6f   6d 2f 77 65  6c 63 6f 6d 65 fe 00       00    00 00 
        // Block[3] 00  00   00 00 00 00  00 00 00 00 00 00 00       00    00 00 
        
        var tlvs = nfc.parse(tag.data.slice(tag.offset));
        console.log(util.inspect(tlvs, {depth: null}));
        console.log("Original text: " + tlvs[0].ndef[0].value + "\n\n");

        nfcdev.stop();
        return;
        var tagdata = new Buffer(bytes);
        var tlv = {
          type: 0x03,     // NDEF
          len: tagdata.length,
          value: tagdata
        };

        // New TLV buffer
        var buf = new Buffer(tagdata.length + 3);
        buf.writeUInt8(tlv.type, 0);
        buf.writeUInt8(tlv.len, 1);
        tagdata.copy(buf, 2, 0);
        buf.writeUInt8(0xfe, tagdata.length+2);
        
        console.log("Writing new text: " + text2write);
        // -$- Append TLV block to manfacture block -$-
        buf.copy(tag.data, tag.offset, 0); 
        console.log(util.inspect(tag.data, {depth:null}));
        var pages = nfcdev.write(tag.data);
        console.log("Wrote " + pages + " pages");
      }
      nfcdev.stop()
    });

    nfcdev = nfcdev.start(deviceID);
    // -$- Read tag data -$-
    var tagdata = new Buffer(64*16); // first 16 sectors.
    var datalen = 0;
    for( var sector = 0; sector <= 15; sector++) {
      tag = nfcdev.readTagSector(sector);
      if (!!tag.data)  {
        tag.data.copy(tagdata, datalen);
        datalen += tag.data.length; 

        var tlvs = nfc.parse(tagdata.slice(16));
        if (tlvs[tlvs.length-1].type === 0xfe) {
          //nfc.printTagBuffer(tagdata);
          break;
        }
      }
    }

    // -$- Manufacture block -$- 
    manudata = nfc.parseManufactureBlk(tagdata.slice(0, 16));
    console.log("uid: " + nfc.bufToHexString(new Buffer(manudata.uid), ' '));
    console.log("check byte 0: " + ('0' + manudata.cb0.toString(16)).substr(-2));
    console.log("check byte 1: " + ('0' + manudata.cb1.toString(16)).substr(-2));
    console.log("internal: " + ('0' + manudata.internal.toString(16)).substr(-2));
    console.log("lock bytes: " + nfc.bufToHexString(new Buffer(manudata.lock), ' '));
    console.log("capability container: " + nfc.bufToHexString(new Buffer(manudata.cc), ' '));
    console.log();

    // -$- Read JSON data -$-
    console.log("Original text: " + tlvs[0].ndef[0].value);
    try {
      infoObj = JSON.parse(tlvs[0].ndef[0].value);
      console.log(infoObj); 
      console.log();
    } catch (e) {
    } finally {
    

      //*
      // -$- Write *eggs* -$-
      var text = "hello";
      var json = JSON.stringify({
        "name": "eggs",
        "location": "Jersey City",
        "Expiration": "10/10/16",
        "Boxed date": "7/26/2016",
        "NOE": 18
      }, null, '\t');

      var buf = makeTextTagBuffer(json);
      console.log(nfc.bufToHexString(buf, ' '));

      var np = nfcdev.write(buf);
      console.log("Wrote " + np + " pages");
      //*/

      nfcdev.stop();
    }
  }

}


test();
