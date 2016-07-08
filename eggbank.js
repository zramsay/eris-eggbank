/*
********************************************************************************
*   Urvogel - the eggs on the blockchain
*******************************************************************************/


var fs = require ('fs')
    , util = require('util')
    ;

var erisC = require('eris-contracts')
    , ndef = require('ndef')
    , nfc  = require('nfc').nfc
    ;

var appName = "eggbank"
    , chainName = "eggchain"
    , contractMngrName = "eggchain_developer_000"
    ;

var contractRoot = "./contract/";

var erisdbURL = "http://localhost:1337/rpc";

//-$- get the abi and deployed data squared away -$-
var contractData = require( contractRoot + appName + '/epm.json');
var eggsContractAddress = contractData["deployStorageK"];
var eggsAbi = JSON.parse( fs.readFileSync(contractRoot + appName + "/abi/" 
                          + eggsContractAddress) );

//-$- properly instantiate the contract objects manager using the erisdb URL
// and the account data (which is a temporary hack) -$-
var accountData = require("./contract/" + appName + "/accounts.json");
var contractsManager = erisC.newContractManagerDev(erisdbURL, 
                                            accountData[contractMngrName]);

//-$- properly instantiate the contract objects using the abi and address -$-
var eggsContract = contractsManager.newContractFactory(eggsAbi)
    .at(eggsContractAddress);

//------------------------------------------------------------------------------
// Get current outstanding number of eggs in contract
//------------------------------------------------------------------------------ 
function getValue(callback) {
    eggsContract.get(function(error, result){
        if (error) { throw error }
        console.log("Egg number now is:\t\t\t" + result.toNumber());
        callback(result);
    });
}

//------------------------------------------------------------------------------
// Set egg number in eggs contract
//------------------------------------------------------------------------------
function setValue(value) {
    eggsContract.set(value, function(error, result){
        if (error) { throw error }
        getValue(function(){});
    });
}

//------------------------------------------------------------------------------
// Read and process the RFID value
//------------------------------------------------------------------------------
function read(deviceID) {
    var nfcdev = new nfc.NFC();
    /* RFID data ready to read */
    nfcdev.on('read', function(tag) {
        //console.log(util.inspect(tag, { depth: null }));
        if ((!!tag.data) && (!!tag.offset)) {
            tlvs = nfc.parse(tag.data.slice(tag.offset))
                //console.log(util.inspect(tlvs, { depth: null }))
                if (!!tlvs && ('ndef' in tlvs[0])) {
                    attachedData = tlvs[0].ndef[0].value;
                    console.log("TAG: " + attachedData);
                    if (attachedData == "eggs") {
                        getValue(function (result) {
                            curEggs = result.toNumber();
                            console.log("Adding a dozen eggs")
                            setValue(curEggs+12);
                        });

                    } else {
                        console.log("Sorry, we don't accept " + attachedData);
                    }

                }

            nfcdev.stop();

        } else {
            console.log("Hold tag longer on the RFID reader.")
        }

    });

    /* RFID/NFC error callback. */
    nfcdev.on('error', function(err) {
        console.log(util.inspect(err, { depth: null }));
    });

    /* RFID/NFC stopped, clean up. */
    nfcdev.on('stopped', function() {
        //console.log('stopped');
        console.log('');
    });

    nfcdev.start(deviceID)
        console.log("Waiting for eggs...");
}

//------------------------------------------------------------------------------
// Start egg server to verify eggs.
//------------------------------------------------------------------------------
function startEggServer() {
    var restify = require('restify');                                                                           

    var name = "Consumer Egg Tracker Server"                                                                    

    var server = restify.createServer();                                                                        
    server.use(restify.queryParser());                                                                          
    server.use(restify.bodyParser({mapParams: true, mapFiles: true}));              
                                                                                                                
    server.get('/eggs/:getInventory', function(req, res, next){ 
        eggsContract.get(function(error, result){
            if (error) {
                res.send(500, error);
                return next();
            }
            res.send(200, "You have " + result.toNumber() + " eggs.")
            console.log("Egg number now is:\t\t\t" + result.toNumber());
            return next()
        });
    });
    server.listen(56658);
    console.log("server running at 0.0.0.0:56658");
}

//-$- Main entry -$-
var args = process.argv.slice(2);
if (args.length > 0 &&  args[0] == "server") {
    startEggServer();
} else {
    var devices = nfc.scan();
    for (var deviceID in devices) {
        read(deviceID);
    }
}


