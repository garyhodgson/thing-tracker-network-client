
Thing Tracker Network Client
=====================

#### A p2p client for the [ThingTracker Network](http://thingtracker.net)

----
!!WORK IN PROGRESS!!
----

A node-webkit/node.js client to interact with a DHT p2p network based on [KadOH](https://github.com/jinroh/kadoh).

Some background can be found in [this Google+ post](https://plus.google.com/u/0/106465579732448802787/posts/1yuLciyHbBA).

### Running

#### Start a bootstrap node
* Run `node ./bin/ttn-bootstrap`

#### Start the client
* Configure the client to reference a bootstrap node
* Assuming [node-webkit](https://github.com/rogerwang/node-webkit) is installed, run `nw --enable-logging .` in the project folder.

#### Starting in command line mode
* Run `node js/cli.js`
* Run `node js/cli.js -h for options`

### Rapsberry Pi Notes

#### Generating Keys

The node keypair module is prohibitively slow in generating keys on Raspberry Pi.  Instead use ssh-keygen to first create private and public keys and reference these in the ttn config. Create the following config under ```/home/pi/.ttn/ttn-config.json```

```
{
  "dht": {
    "bootstraps": [
      "127.0.0.1:3001"
    ],
    "port": 9880
  },
  "RESTServer": {
    "port": 9880
  },
  "startup": {
    "joinDHT": "true",
    "startRESTServer": "true"
  },
  "dataPath": "/home/pi/.ttn/data",
  "privateKey": "/home/pi/.ssh/id_rsa",
  "publicKey": "/home/pi/.ssh/id_rsa.pub"
}
```


To install a ttn-bootstrap or node as a service on a Raspberry Pi, and have it start at boot, I used initd-forever and forever:

```
sudo npm install -g forever
sudo npm install initd-forever -g
sudo initd-forever -a /opt/ttn-client/bin/ttn-bootstrap -n ttn-bootstrap -l /var/log/ttn-bootstrap.log
sudo mv ttn-bootstrap /etc/init.d/
sudo chmod 667 /etc/init.d/ttn-bootstrap
sudo service ttn-bootstrap start
sudo update-rc.d ttn-bootstrap defaults
```

### Connecting to a running cli instance

The cli version of the client can start a REPL instance, either interactively (```node js/cli.js -i```) or in the background on a TCP port:

```
node js/cli.js -r 50001
```

Access to the live client can be achieved via telnet:

```
telnet localhost 50001
```

(using GNU rlwrap makes for a nicer experience, i.e. ```rlwrap telnet localhost 50001```)

Exit the session using the REPL command: ```.exit```

Commands can also be run via netcat, e.g.

```
echo "ttnNode.dhtNode.ttnKadohNode.announce(\"test message\")" | nc localhost 50001
```



### Developing
* Clone this project.
* Run `npm install` to retrieve the relevant node modules.

#### Debugging
It might be worth using the debug UI of the [KadOH](https://github.com/jinroh/kadoh) project to connect to the network. See instructions in that project.


### License
MIT