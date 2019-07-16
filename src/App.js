import React, { Component } from 'react'
//import { Chart } from 'react-google-charts'
import { Chart } from './Chart'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons'
import { DateTime } from 'luxon'
import './App.css'

let fileReader
const windowWidth = window.innerWidth - 300

class App extends Component {
  state = {
    data: null,
    queryStart: null,
    queryId: null,
  }
  formattedArray = []

  // parseLogs(array) {
  //   return array.map((event) => {
  //     const logs = event.Logs.map((log) => {
  //       return log.Fields[0]
  //     })
  //     for (let i = 0; i < logs.length; i++) {
  //       const log = logs[i]
  //       if (log.Key === 'PeersQueried' || log.Key === 'PeersSeen') {
  //         const peerString = log.Value.slice(1, -1)
  //         const peerArr = peerString.split(' ')
  //         event[log.Key] = peerArr
  //       } else {
  //         event[log.Key] = log.Value
  //       }
  //     }

  //     return event
  //   })
  // }

  handleFileRead = (e) => {
    // TODO: reject random files
    const content = fileReader.result
    const array = content.split('\n')
    this.formattedArray = array.map((event) => {
      try {
        return JSON.parse(event)
      } catch {
        return { error: 'incorrectly formatted event' }
      }
    })

    const queryStart = this.formattedArray.filter(
      (event) => event.event === 'dhtQueryRunner.Run.Start',
    )

    const queryId = queryStart[0].QueryRunner.Query.Key
    this.setState({ queryId, queryStart })
    this.filterData(queryId)
  }

  changeQueryFilter(queryId) {
    console.log('change to', queryId)
    if (queryId === this.state.queryId) {
      return
    }
    this.setState({ queryId })
    this.filterData(queryId)
  }

  findEventsForTypeAndQuery(type, queryId) {
    return this.formattedArray
      .filter((event) => event.event === type)
      .filter((event) => event.QueryRunner.Query.Key === queryId)
  }

  combineQueryActions(queryId) {
    const peerQueries = {}

    const queryStartArray = this.findEventsForTypeAndQuery(
      'dhtQueryRunner.queryPeer.Start',
      queryId,
    )

    const queryEndArray = this.findEventsForTypeAndQuery(
      'dhtQueryRunner.queryPeer.End',
      queryId,
    )

    const queryResultArray = this.findEventsForTypeAndQuery(
      'dhtQueryRunner.queryPeer.Result',
      queryId,
    )

    // combine these events to get the 'query' action
    for (const peerQuery of queryStartArray) {
      peerQueries[peerQuery.peerID] = {}
      peerQueries[peerQuery.peerID].start = peerQuery.time
      peerQueries[peerQuery.peerID].xor = peerQuery.XOR
    }

    // if there is no start event ignore these (probably came in from an interrupted log and no way to calc duration)
    for (const peerQuery of queryEndArray) {
      if (peerQueries[peerQuery.peerID]) {
        peerQueries[peerQuery.peerID].end = peerQuery.time
      }
    }

    const findNumNewPeers = (peerQuery) => {
      const {
        filteredPeers,
        QueryRunner: { PeersSeen },
      } = peerQuery
      let newPeersNum = 0
      for (const peer of filteredPeers) {
        if (!PeersSeen.includes(peer)) {
          newPeersNum += 1
        }
      }

      return newPeersNum
    }

    for (const peerQuery of queryResultArray) {
      if (peerQueries[peerQuery.peerID]) {
        peerQueries[peerQuery.peerID].success = peerQuery.success
        peerQueries[peerQuery.peerID].filteredPeers = peerQuery.filteredPeers
        peerQueries[peerQuery.peerID].closerPeers = peerQuery.closerPeers
        peerQueries[peerQuery.peerID].newPeersNum = findNumNewPeers(peerQuery)
      }
    }

    return peerQueries
  }

  combineDialActions(queryId) {
    const peerDials = {}
    const dialStartArray = this.findEventsForTypeAndQuery(
      'dhtQueryRunner.dialPeer.Dialing',
      queryId,
    )

    const dialFailureArray = this.findEventsForTypeAndQuery(
      'dhtQueryRunner.dialPeer.DialFailure',
      queryId,
    )

    const dialSuccessArray = this.findEventsForTypeAndQuery(
      'dhtQueryRunner.dialPeer.DialSuccess',
      queryId,
    )

    const alreadyConnectedArray = this.findEventsForTypeAndQuery(
      'dhtQueryRunner.dialPeer.AlreadyConnected',
      queryId,
    )

    for (const peerDial of dialStartArray) {
      if (peerDials[peerDial.peerID]) {
        peerDials[peerDial.peerID].duplicate = true
      } else {
        peerDials[peerDial.peerID] = {}
      }
      peerDials[peerDial.peerID].start = peerDial.time
      peerDials[peerDial.peerID].xor = peerDial.XOR
    }

    for (const peerDial of dialFailureArray) {
      if (peerDials[peerDial.peerID]) {
        peerDials[peerDial.peerID].end = peerDial.time
        peerDials[peerDial.peerID].success = false
      }
    }

    for (const peerDial of dialSuccessArray) {
      if (peerDials[peerDial.peerID]) {
        peerDials[peerDial.peerID].end = peerDial.time
        peerDials[peerDial.peerID].success = true
      }
    }

    for (const peerDial of alreadyConnectedArray) {
      if (peerDials[peerDial.peerID]) {
        peerDials[peerDial.peerID].duplicate = true
      } else {
        peerDials[peerDial.peerID] = {}
      }
      peerDials[peerDial.peerID].start = peerDial.time
      peerDials[peerDial.peerID].end = peerDial.time
      peerDials[peerDial.peerID].alreadyConnected = true
      peerDials[peerDial.peerID].success = true
      peerDials[peerDial.peerID].xor = peerDial.XOR
    }

    return peerDials
  }

