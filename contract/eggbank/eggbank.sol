/*******************************************************************************
 * Eggbank contract
 ******************************************************************************/
import "errors.sol";
import "event_tracker.sol";

contract EggBank is Errors, EventTracker{
    string TYPE_EGGS = "eggs";

    uint eggCount;

    struct carton {
        string name;
        string location;
        uint expiration;
        uint boxedDate;
        uint noe;   // -$- Number of eggs -$-
        bool exists;
        address owner;
        history hist;
    }
    mapping(string => carton) cartons;
    mapping(string => history) eternal;
    
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
    function registerCarton(string uid, string name, string location, 
                         uint expiration, uint boxedDate, uint noe) 
                         returns (uint error) {
        if(!cartons[uid].exists) {
            
            cartons[uid].name = name;
            cartons[uid].location = location;
            cartons[uid].expiration = expiration;
            cartons[uid].boxedDate = boxedDate;
            cartons[uid].noe = noe;
            cartons[uid].exists = true;
            cartons[uid].owner = msg.sender;

            if(stringsEqual(TYPE_EGGS, name)) {
                eggCount = eggCount + noe;
            }             
            //*
            uint err = registerEvent(cartons[uid].hist, msg.sender);
            if (err != 0) {
                cartons[uid].exists = false;
                eggCount = eggCount - noe;
                return err;
            }
            //*/
            return NO_ERROR;
        } else {
            return RESOURCE_ALREADY_EXISTS;
        }
    }
        
    //--------------------------------------------------------------------------
    // Dispose carton
    //--------------------------------------------------------------------------
    function disposeCarton(string uid) returns (uint error){
        carton c = cartons[uid];
        if(!c.exists) return RESOURCE_NOT_FOUND;
        if (msg.sender != c.owner) return ACCESS_DENIED;

        c.exists = false;
        eggCount = eggCount - c.noe;

        uint err = disposeEvent(c.hist, msg.sender);
        if (err != 0) {
            c.exists = true;
            eggCount = eggCount + c.noe;
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
                string location, uint expiration, uint boxedDate, uint noe, 
                                               address owner) {
        if(!cartons[uid].exists) error = RESOURCE_NOT_FOUND;
        else {
            error = NO_ERROR;
            carton eggCarton = cartons[uid];
            name = eggCarton.name;
            location = eggCarton.location;
            expiration = eggCarton.expiration;
            boxedDate = eggCarton.boxedDate;
            noe = eggCarton.noe;
            owner = eggCarton.owner;
        }
        return;
    }
    
    //--------------------------------------------------------------------------
    // Transfer the egg ownership to newOwner
    //--------------------------------------------------------------------------
    function transferCarton(string uid, address newOwner) returns (uint error) {
        carton c = cartons[uid];
        if(!c.exists) return RESOURCE_NOT_FOUND;
        else {
            if (msg.sender != c.owner) {
                return ACCESS_DENIED;
            }
            address privOwner = c.owner;
            c.owner = newOwner;

            uint err = transferEvent(c.hist, msg.sender, newOwner); 
            if (err != 0) {
                c.owner = privOwner;
                return err;
            }

            return NO_ERROR;
        }

    }
    
    //--------------------------------------------------------------------------
    // Get carton event entry
    //--------------------------------------------------------------------------
    function getCartonEvent(string uid, uint idx) returns (uint error, uint etype, address actor) {
        carton c = cartons[uid];
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
