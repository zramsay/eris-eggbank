
# DEPRECATED
See https://github.com/eris-ltd/hello-eris

# Eggbank
'Eggbank' on a Chain - Eris/IoT

## Hardware Platform
* Raspberry Pi 2/Pi 3
* [NFC/RFID reader](https://www.adafruit.com/product/364)
* [NFC/RFID tags][Amazon NFC stickers]

[Amazon NFC stickers]: https://www.amazon.com/gp/product/B01D8RDNZ0/ref=oh_aui_detailpage_o07_s00?ie=UTF8&psc=1

## Blockchain 
* [eris](https://erisindustries.com/)

## Software Dependencies
* [node-nfc](https://github.com/shuangjj/node-nfc)
* [lineparser-promised](https://github.com/shuangjj/lineparser-promised) 

## Get Started

### Eggbank

The default action of the `eggbank` app is to print the usage message.
```bash
node eggbank.js
```
According to the help information, you can type in the `node eggbank.js directory` 
to run a `Egg Directory` server for serving REST requests. And use `sudo eggank.js terminal` 
to interact with eggbank blockchain using commands interfaces.

And the big picture for the use case of eggbank is shown below
<img src="/imgs/eggbank.png" width="500" alt="Eggbank Use Case">

### Eggbank Directory
The Direcory server is used to check the eggs on the `eggchain` using the REST requests. 
The server works as an agent to delivery commands to the `eggchain`.
```bash
node eggbank.js directory [contract_manager_account_name] [port_number]
```

The default contract management accout is `developer_000` and default port number is `56659`. 
The following is the supported REST APIs.

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

* Get user info
  
  http://{SERVER_IP}:{PORT}/users/get/{USER_ADDRESS}

Since `dispose` and `transfer` needs the user to be authorized user, the two open REST APIs 
will be deprecated later.

### Eggbank Blockchain Bridge (ebb)
```bash
sudo node eggbank.js terminal [contract_manager_account_name]
```

The terminal commands need the root priviliege to communnicate with the NFC/RFID hardware.
`ebb` is the terminal app to interact with the eggbank blockchain. The supported 
commands and corresponding formats are:
* `provision`: Provision the egg tag with egg profile file in json format.
* `register`: scan and register egg carton tag to eggchain.
* `transfer {UID} [--target]`: transfer egg carton to new target.
* `dispose {UID}`: Dispose egg carton.

## Tutorials

0. [How to setup Raspberry Pi and install eris](https://github.com/shuangjj/docs.erisindustries.com/blob/aboutiot/tutorials/install-eris-arm.md)