  filterData(queryId) {
    const peerQueriesObject = this.combineQueryActions(queryId)
    const peerDialsObject = this.combineDialActions(queryId)

    const queryRunnerRunStart = this.findEventsForTypeAndQuery(
      'dhtQueryRunner.Run.Start',
      queryId,
    )[0]
    const queryRunnerRunEnd = this.findEventsForTypeAndQuery(
      'dhtQueryRunner.Run.End',
      queryId,
    )[0]

    let dateStart = null
    let dateEnd = null

    const formatDate = (date) => {
      if (!date) {
        return null
      }
      const dateTime =
        typeof date === 'string'
          ? DateTime.fromISO(date)
          : DateTime.fromMillis(date)
      if (!dateStart || dateTime < dateStart) {
        dateStart = dateTime
      }
      if (!dateEnd || dateTime > dateEnd) {
        dateEnd = dateTime
      }

      return dateTime
    }

    const data = {
      queries: [],
      start: null,
      end: null,
    }

    if (!queryRunnerRunStart) {
      return
    }

    let queryDuration = 0
    let start = 0
    let end = 0
    try {
      queryDuration =
        new Date(queryRunnerRunEnd.time) - new Date(queryRunnerRunStart.time)
      start = formatDate(queryRunnerRunStart.time)
      end = formatDate(queryRunnerRunEnd.time)
    } catch {}
    const query = {
      id: queryId,
      seen: queryRunnerRunEnd.QueryRunner.PeersSeen.length,
      queried: queryRunnerRunEnd.QueryRunner.PeersQueried.length,
      toQuery: queryRunnerRunEnd.QueryRunner.PeersToQueryLen,
      duration: queryDuration,
      start,
      end,
      peers: [],
    }

    const findAndAddPeerAction = (peer, peerData) => {
      let foundPeer = query.peers.find((p) => p.id === peer)
      if (!foundPeer) {
        foundPeer = {
          id: peer,
          actions: [],
        }
        query.peers.push(foundPeer)
      }

      ;[
        'dup',
        'filteredPeersNum',
        'closerPeersNum',
        'newPeersNum',
        'xor',
      ].forEach((key) => {
        if (!(key in peerData)) return
        foundPeer[key] = peerData[key]
      })

      foundPeer.actions.push({
        type: peerData.type,
        start: peerData.start,
        end: peerData.end,
        duration: peerData.duration,
        success: peerData.success,
      })
    }

    for (const peer in peerQueriesObject) {
      const peerObj = peerQueriesObject[peer]
      const {
        filteredPeers,
        closerPeers,
        newPeersNum,
        success,
        end,
        start,
      } = peerObj
      const filteredPeersNum = filteredPeers ? filteredPeers.length : 0
      const closerPeersNum = closerPeers ? closerPeers.length : 0
      findAndAddPeerAction(peer, {
        type: 'query',
        filteredPeersNum,
        closerPeersNum,
        newPeersNum,
        success,
        duration: new Date(end) - new Date(start),
        start: formatDate(start),
        end: formatDate(end),
      })
    }

    for (const peer in peerDialsObject) {
      const peerObj = peerDialsObject[peer]
      const { duplicate, alreadyConnected, success, end, start, xor } = peerObj
      findAndAddPeerAction(peer, {
        type: 'dial',
        dup: duplicate,
        alreadyConnected,
        success,
        xor,
        duration: new Date(end) - new Date(start),
        start: formatDate(start),
        end: formatDate(end),
      })
    }

    data.start = dateStart
    data.end = dateEnd
    data.queries.push(query)

    this.setState({
      data: data,
    })
  }

  handleFileChosen = (file) => {
    fileReader = new FileReader()
    fileReader.onloadend = this.handleFileRead
    fileReader.readAsText(file)
  }

  render() {
    const { data, queryStart, queryId, dateStart, dateEnd } = this.state

    return (
      <div>
        <h4 className="text-center padding">DHT Tracer </h4>
        {queryStart && (
          <div>
            {' '}
            Queries Found:
            {queryStart &&
              queryStart.map((query) => (
                <button
                  onClick={() =>
                    this.changeQueryFilter(query.QueryRunner.Query.Key)
                  }
                  className={`queryId ${queryId ===
                    query.QueryRunner.Query.Key && 'selected'}`}
                  key={query.QueryRunner.Query.Key}
                >
                  {query.QueryRunner.Query.Key}
                  {query.QueryRunner.Query.Key === queryId && (
                    <FontAwesomeIcon
                      icon={faCheckCircle}
                      style={{ color: '#7DC24B' }}
                    />
                  )}
                </button>
              ))}
          </div>
        )}
        <div className="row center">
          <label for="file-upload" class="custom-file-upload">
            Choose file with log output
          </label>
          <input
            type="file"
            id="file-upload"
            className="inputfile"
            onChange={(e) => this.handleFileChosen(e.target.files[0])}
          />
        </div>
        <div className={'my-pretty-chart-container'}>
          {data && <Chart width={windowWidth} data={data} />}
        </div>
      </div>
    )
  }
}

export default App
