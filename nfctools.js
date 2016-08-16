/**
 * NFC related untility functions.
 */
var ndef = require('ndef');

/**
 * Construct tag data in Type-Length-Value (TLV) format. 
 * The value is in NFC Data Exchange Format (NDEF).
 *
 * @param {string} text - The text to write to NFC data blocks.
 * @returns {Buffer} - The constructed Buffer representation of tag data.
 */
exports.makeTextTagBuffer = function(text) {
    message = [
        ndef.textRecord(text)
    ];
    ndefBytes = ndef.encodeMessage(message);

    var buflen = ndefBytes.length+3;
    if (ndefBytes.length > 0xff) buflen+=2;
    // -$- Fill the buffer with NDEF data in TLV format. -$-
    var buf = new Buffer(buflen);
    buf.writeUInt8(0x03, 0);
    if (ndefBytes.lenth > 0xff) {
        buf.writeUInt8(0xff, 1);
        buf.writeUint16LE(ndefBytes.length, 2);
        for (var i = 0; i < ndefBytes.length; i++) {
            buf.writeUInt8(ndefBytes[i], 4+i);
        }
    } else {
        buf.writeUInt8(ndefBytes.length, 1);
        for (var i = 0; i < ndefBytes.length; i++) {
            buf.writeUInt8(ndefBytes[i], 2+i);
        }
    }
    buf.writeUInt8(0xfe, buflen-1);
    return buf;
}

/**
 * Scan RFID/NFC tag
 * @param callback
 * @param {Boolean} verbose - Print tag details or not.
 */
exports.scanTags = function (callback, verbose) {
    var nfc = require('nfc').nfc;

    var devices = nfc.scan();
    for (var deviceID in devices) {
        try {
            var nfcdev = new nfc.NFC();                                                                             
            nfcdev.start(deviceID);                                                                                 
            nfc.readTag(nfcdev, function(tagdata) {                                                                 
                // -$- Manufacture block -$-                                                
                manudata = nfc.parseManufactureBlk(tagdata.slice(0, 16));                   
                if(verbose) {
                    console.log("uid: " + nfc.bufToHexString(new Buffer(manudata.uid), ' '));       
                    console.log("check byte 0: " + ('0' + manudata.cb0.toString(16)).substr(-2));
                    console.log("check byte 1: " + ('0' + manudata.cb1.toString(16)).substr(-2));
                    console.log("internal: " + ('0' + manudata.internal.toString(16)).substr(-2));
                    console.log("lock bytes: " + nfc.bufToHexString(new Buffer(manudata.lock), ' '));
                    console.log("capability container: " + nfc.bufToHexString(new Buffer(manudata.cc), ' '));
                    console.log();                                                                                      
                }

                // -$- Read JSON data -$-                                                   
                var tlvs = nfc.parse(tagdata.slice(16));                                                            
                tagval = tlvs[0].ndef[0].value;                                                                     
                if(verbose) console.log("Original text: " + tagval);                                                            

                try {                                                                       
                    var infoObj = JSON.parse(tagval);                                                                       
                    var cartonUID = nfc.bufToHexString(new Buffer(manudata.uid), '');
                    nfcdev.stop();
                    callback(nfcdev, {
                        'uid': cartonUID, 
                        'json': infoObj,
                    });

                } catch (e) {                                                               
                    console.log(e);
                    console.log("It's not a carton tag!!!");
                    nfcdev.stop();                                                                                  
                    callback(nfcdev, null);

                }
            });
        } catch(e) {
            console.log(e);
            throw e;
        }
    }
}


