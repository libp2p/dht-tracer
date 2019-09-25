# libp2p DHT tracer webapp

![screenshot](img/dht-tracer-screenshot.png?raw=true)

#### Running this app

Install dependencies

```
yarn
```

Start the app

```
yarn start
```

#### Running dht-tracer1

This is currently compatible with this [fork of dht-tracer1](https://github.com/mplaza/dht-tracer1) on master branch

see [tracedht/tracedht.go](https://github.com/libp2p/dht-tracer1/blob/master/tracedht/tracedht.go) for examples and usage instructions

also note that this is currently pointing to a local checkout of github.com/libp2p/go-libp2p-kad-dht and github.com/ipfs/go-todocounter.

please use this [fork of go-libp2p-kad-dht](https://github.com/mplaza/go-libp2p-kad-dht) on tracer branch for go-libp2p-kad-dht and this [fork of go-todocounter](https://github.com/mplaza/go-todocounter) on tracer branch for go-todocounter

#### Doin Stuff

##### From an eventlog:

run dht-tracer1 to get an eventlog file

```
    tracedht --serve :7000 &
    curl "http://localhost:7000/events" | grep dht >eventlogs
    curl "http://localhost:7000/cmd?q=put-value+foo+bar"
```

upload your favorite sample log file by selecting the 'CHOOSE FILE' option and see it visualized

if your log file has multiple queries, you can switch between them in the queries found row. note that if some of the queries in your file are incomplete (ex. they are missing the initial logs because a query was already occurring when you started saving the logs), then the visualization will just display whatever is available

Sample eventlogs can be found in file named eventlog_sample1

##### From a stream:

run the dht-tracer1 server

```
    tracedht --serve :7000
```

choose 'read from stream' and make sure the address matches where you are running the tracedht server. note that if using chrome you will have to allow-insecure-localhost or use something like lvh.me

issue a query from terminal as seen [here](https://github.com/libp2p/dht-tracer1/blob/master/tracedht/tracedht.go) or use the UI provided

when the eventlogs start streaming in, they will be displayed as they are received

please refresh the app if you wish to return to clear all the displayed queries and return to the main screen
