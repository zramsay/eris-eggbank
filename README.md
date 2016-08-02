
# eggbank
'EggBank' on a Chain - Eris/IoT

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
The default action of the `eggbank` app is to read and add the egg tag to the eggank blockchain. 
Besides that, there are `eggbank server` for serving REST requests and `eggbank terminal` for letting user 
interact with eggbank blockchain using commands I/F.

### Eggbank server
```bash
node eggbank.js server [contract mngt account] [port number]
```

The default contract management accout is `developer_000` and default port number is `56659`. The following 
is the supported REST requests.

* Get current egg count 

  http://{SERVER_IP}:{PORT}/eggs/get/total

* Retrieve egg carton information

  http://{SERVER_IP}:{PORT}/eggs/get/{EGGID}

* Dispose egg carton

  http://{SERVER_IP}:{PORT}/eggs/dispose/{EGGID}

* Transfer egg carton to new owner

  http://{SERVER_IP}:{PORT}/eggs/transfer?eggid={EGGID}&newOwner={NEW_ADDRESS}

* Get egg event entry 

  http://{SERVER_IP}:{PORT}/eggs/get/event/{EVENTID}

Since `dispose` and `transfer` needs the user to be authorized user, the two open REST APIs 
will be deprecated aftewards.

### Eggbank blockchain bridge (ebb)
```bash
sudo node eggbank.js terminal [contract mngt account]
```

`ebb` is the terminal app to interact with the eggbank blockchain. The supported 
commands and corresponding formats are:
* `register`: scan and register egg carton tag.
* `transfer {UID} [--target]`: transfer egg carton to new target.
* `dispose {UID}`: Dispose egg carton.

## Need Help?

* lexon: lexonleed@gmail.com

0. [How to setup Raspberry Pi and install eris](https://github.com/shuangjj/docs.erisindustries.com/blob/aboutiot/tutorials/install-eris-arm.md)

## Known Problems

## Credits
