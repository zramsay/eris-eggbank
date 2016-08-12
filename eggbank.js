/*
********************************************************************************
*   eggs bank on the blockchain
*******************************************************************************/

var fs = require ('fs')
    , util = require('util')
    ;

var erisC = require('eris-contracts')
    , ndef = require('ndef')
    ;

var nfctools = require('./nfctools.js');

var eggsContract;
//------------------------------------------------------------------------------
// Load eggbank contract with contract manager account.
//------------------------------------------------------------------------------
function loadEggContract(account) {
    var appName = "eggbank"
        , chainName = "eggchain"
        ;

    var contractRoot = "./contract/"
        , contractName = "deployEggbank"
        , contractMngrName = "eggchain_" + account
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
    eggsContract = contractsManager.newContractFactory(eggsAbi)
        .at(eggsContractAddress);

}

//------------------------------------------------------------------------------
// Register egg carton
// Args:
//   uid(string): tag UID.
//   cartonInfo(json): Carton data in json format.
//   callback: Callback function.
//------------------------------------------------------------------------------
function registerEggCarton(uid, cartonInfo, callback) {
    eggsContract.registerCarton(uid, cartonInfo.Name, cartonInfo.Location, 
            new Date(cartonInfo.Expiration).getTime(), 
            new Date(cartonInfo['Boxed date']).getTime(),
            cartonInfo.NOE, 
            function(error, errCode) {
        if (error) {
            console.log(error);
            return;
        }
        callback(errCode);
    });
}

//------------------------------------------------------------------------------
//  Scan RFID/NFC tag
//  Args:
//    callback: callback function with {uid, json} dictionary obj as params.
//    verbose(bool): Display tag details or not.
//------------------------------------------------------------------------------
function scanTags(callback, verbose) {
    var nfc = require('nfc').nfc;

    var devices = nfc.scan();
    for (var deviceID in devices) {
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
            if (!isEggTag(tagval)) {                                                                            
                console.log("It's not an egg carton tag!!!");
                nfcdev.stop();                                                                                  
                return;                                                                                         
            }                                                                                                   
        
            var infoObj = JSON.parse(tagval);                                                                       
            var cartonUID = nfc.bufToHexString(new Buffer(manudata.uid), '');
            nfcdev.stop();
            callback(nfcdev, {
                'uid': cartonUID, 
                'json': infoObj
            });
        });
    }
}

// -$- Eggbank error definitions -$-
var NO_ERROR = 0
    , RESOURCE_NOT_FOUND = 1001
    , RESOURCE_ALREADY_EXISTS = 1002
    , ACCESS_DENIED = 2000
    , ARRAY_INDEX_OUT_OF_BOUNDS = 3100 
    ;

var errors = {};
errors[NO_ERROR] = "Successfully";
errors[RESOURCE_NOT_FOUND] = "Resource not found";
errors[RESOURCE_ALREADY_EXISTS] = "Resource already exists";
errors[ACCESS_DENIED] = "Access denied";
errors[ARRAY_INDEX_OUT_OF_BOUNDS] = "Index out of bounds";

//------------------------------------------------------------------------------
// Start egg server to serve REST requests.
//------------------------------------------------------------------------------
function startEggServer(port) {
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

    server.get('/eggs/get/event/:index', function (req, res, next) {
        var eggid = req.query.eggid;
        eggsContract.getCartonEvent(eggid, req.params.index, function (error, result) {
            if (error) {
                res.send(500, error);
                return next;
            }
            var errCode = result[0];
            var etype = result[1];
            var actor = result[2];
            if (errCode == NO_ERROR) {
                var json = JSON.stringify( {
                    'etype': etype,
                    'actor': actor

                }, null, '\t');
                res.send(200, json);
                return next;
            } else {
                res.send(200, "ERROR getting event entry. " + errors[errCode]);
                return next();
            }
        });
    });

    server.listen(port);
    console.log("server running at 0.0.0.0:"+port);
}

//------------------------------------------------------------------------------
// Determine if a tag is a egg tag or not.
//------------------------------------------------------------------------------
function isEggTag(tagval) {                                                     
    try {                                                                       
        jsonObj = JSON.parse(tagval);                                           
    } catch (e) {                                                               
        return false;                                                           
    }                                                                           
                                                                                
    return (jsonObj.hasOwnProperty('Name') && jsonObj.Name === "eggs") || 
        (jsonObj.hasOwnProperty('name') && jsonObj.name === "eggs");           
}    

//------------------------------------------------------------------------------
// ebb *register* command handler
//------------------------------------------------------------------------------
function ebbRegister(r, token) {
    var finish = token;
    var verbose = r.flags.v;
    verbose = typeof verbose !== 'undefined' ?  verbose : false;
    scanTags(function (device, tag) {
        if (!!tag) {
            registerEggCarton(tag.uid, tag.json, function(error) {
                if (error == NO_ERROR) {
                    ebbPrintResult("Congrats! Registered egg carton  " + tag.uid);
                } else{
                    ebbPrintResult("ERROR registering " + tag.uid + ". " + errors[error]);
                }           
                finish();
                return;
            });
        } else {
            finish();
        }
    }, verbose);

}

