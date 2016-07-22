
# eggbank
'EggBank' on a Chain - Eris/IoT

*Current Status:*
- Implemented RFID triggered contract execution.
- Add egg count on the eggchain by putting the egg RFID tag on the reader.
- Check egg balance on the eggchain by http://52.42.15.191:56658/eggs/getInventory

## Hardware Requirements
* Raspberry Pi 2/Pi 3
* [NFC/RFID reader](https://www.adafruit.com/product/364)
* [NFC/RFID tags][Amazon NFC stickers]

[Amazon NFC stickers]: https://www.amazon.com/gp/product/B01D8RDNZ0/ref=oh_aui_detailpage_o07_s00?ie=UTF8&psc=1

## Software Requirement
* [Hypriot Docker](http://blog.hypriot.com/downloads/)
* [eris](https://erisindustries.com/)

## Dependency Projects
* [node-nfc](https://github.com/camme/node-nfc)

## Try The Code

### Throw in your eggs

```bash
sudo node eggbank.js
```
And place the rfid/nfc tag to the reader, you'll see the eggs number goes up.

### Start eggbank server
```bash
node eggbank.js server
```
You can check the current egg number by the URL http://your_ip_addr:56658/eggs/getInventory.

## Need Help?

* lexon: lexonleed@gmail.com

0. [How to setup Raspberry Pi and install eris](https://github.com/shuangjj/docs.erisindustries.com/blob/aboutiot/tutorials/install-eris-arm.md)

## Known Problems

## Credits
