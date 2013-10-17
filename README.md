
Thing Tracker Network Client
=====================

#### A p2p client for the [ThingTracker Network](http://thingtracker.net)

----
!!WORK IN PROGRESS!!
----

A node-webkit/node.js client to interact with a DHT p2p network based on [KadOH](https://github.com/jinroh/kadoh).

Some background can be found in [this Google+ post](https://plus.google.com/u/0/106465579732448802787/posts/1yuLciyHbBA).

### Running

#### Start a bot node
* Run `./bin/ttnbot -b 127.0.0.1:3001 -l debug --cli`

```
Usage: ./bin/ttnbot -b 127.0.0.1:3001 -l debug --cli

Options:
  -b, --bootstraps  comma separated list of bootstraps
  -l, --log         log level (debug, info, warn, error, fatal)
  -c, --cli         start repl
  -h, --help        help
```
(Note: press enter after startup if running with the `cli` option to bring focus to the repl console.)

#### Start the client
* Configure the client to reference a bootstrap node (such as the bot above)
* Assuming [node-webkit](https://github.com/rogerwang/node-webkit) is installed, run `./bin/start-client` (which is a shortcut to calling `nw .` in the project folder).

#### Start a pool of bots
* Run `./bin/dht udp.small`, where 'udp.small' is the name of a config file in `bin/config` (without the .json extension).

#### Starting in command line mode
* Run `node js/cli.js`
(Note: this currently appears to hang the terminal after stopping)

### Developing
* Clone this project.
* Run `npm install` to retrieve the relevant node modules.
* Run `git submodule init` and `git submodule update` to pull in the custom version of KadOH.
* Also run `npm install` under `node_modules/kadoh` to pull in their dependencies. (_NOTE: Not sure if this is the best way to go about distributing this_).

#### Debugging
It might be worth using the debug UI of the [KadOH](https://github.com/jinroh/kadoh) project to connect to the network. See instructions in that project.


### License
MIT