//------------------------------------------------------------------------------
// ebb *transfer* command handler
//------------------------------------------------------------------------------
function ebbTransfer(r , token) {
    var finish = token;
    var eggid = r.args[0];
    var to = r.parameters.target;
    
    eggsContract.transferCarton(eggid, to, function (error, result) {
        if (error) {
            console.log(error);
        }
        if (result == NO_ERROR) {
            ebbPrintResult("Egg carton " + eggid + " has been transferred to " + to);
        } else {
            ebbPrintResult("ERROR transferring egg carton " + eggid + ". " + errors[result]);
        }
        finish();
        return;
    });   
}

//------------------------------------------------------------------------------
// ebb *dispose* command handler
//------------------------------------------------------------------------------
function ebbDispose(r, token) {
    var finish = token;
    var eggid = r.args[0];
    eggsContract.disposeCarton(eggid, function (error, result) {
        if (error) {
            console.log(error);
        } else {
            if (result == NO_ERROR) {
                ebbPrintResult("Egg carton " + eggid + " has been disposed.");
            } else {
                ebbPrintResult("ERROR disposing egg carton " + eggid + ". " + errors[result]);
            }
        }
        finish();
        return;
    });

}

//------------------------------------------------------------------------------
// ebb *help* command heandler
//------------------------------------------------------------------------------
function ebbHelp(r, token) {
    ebbPrintResult(r.help());
    token();
}

//
function ebbPrintResult(result) {
    console.log();
    console.log(result);
    console.log();
}

function ebbProvision(r, token) {
    var finish = token;
    var jsonFile = r.args[0];
    var jsondata = fs.readFileSync(jsonFile, 'utf-8');
    if (!isEggTag(jsondata)) {
        console.log("Error, not a egg tag json file!");
        finish();
        return;
    } 
    console.log(JSON.parse(jsondata));
    var buf = nfctools.makeTextTagBuffer(jsondata);
    console.log(buf);
    try {
        var nfc = require('nfc').nfc;
        var devices = nfc.scan();
        for (var deviceID in devices) {
            var nfcdev = new nfc.NFC();                                                                             
            nfcdev.start(deviceID); 
            var np = nfcdev.write(buf);
            console.log("Wrote " + np + " pages");
        }
    } catch (e) {
        console.log(e);
    }
    finish();

}

//------------------------------------------------------------------------------
// Start eggbank blockchain bridge terminal app
//------------------------------------------------------------------------------
function startEggTerminal() {
    var lineparser = require('lineparser');
    var meta = {
        program: "ebb",
        name: "Eggbank Blockchain Bridge",
        version: "0.0.1",
        subcommands: ['dispose', 'help', 'provision', 'register', 'transfer'],
        options: {
            flags: [
                // -$- short_name, name, description -$-
                [ 'h', 'help', 'print program usage' ],
                [ 'v', 'verbose', 'print detailed information' ]
            ],
            parameters: [
                // -$- short_name, name, description, default_value -$-
                ['t', 'target', 'The target bilateral command', '590244C2F0D8A3D09B68802B4A206C842FA0B864']
            ]
        },
        usages: [
            // -$- subcommand, options, positional-arguments, description, handler -$-
            ['provision', null, ['json file'], 'Provision a tag with provided json file.', ebbProvision],
            ['register', ['[v]'], null, 'Register egg carton to eggchain.', ebbRegister],
            ['transfer', ['[target]'], ['uid'], 'Transfer egg carton.', ebbTransfer],
            ['dispose', null, ['uid'], 'Dispose egg carton.', ebbDispose],
            ['help', null, null, 'help', ebbHelp],
            [null, null, null, 'help', ebbHelp]
        ]
    };

    var optparser = lineparser.init(meta);
    var argsparser = require('shell-quote').parse;
    var prompt = require('prompt-sync')({
        history: require('prompt-sync-history')('prompt_history.txt', 100)
    });
    var sleep = require('sleep-async')();
    
    function ebbTerminal() {
        var cmdline = prompt('ebb > ', 'help');
        if (cmdline == 'exit') {
            prompt.history.save();
            return;
        }
        
        // -$- Synchronizing of callback function and terminal -$-
        // TODO[fix]: `sleepWithCondition` return delayed on second pass of recursion.
        var finished = false;
        function finish() {
            finished = true;
        }
        function hasFinished() {
            return finished ? true : false;
        }

        try {
            optparser.parse(argsparser(cmdline), finish);
            var timeoutopts = {
                sleep: 120000,  // 5min
                interval: 500   // 1/2sec
            };
            sleep.sleepWithCondition(hasFinished, timeoutopts, ebbTerminal);
        } catch (e) {
            ebbTerminal();
        }
    }
    ebbTerminal();
}

//-$- Main entry -$-
var args = process.argv.slice(2);
var account = typeof args[1] !== 'undefined' ? args[1] : 'developer_000';
loadEggContract(account);

if (args.length > 0) {
    if (args[0] == "server") {
        var port = typeof args[2] != 'undefined' ? args[2] : 56659;
        startEggServer(port);
    }
    else if (args[0] == "terminal") {
        startEggTerminal();
    }
} else {
    var nfc  = require('nfc').nfc;

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
                     console.log("Congrats! Registered egg carton  " + cartonUID);
                 } else{
                     console.log("ERROR registering " + cartonUID + ". " + errors[errCode]);
                 }
             });

             nfcdev.stop();
         });
    }
}


