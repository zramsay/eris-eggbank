# Eggbank contracts
Smart contracts runnning on `Eggchain`.

## To Compile
The package to compile the solidity contract code is `eris pkgs`. Full command to 
compile the contracts against the `eggchain` running at port `56657` (RPC port#) is:
```bash
eris pkgs do --chain eggchain --chain-port 56657 -b eggbank_abi/ -f eggbank_epm.yaml --address 7CC9DF7013F3B56E85A237B7DEC75DEEFC27FC73 -d
```

To check details of the compiling command `eris pkgs do -h`.


