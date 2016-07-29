import "errors.sol";

contract EventTracker is Errors {
    uint constant EVENT_REGISTER = 1;
    uint constant EVENT_TRANSFER = 2;
    uint constant EVENT_DISPOSE = 3;

    struct event_t{
        uint etype;
        address actor;
        address counterparty;
        uint timestamp;
    }

    struct history {
        uint length;
        mapping(uint => event_t) events;
    }

    function addEvent(history storage hist, uint etype, address actor, 
                      address counterparty) internal {
        hist.length = hist.length + 1;
        event_t thisEvt = hist.events[hist.length];
        thisEvt.etype = etype;
        thisEvt.actor = actor;
        thisEvt.counterparty = counterparty;
        thisEvt.timestamp = block.timestamp;
        return;
    }

    function registerEvent(history storage hist, address actor) internal 
                    returns (uint error) {
        if (hist.length != 0) return INVALID_STATE;

        addEvent(hist, EVENT_REGISTER, actor, 0);
        return NO_ERROR;
    }

    function transferEvent(history storage hist, address actor, address counterparty) 
                    internal returns (uint error) {
        addEvent(hist, EVENT_TRANSFER, actor, counterparty);
        return NO_ERROR;
    }

    function disposeEvent(history storage hist, address actor) internal 
                    returns (uint error) {
        addEvent(hist, EVENT_DISPOSE, actor, 0);
        return NO_ERROR;
    }

}
