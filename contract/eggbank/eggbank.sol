/*******************************************************************************
 * Eggbank contract
 ******************************************************************************/
import "errors.sol";


contract EggBank is Errors{
    string TYPE_EGGS = "eggs";

    uint eggCount;

    struct carton {
        string name;
        string location;
        uint expiration;
        uint boxedDate;
        uint noe;   // -$- Number of eggs -$-
        bool exists;
    }
    mapping(string => carton) cartons;
    
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
                         uint expiration, uint boxedDate, uint noe) returns (uint error){
        if(!cartons[uid].exists) {
            cartons[uid].name = name;
            cartons[uid].location = location;
            cartons[uid].expiration = expiration;
            cartons[uid].boxedDate = boxedDate;
            cartons[uid].noe = noe;
            cartons[uid].exists = true;

            if(stringsEqual(TYPE_EGGS, name)) {
                eggCount = eggCount + noe;
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
        if(cartons[uid].exists) {
            cartons[uid].exists = false;
        }

        return NO_ERROR;
    }
    
    //--------------------------------------------------------------------------
    // Get current egg number
    //--------------------------------------------------------------------------
    function getEggCount() constant returns (uint retVal) {
        return eggCount;
    }
}
