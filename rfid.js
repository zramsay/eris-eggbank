var util = require('util')
  , ndef = require('ndef')
  , prompt = require('prompt')
  , nfc = require('nfc').nfc
  , devices = nfc.scan();

var text2write = "change me";
prompt.message = "What text you want to write to the card?";
//prompt.delimiter = "\t";
prompt.start();
prompt.get(['value'], function (error, result) {
  if (error) { throw error }
  if (!!result.value) {
    text2write = result.value;
  }

message = [
    //ndef.textRecord("This is a very long message to write to one ndef block!!!")
    ndef.textRecord(text2write)
];

bytes = ndef.encodeMessage(message);

// Write tag
for (var deviceID in devices) {
  var nfcdev = new nfc.NFC();

  nfcdev.on('read', function(tag) {
    if (!!tag.data)  {
      // Print original tag
      console.log(util.inspect(tag.data, {depth: null}));
      var tlvs = nfc.parse(tag.data.slice(tag.offset));
      console.log(util.inspect(tlvs, {depth: null}));
      console.log("Original text: " + tlvs[0].ndef[0].value + "\n\n");

      var tagdata = new Buffer(bytes);
      var tlv = {
        type: 0x03,
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
      // Copy new TLV block to tag data      
      buf.copy(tag.data, tag.offset, 0);
      console.log(util.inspect(tag.data, {depth:null}));
      console.log("New tag data length: " + tag.data.length + "\n\n");
      //console.log(util.inspect(tag, {depth:null}));
      var pages = nfcdev.write(tag.data);
      console.log("Wrote " + pages + " pages");
    }
    nfcdev.stop()
  });

  nfcdev.start(deviceID);
}

});
// Initiate data in ndef format
// do something useful with bytes: write to a tag or send to a peer
/*  
records = ndef.decodeMessage(bytes);

text = ndef.text.decodePayload(records[0].payload);
console.log(text)
*/
