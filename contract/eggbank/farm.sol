import "./idi.sol"

contract Farm {
  enum EGGSIZE {
    MEDIUM,
    LARGE
  }

  // EggInfo 
  struct EggInfo {
    string tagID;
    EGGSIZE size;
  }
  
  address _owner;
  IdisContractsFTW _idi;

  mapping (string => EggInfo) eggs;

  mapping (address => uint) orders; 
  uint orderID = 1;

  // Constructor
  function Farm() {
    _owner = msg.sender;
    _idi = new IdisContractsFTW();
  }

  modifier onlyOwner {
    if (msg.sender == owner)
      -
  }
  
  // Order a dozen eggs for consumer
  function orderDozenEggs() returns int {
    uint curNum =  _idi.get();

    if (orders[msg.sender] != 0 || curNum < 12) {
      return -1; 
    } 
    orders[msg.sender] = orderID++;
    return orders[msg.sender];
  }
}



