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

  parseLogs(array) {
    return array.map((event) => {
      const logs = event.Logs.map((log) => {
        return log.Fields[0]
      })
      for (let i = 0; i < logs.length; i++) {
        const log = logs[i]
        if (log.Key === 'PeersQueried' || log.Key === 'PeersSeen') {
          const peerString = log.Value.slice(1, -1)
          const peerArr = peerString.split(' ')
          event[log.Key] = peerArr
        } else {
          event[log.Key] = log.Value
        }
      }

      return event
    })
  }

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

    const queryStart = this.parseLogs(
      this.formattedArray.filter(
        (event) => event.Operation === 'dhtQueryRunnerStart',
      ),
    )
    const queryId = queryStart[0].query
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

  filterData(queryId) {
    console.log('query id is', queryId)

    const queryArray = this.parseLogs(
      this.formattedArray.filter((event) => event.Operation === 'queryPeer!'),
    ).filter((event) => event.query === queryId)

    const dialArray = this.parseLogs(
      this.formattedArray.filter((event) => event.Operation === 'dialPeer!'),
    ).filter((event) => event.query === queryId)

    const queryRunnerArray = this.parseLogs(
      this.formattedArray.filter(
        (event) => event.Operation === 'dhtQueryRunner',
      ),
    ).filter((event) => {
      const queryKeyRegex = new RegExp(queryId, 'g')

      return event.Query.match(queryKeyRegex)
    })
    const queryRunner = queryRunnerArray[0]
    console.log('queryRunnerArray is', queryRunnerArray)

    let dateStart = null
    let dateEnd = null

    const formatDate = (date) => {
      //return new Date(date)
      //const dateTime = DateTime.fromJSDate(new Date(date))
      console.log(typeof date, date)
      const dateTime =
        typeof date === 'string'
          ? DateTime.fromISO(date)
          : DateTime.fromMillis(date)
      //const dateTime = new Date(date)
      if (!dateStart || date < dateStart) dateStart = dateTime
      if (!dateEnd || date > dateEnd) dateEnd = dateTime

      return dateTime
    }

    const data = {
      queries: [],
      start: null,
      end: null,
    }

    if (!queryRunner) {
      return
    }

    const query = {
      id: queryId,
      seen: queryRunner.PeersSeen.length,
      queried: queryRunner.PeersQueried.length,
      duration: (queryRunner.Duration / 1000000000).toFixed(2),
      start: formatDate(queryRunner.StartTime),
      end: formatDate(queryRunner.EndTime),
      peers: [],
    }

    const peersQueried = {}
    const findAndAddPeerAction = (peer, peerData) => {
      let foundPeer = query.peers.find((p) => p.id === peer.peer)
      if (!foundPeer) {
        foundPeer = {
          id: peer.peer,
          actions: [],
        }
        query.peers.push(foundPeer)
      }

      ;['dup', 'filteredPeersNum', 'closerPeersNum'].forEach((key) => {
        if (!peerData[key]) return
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

    for (const peer of queryArray) {
      findAndAddPeerAction(peer, {
        type: 'query',
        filteredPeersNum: peer.filteredPeers,
        closerPeersNum: peer.closerPeers,
        success: peer.success,
        duration: (peer.Duration / 1000000).toFixed(2),
        start: formatDate(peer.Start),
        end: formatDate(
          new Date(peer.Start).getTime() + peer.Duration / 1000000,
        ),
      })
    }

    for (const peer of dialArray) {
      let duplicate = false
      if (peersQueried[peer.peer]) {
        duplicate = true
      }
      peersQueried[peer.peer] = true

      findAndAddPeerAction(peer, {
        type: 'dial',
        dup: duplicate,
        success: peer.dialSuccess,
        duration: (peer.Duration / 1000000).toFixed(2),
        start: formatDate(peer.Start),
        end: formatDate(
          new Date(peer.Start).getTime() + peer.Duration / 1000000,
        ),
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
    console.log('data is', data)

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
                  onClick={() => this.changeQueryFilter(query.query)}
                  className={`queryId ${queryId === query.query && 'selected'}`}
                  key={query.query}
                >
                  {query.query}
                  {query.query === queryId && (
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
