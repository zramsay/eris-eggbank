/*
********************************************************************************
*   eggs bank on the blockchain
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
    ;

var contractRoot = "./contract/"
    , contractName = "deployEggbank"
    , contractMngrName = "eggchain_developer_000"
    ;

var erisdbURL = "http://localhost:1337/rpc";

//-$- get the abi and deployed data squared away -$-
var contractData = require( contractRoot + appName + '/epm.json');
var eggsContractAddress = contractData[contractName];

var eggsAbi = JSON.parse( fs.readFileSync(contractRoot + appName + "/eggbank_abi/" 
                          + eggsContractAddress) );

//-$- properly instantiate the contract objects manager using the erisdb URL
// and the account data (which is a temporary hack) -$-
var accountData = require(contractRoot + appName + "/accounts.json");
var contractsManager = erisC.newContractManagerDev(erisdbURL, 
                                            accountData[contractMngrName]);

//-$- properly instantiate the contract objects using the abi and address -$-
var eggsContract = contractsManager.newContractFactory(eggsAbi)
    .at(eggsContractAddress);

function registerEggCarton(uid, cartonInfo, callback) {
    eggsContract.registerCarton(uid, cartonInfo.name, cartonInfo.location, 
            new Date(cartonInfo.Expiration).getTime(), 
            new Date(cartonInfo['Boxed date']).getTime(),
            cartonInfo.NOE, 
            function(error, errCode) {
        if (error) return;
        callback(errCode);
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

var NO_ERROR = 0
    , RESOURCE_NOT_FOUND = 1001
    , RESOURCE_ALREADY_EXISTS = 1002
    , ACCESS_DENIED = 2000
    ;

var errors = {};
errors[NO_ERROR] = "Successfully";
errors[RESOURCE_NOT_FOUND] = "Resource not found";
errors[RESOURCE_ALREADY_EXISTS] = "Resource already exists";
errors[ACCESS_DENIED] = "Access denied";

//------------------------------------------------------------------------------
// Start egg server to verify eggs.
//------------------------------------------------------------------------------
function startEggServer() {
    var restify = require('restify');                                                                           

    var name = "Consumer Egg Tracker Server"                                                                    

    var server = restify.createServer();                                                                        
    server.use(restify.queryParser());                                                                          
    server.use(restify.bodyParser({mapParams: true, mapFiles: true}));              
    
    // -$- Get total number of eggs -$-
    server.get('/eggs/total', function(req, res, next){ 
        eggsContract.getEggCount(function(error, result){
            if (error) {
                res.send(500, error);
                return next();
            }
            res.send(200, "You have " + result.toNumber() + " eggs.")
            console.log("Egg number now is:\t\t\t" + result.toNumber());
            return next()
        });
    });

    // -$- Retrieve carton information by carton tag UID -$-
    var DateFormat = require('dateformat');
    server.get('/eggs/get/:eggid', function(req, res, next) {
        eggsContract.getCartonInfo( req.params.eggid, function(error, result) {
            if (error) {
                res.send(500, error);
                return next();
            }

            var resCode = result[0];
            if (resCode == NO_ERROR) {
                var name = result[1];
                var loc = result[2];
                var expiration = new Date(result[3].toNumber());
                var boxedDate = new Date(result[4].toNumber());
                var noe = result[5].toNumber;
                var owner = result[6];
                var json = JSON.stringify( {
                    "Name": name,
                    "Location": loc,
                    "Expiration": DateFormat(expiration, "mm/dd/yyyy"),
                    "Boxed date": DateFormat(expiration, "mm/dd/yyyy"),
                    "NoE": noe,
                    "Owner": owner
                }, null, '\t');
                res.send(200, json);
            } else {
                res.send(200, "ERROR getting egg info. " + errors[resCode]);
            }
            return next();
        });
    });
    
    // -$- Dispose egg carton by carton tag UID -$-
    server.get('/eggs/dispose/:eggid', function(req, res, next) {
        var eggid = req.params.eggid;
        eggsContract.disposeCarton(eggid, function (error, result) {
            if (error) {
                res.send(500, error);
                return next;
            }
            if (result == NO_ERROR) {
                res.send(200, "Egg carton " + eggid + " has been disposed.");
                return next();
            } else {
                res.send(200, "ERROR disposing egg carton " + eggid + ". " + errors[result]);
                return next();
            }
        });
    });

    server.get('/eggs/transfer', function(req, res, next) {
        var eggid = req.query.eggid;
        var newOwner = req.query.newOwner;
        eggsContract.transferCarton(eggid, newOwner, function(error, result) {
            if (error) {
                res.send(500, error);
                return next;
            }
            if (result == NO_ERROR) {
                res.send(200, "Egg carton " + eggid + " has been transferred to " + newOwner);
                return next();
            } else {
                res.send(200, "ERROR transferring egg carton " + eggid + ". " + errors[result]);
                return next();
            }
        });
    });

    server.listen(56659);
    console.log("server running at 0.0.0.0:56659");
}

function isEggTag(tagval) {                                                     
    try {                                                                       
        jsonObj = JSON.parse(tagval);                                           
    } catch (e) {                                                               
        return false;                                                           
    }                                                                           
                                                                                
    return jsonObj.hasOwnProperty('name') && jsonObj.name === "eggs";           
}    

//-$- Main entry -$-
var args = process.argv.slice(2);
if (args.length > 0 &&  args[0] == "server") {
    startEggServer();
} else {
    var devices = nfc.scan();
    for (var deviceID in devices) {
         //read(deviceID);
         var nfcdev = new nfc.NFC();                                                                             
         nfcdev.start(deviceID);                                                                                 
         nfc.readTag(nfcdev, function(tagdata) {                                                                 
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
             var tlvs = nfc.parse(tagdata.slice(16));                                                            
             tagval = tlvs[0].ndef[0].value;                                                                     
             console.log("Original text: " + tagval);                                                            
             if (!isEggTag(tagval)) {                                                                            
                 console.log("It's not an egg carton tag!!!");
                 nfcdev.stop();                                                                                  
                 return;                                                                                         
             }                                                                                                   

             var infoObj = JSON.parse(tagval);                                                                       
             var cartonUID = nfc.bufToHexString(new Buffer(manudata.uid), '');
             registerEggCarton(cartonUID, infoObj, function (errCode) {
                 if (errCode == NO_ERROR) {
                     console.log("Congrats! Registered  " + cartonUID);
                 } else if (errCode == RESOURCE_ALREADY_EXISTS) {
                     console.log("Carton " + cartonUID + " already exists!!");
                 }
             });

             nfcdev.stop();
         });
    }
}


