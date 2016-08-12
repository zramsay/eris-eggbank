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


