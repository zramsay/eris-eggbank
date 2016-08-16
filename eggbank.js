/**
 * Eggbank on the blockchain
 */

var fs = require ('fs')
    , util = require('util')
    ;

var erisC = require('eris-contracts')
    , ndef = require('ndef')
    ;

var nfctools = require('./nfctools.js');
var eggerrors = require('./eggerrors.js');

/**
 * Load eggbank contract with contract manager account.
 * @param {string} account - The name of the contract manager account.
 * @returns {Contract}
 */
function loadEggContract(account) {
    var eggsContract;
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
    return eggsContract;

}

/**
 * Eggbank Directory server.
 * @contructor
 * @param {Contract} contract - The eggs contract instance.
 * @param {Number} - The listening port number.
 */
function EggDirectory(contract, port) {
    var restify = require('restify');                                                                           
    var server = restify.createServer();                                                                        
    server.use(restify.queryParser());                                                                          
    server.use(restify.bodyParser({mapParams: true, mapFiles: true})); 

    this.server = server;
    this.port = (port !== 'undefined') ? port : 56659;
    this.eggsContract = contract;
}

/**
 * Start Egg Directory server.
 */
EggDirectory.prototype.start = function () {
    var _this = this;
    // -$- Get total number of eggs -$-
    this.server.get('/eggs/total', function(req, res, next){ 
        _this.eggsContract.getEggCount(function(error, result){
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
    this.server.get('/eggs/get/:eggid', function(req, res, next) {
        _this.eggsContract.getCartonInfo( req.params.eggid, function(error, result) {
            if (error) {
                res.send(500, error);
                return next();
            }

            var resCode = result[0];
            if (resCode == eggerrors.NO_ERROR) {
                var name = result[1];
                var loc = result[2];
                var type = result[3];
                var color = result[4];
                var expiration = new Date(result[5].toNumber());
                var boxedDate = new Date(result[6].toNumber());
                var noe = result[7].toNumber;
                var owner = result[8];
                var json = JSON.stringify( {
                    "Name": name,
                    "Location": loc,
                    "Type": type,
                    "Color": color,
                    "Expiration": DateFormat(expiration, "mm/dd/yyyy"),
                    "Boxed date": DateFormat(boxedDate, "mm/dd/yyyy"),
                    "NoE": noe,
                    "Owner": owner
                }, null, '\t');
                res.send(200, json);
            } else {
                res.send(200, "ERROR getting egg info. " + eggerrors.getErrorMsg(resCode));
            }
            return next();
        });
    });
    
    // -$- Dispose egg carton by carton tag UID -$-
    this.server.get('/eggs/dispose/:eggid', function(req, res, next) {
        var eggid = req.params.eggid;
        _this.eggsContract.disposeCarton(eggid, function (error, result) {
            if (error) {
                res.send(500, error);
                return next;
            }
            if (result == eggerrors.NO_ERROR) {
                res.send(200, "Egg carton " + eggid + " has been disposed.");
                return next();
            } else {
                res.send(200, "ERROR disposing egg carton " + eggid + ". " + eggerrors.getErrorMsg(result));
                return next();
            }
        });
    });

    this.server.get('/eggs/transfer', function(req, res, next) {
        var eggid = req.query.eggid;
        var newOwner = req.query.newOwner;
        _this.eggsContract.transferCarton(eggid, newOwner, function(error, result) {
            if (error) {
                res.send(500, error);
                return next;
            }
            if (result == eggerrors.NO_ERROR) {
                res.send(200, "Egg carton " + eggid + " has been transferred to " + newOwner);
                return next();
            } else {
                res.send(200, "ERROR transferring egg carton " + eggid + ". " + eggerrors.getErrorMsg(result));
                return next();
            }
        });
    });

    this.server.get('/eggs/get/event/:index', function (req, res, next) {
        var eggid = req.query.eggid;
        _this.eggsContract.getCartonEvent(eggid, req.params.index, function (error, result) {
            if (error) {
                res.send(500, error);
                return next;
            }
            var errCode = result[0];
            var etype = result[1];
            var actor = result[2];
            if (errCode == eggerrors.NO_ERROR) {
                var json = JSON.stringify( {
                    'etype': etype,
                    'actor': actor

                }, null, '\t');
                res.send(200, json);
                return next;
            } else {
                res.send(200, "ERROR getting event entry. " + eggerrors.getErrorMsg(errCode));
                return next();
            }
        });
    });

    this.server.listen(this.port);
    console.log("Egg directory running at 0.0.0.0:" + this.port);
}

/**
 * Determine if a tag is a egg tag or not.
 * @param {string} tagval - The json tagdata in string format.
 * @returns {Boolean}
 */
function isEggTag(tagval) {                                                     
    try {                                                                       
        jsonObj = JSON.parse(tagval);                                           
    } catch (e) {                                                               
        return false;                                                           
    }                                                                           
                                                                                
    return (jsonObj.hasOwnProperty('Name') && (jsonObj.Name === "eggs")) || 
        (jsonObj.hasOwnProperty('name') && (jsonObj.name === "eggs"));           
}    

/**
 * ebb *register* command handler
 * @param {Object} r
 * @param token: Placeholder for caller to pass variable.
 */
EbbTerminal.prototype.ebbRegister = function(r, token) {
    var _this = token;
    var verbose = r.flags.v;
    verbose = typeof verbose !== 'undefined' ?  verbose : false;
    return new Promise(function (resolve, reject) {
        try {
            nfctools.scanTags(function (device, tag) {
                if (!!tag) {
                    var cartonInfo = tag.json;
                    _this.eggsContract.registerCarton(tag.uid, 
                        cartonInfo.Name, cartonInfo.Location, cartonInfo.Type,
                        cartonInfo.Color,
                        new Date(cartonInfo.Expiration).getTime(), 
                        new Date(cartonInfo['Boxed date']).getTime(),
                        cartonInfo.NoE, 
                        function(error, errCode) {
                            if (error) {
                                console.log(error);
                                reject(error);
                                return;
                            }
                            if (errCode == eggerrors.NO_ERROR) {
                                _this.printWithExtraLines("Congrats! Registered egg carton  " + 
                                        tag.uid);
                            } else{
                                _this.printWithExtraLines("ERROR registering " + 
                                        tag.uid + ". " + eggerrors.getErrorMsg(errCode));
                            }           
                            resolve("registered");

                    });
                } else {
                    resolve("failed registration");
                }
            }, verbose);
        } catch (e) {
            resolve("unknown error!");
        }
    });

}

/**
 * ebb *transfer* command handler
 */
EbbTerminal.prototype.ebbTransfer = function(r , token) {
    var _this = token;
    var eggid = r.args[0];
    var to = r.parameters.target;
    return new Promise(function (resolve, reject) { 
        _this.eggsContract.transferCarton(eggid, to, function (error, result) {
            if (error) {
                console.log(error);
                reject(error);
            }

            if (result == eggerrors.NO_ERROR) {
                _this.printWithExtraLines("Egg carton " + eggid + 
                        " has been transferred to " + to);
                resolve("transferred");
            } else {
                _this.printWithExtraLines("ERROR transferring egg carton " + 
                        eggid + ". " + eggerrors.getErrorMsg(result));
                resolve("failed transferring");
            }
        });   
    });
}

/**
 * ebb *dispose* command handler
 */
EbbTerminal.prototype.ebbDispose = function (r, token) {
    var _this = token;
    var eggid = r.args[0];
    return new Promise(function(resolve, reject) {
        _this.eggsContract.disposeCarton(eggid, function (error, result) {
            if (error) {
                console.log(error);
                reject(error);
            } else {
                if (result == eggerrors.NO_ERROR) {
                    _this.printWithExtraLines("Egg carton " + eggid + " has been disposed.");
                    resolve("disposed");
                } else {
                    _this.printWithExtraLines("ERROR disposing egg carton " + 
                            eggid + ". " + eggerrors.getErrorMsg(result));
                    resolve("error disposing");
                }
            }
        });
    });

}

/**
 * ebb *help* command heandler
 */
EbbTerminal.prototype.ebbHelp = function (r, token) {
    var _this = token;
    _this.printWithExtraLines(r.help());
    return new Promise(function (resolve, reject) {
        resolve("help");
    });
}

/**
 * ebb customized output print function.
 */
EbbTerminal.prototype.printWithExtraLines = function(result) {
    console.log();
    console.log(result);
    console.log();
}

/**
 * ebb *provision* command handler.
 */
EbbTerminal.prototype.ebbProvision = function (r, token) {
    var _this = token;
    var jsonFile = r.args[0];
    var jsondata = fs.readFileSync(jsonFile, 'utf-8');
    return new Promise(function (resolve, reject) {
        if (!isEggTag(jsondata)) {
            console.log("Error, not a egg tag json file!");
            resolve("failed provision: is not a egg tag");
        } 

        console.log(JSON.parse(jsondata));
        var buf = nfctools.makeTextTagBuffer(jsondata);
        try {
            var nfc = require('nfc').nfc;
            var devices = nfc.scan();
            for (var deviceID in devices) {
                var nfcdev = new nfc.NFC();                                                                             
                nfcdev.start(deviceID); 
                var np = nfcdev.write(buf);
                console.log("Wrote " + np + " pages");
                resolve("provisioned");
            }
        } catch (e) {
            console.log(e);
            reject("failed provision");
        }
    });

}

/**
 * Eggbank Blockchain Bridge (EBB) terminal app
 * @constructor
 * @param {Contract} contract - The eggs contract instance.
 */
    
function EbbTerminal(contract) {
    this.eggsContract = contract;
    var lineparser = require('lineparser-promised');
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
            ['provision', null, ['json file'], 'Provision a tag with provided json file.', this.ebbProvision],
            ['register', ['[v]'], null, 'Register egg carton to eggchain.', this.ebbRegister],
            ['transfer', ['[target]'], ['uid'], 'Transfer egg carton.', this.ebbTransfer],
            ['dispose', null, ['uid'], 'Dispose egg carton.', this.ebbDispose],
            ['help', null, null, 'help', this.ebbHelp],
            [null, null, null, 'help', this.ebbHelp]
        ]
    };

    //var promise = require('bluebird');
    this.optparser = lineparser.init(meta);
    this.argsparser = require('shell-quote').parse;
    //promise.pro
    this.prompt = require('prompt-sync')({
        history: require('prompt-sync-history')('prompt_history.txt', 100)
    });
    
}

/**
 * The terminal command parsing function
 * @param {EggTerminal) ctx - The EggTerminal instance as context.
 */
EbbTerminal.prototype.terminal = function(ctx) {
    var _this = ctx;
    var cmdline = _this.prompt('ebb > ', 'help');
    if (cmdline == 'exit') {
        _this.prompt.history.save();
        return;
    }

    _this.optparser.parse(_this.argsparser(cmdline), _this).then(function (res) {
        _this.terminal(ctx);
    });
}

/**
 * Start the terminal app.
 */
EbbTerminal.prototype.start = function() {
    this.terminal(this);
} 


/**
 * The eggbank app entry.
 */
function eggbank() {
    var args = process.argv.slice(2);
    var account = typeof args[1] !== 'undefined' ? args[1] : 'developer_000';
    var eggsContract = loadEggContract(account);

    if (args[0] == "directory") {
        var port = 56659;
        if (args.length > 2)
            var port = typeof args[2] != 'undefined' ? args[2] : 56659;
        var ED = new EggDirectory(eggsContract, port);
        ED.start();
    }
    else if (args[0] == "terminal") {
        var ET = new EbbTerminal(eggsContract);
        ET.start();
    }
    else {
        console.log('Eggbank usage:');
        console.log('sudo node eggbank.js terminal - Start Eggbank Blockchain Bridge (ebb) app.');
        console.log('node eggbank.js directory - Start Eggbank Directory (ED) app.');
    }

}

eggbank();


