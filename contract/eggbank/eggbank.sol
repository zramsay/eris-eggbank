/**
 * Eggbank contract
 */

import "errors.sol";
import "event_tracker.sol";

/**
 * The Eggbank class
 */
contract EggBank is Errors, EventTracker{

    struct UserProfile {
        address addr;
        uint noe;
        bool exists;
    }

    struct Carton {
        string name;
        string location;
        string color;
        string eggType;
        uint expiration;
        uint boxedDate;
        uint noe;   // -$- Number of eggs -$-
        bool exists;
        address ownerAddr;
        history hist;
    }
    string TYPE_EGGS = "eggs";

    uint eggCount;

    
    mapping(string => Carton) cartons;
    mapping(string => history) eternal;
    mapping(address => UserProfile) users;
    
    //--------------------------------------------------------------------------
    // Constructor 
    //--------------------------------------------------------------------------
    function EggBank() {
        eggCount = 0;
    }

    //--------------------------------------------------------------------------
    // Compare memory strong and storage string
    //--------------------------------------------------------------------------
    function stringsEqual(string storage _a, string memory _b) internal 
                        returns (bool) {
        bytes storage a = bytes(_a);
        bytes memory b = bytes(_b);

        if (a.length != b.length)
            return false;

        for (uint i = 0; i < a.length; i++)
            if (a[i] != b[i])
                return false;

        return true;
    }

    //--------------------------------------------------------------------------
    // Register egg carton
    //--------------------------------------------------------------------------
    function registerCarton(string uid, string name, string location, string eggType,
                            string color, uint expiration, uint boxedDate, uint noe) 
                            returns (uint error) {
        if(!cartons[uid].exists) {
            
            cartons[uid].name = name;
            cartons[uid].location = location;
            cartons[uid].eggType = eggType;
            cartons[uid].color = color;
            cartons[uid].expiration = expiration;
            cartons[uid].boxedDate = boxedDate;
            cartons[uid].noe = noe;
            cartons[uid].exists = true;
            cartons[uid].ownerAddr = msg.sender;
            UserProfile owner = users[msg.sender];
            if (!owner.exists) {
                owner.addr = msg.sender;
                owner.exists = true;
            }
            if(stringsEqual(TYPE_EGGS, name)) {
                eggCount = eggCount + noe;
                owner.noe = owner.noe + noe;
            }             

            uint err = registerEvent(cartons[uid].hist, msg.sender);
            if (err != 0) {
                cartons[uid].exists = false;
                eggCount -= noe;
                owner.noe -= noe;
                return err;
            }
            return NO_ERROR;
        } else {
            return RESOURCE_ALREADY_EXISTS;
        }
    }
        
    //--------------------------------------------------------------------------
    // Dispose carton
    //--------------------------------------------------------------------------
    function disposeCarton(string uid) returns (uint error){
        Carton c = cartons[uid];
        if(!c.exists) return RESOURCE_NOT_FOUND;
        if (msg.sender != c.ownerAddr) return ACCESS_DENIED;

        c.exists = false;
        eggCount = eggCount - c.noe;
        UserProfile owner = users[c.ownerAddr];
        owner.noe -= c.noe;

        uint err = disposeEvent(c.hist, msg.sender);
        if (err != 0) {
            c.exists = true;
            eggCount = eggCount + c.noe;
            owner.noe += c.noe;
            return err;
        }

        history hist = eternal[uid];
        hist.length = c.hist.length;
        c.hist.length = 0;
        // -$- Copy event entries -$-
        for (uint i = 1; i <= hist.length; i++ ) {
            hist.events[i] = c.hist.events[i];
        }
        return NO_ERROR;
    }
    
    //--------------------------------------------------------------------------
    // Get current egg number
    //--------------------------------------------------------------------------
    function getEggCount() constant returns (uint retVal) {
        return eggCount;
    }
    
    //--------------------------------------------------------------------------
    // Retrieve the carton information 
    //--------------------------------------------------------------------------
    function getCartonInfo(string uid) returns (uint error, string name, 
                string location, string eggType, string color, uint expiration, 
                uint boxedDate, uint noe, address owner) {
        if(!cartons[uid].exists) error = RESOURCE_NOT_FOUND;
        else {
            Carton eggCarton = cartons[uid];
            name = eggCarton.name;
            eggType = eggCarton.eggType;
            color = eggCarton.color;
            location = eggCarton.location;
            expiration = eggCarton.expiration;
            boxedDate = eggCarton.boxedDate;
            noe = eggCarton.noe;
            owner = eggCarton.ownerAddr;

            error = NO_ERROR;
        }
        return;
    }
   
    //--------------------------------------------------------------------------
    // Retrieve user information.
    //--------------------------------------------------------------------------
    function getUserInfo(address addr) returns (uint error, uint noe) {
        UserProfile u = users[addr];
        if (!u.exists) error = RESOURCE_NOT_FOUND;
        else {
            noe = u.noe;
            error = NO_ERROR;
        }
    }

    //--------------------------------------------------------------------------
    // Transfer the egg ownership to newOwner
    //--------------------------------------------------------------------------
    function transferCarton(string uid, address newAddr) returns (uint error) {
        Carton c = cartons[uid];
        if(!c.exists) return RESOURCE_NOT_FOUND;
        else {
            if (msg.sender != c.ownerAddr) {
                return ACCESS_DENIED;
            }
            address privAddr = c.ownerAddr;
            UserProfile privOwner = users[privAddr];
            UserProfile newOwner = users[newAddr];
            if (!newOwner.exists) {
                newOwner.addr = newAddr;
                newOwner.exists = true;
            }
            privOwner.noe -= c.noe;
            newOwner.noe += c.noe;

            c.ownerAddr = newAddr;

            uint err = transferEvent(c.hist, msg.sender, newAddr); 
            if (err != 0) {
                c.ownerAddr = privAddr;
                privOwner.noe += c.noe;
                newOwner.noe -= c.noe;
                return err;
            }

            return NO_ERROR;
        }

    }
    
    //--------------------------------------------------------------------------
    // Get carton event entry
    //--------------------------------------------------------------------------
    function getCartonEvent(string uid, uint idx) returns (uint error, uint etype, address actor) {
        Carton c = cartons[uid];
        if (c.exists) {
            if (idx > c.hist.length) return (ARRAY_INDEX_OUT_OF_BOUNDS, 0, 0);
            event_t e = c.hist.events[idx];
            return (NO_ERROR, e.etype, e.actor);
        }

        if (eternal[uid].length != 0) {
            if (idx > eternal[uid].length) return (ARRAY_INDEX_OUT_OF_BOUNDS, 0, 0);
            e = eternal[uid].events[idx];
            return (NO_ERROR, e.etype, e.actor);
        }
        return (RESOURCE_NOT_FOUND, 0, 0);
    }



}
