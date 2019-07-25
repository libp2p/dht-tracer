import React, { Component } from 'react'
//import { Chart } from 'react-google-charts'
import { Chart } from './Chart'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faCheckCircle,
  faExclamationCircle,
} from '@fortawesome/free-solid-svg-icons'

import './App.css'
import { EventLogParser } from './Services/EventLogParser'

let fileReader
const windowWidth = window.innerWidth - 300

class App extends Component {
  state = {
    data: null,
    queryId: null,
    darkMode: false,
    readingStream: false,
    fileReadError: false,
  }
  formattedArray = []

  readStream = () => {
    this.setState({ readingStream: true })
    console.log('READ STREAM')
    if (!!window.EventSource) {
      var source = new EventSource('http://lvh.me:7000/events')
    }
    source.addEventListener(
      'open',
      function(e) {
        console.log('opened')
      },
      false,
    )

    source.addEventListener(
      'error',
      function(e) {
        console.log('error')
        if (e.readyState === EventSource.CLOSED) {
          console.log('connection closed')
        }
      },
      false,
    )
    source.addEventListener(
      'message',
      (e) => {
        // deep copy
        const data = JSON.parse(
          JSON.stringify(EventLogParser.formatNewEvent(JSON.parse(e.data))),
        )

        this.setState({ data })
      },
      false,
    )
  }

  handleFileChosen = (file) => {
    fileReader = new FileReader()
    fileReader.onloadend = this.handleFileRead
    fileReader.readAsText(file)
  }

  handleFileRead = (e) => {
    // TODO: reject random files
    const content = fileReader.result
    try {
      this.formattedArray = EventLogParser.parseFileContent(content)
      this.identifyFirstQuery()
      this.filterData()
    } catch {
      this.setState({ fileReadError: true })
    }
  }

  identifyFirstQuery = () => {
    // use the dhtQueryRunner.Run.Start event to identify which queries are present in the file
    const queryStart = this.formattedArray.filter(
      (event) => event.event === 'dhtQueryRunner.Run.Start',
    )
    console.log('query start is', queryStart)
    // initially show the first query that was started within the file

    const queryId = queryStart[0].QueryRunner.Query.Key
    this.setState({ queryId })
  }

  changeQueryFilter = (queryId) => {
    if (queryId === this.state.queryId) {
      return
    }
    this.setState({ queryId })
  }

  filterData = () => {
    // filter and reformat the data for the visualization
    EventLogParser.formattedArray = this.formattedArray
    const data = EventLogParser.formatEvents()
    this.setState({ data })
  }

  toggleDarkMode = () => {
    const { darkMode } = this.state
    const newDarkMode = !darkMode
    this.setState({ darkMode: newDarkMode })
    if (newDarkMode) {
      document.body.classList.add('darkMode')
    } else {
      document.body.classList.remove('darkMode')
    }
  }

  render() {
    let { data, queryId, darkMode, readingStream, fileReadError } = this.state

    console.log('data is', data)
    if (data && data.queries && !queryId) {
      queryId = Object.keys(data.queries)[0]
    }

    return (
      <div className="tracer">
        <h4 className="text-center padding">DHT Tracer </h4>
        {fileReadError && (
          <div className="errorMessage">
            <div>
              <FontAwesomeIcon
                icon={faExclamationCircle}
                className="errorIcon"
              />
              Sorry, your log file seems to be improperly formatted. Please make
              sure there isn't any extra info in your log file and your log
              entries are formatted like the below examples:{' '}
            </div>
            <code>{`data: {"QueryRunner":{"CurrTime":"2019-07-24T18:26:20.321273-07:00","EndTime":"0001-01-01T00:00:00Z","PeersDialQueueLen":0,"PeersDialed":null,"PeersDialedNew":[],"PeersQueried":[],"PeersRemainingLen":0,"PeersSeen":[],"PeersToQueryLen":0,"Query":{"Concurrency":0,"Key":"/provider/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ","Type":""},"RateLimit":{"Capacity":3,"Length":0},"Result":{"CloserPeers":null,"FinalSet":null,"FoundPeer":"","QueriedSet":null,"Success":false},"StartTime":"2019-07-24T18:26:20.321265-07:00"},"event":"dhtQueryRunner.Run.Start","system":"dht","time":"2019-07-25T01:26:20.321328Z"}\n\ndata: {"Hops":0,"QueryRunner":{"CurrTime":"2019-07-24T18:26:20.321372-07:00","EndTime":"0001-01-01T00:00:00Z","PeersDialQueueLen":0,"PeersDialed":null,"PeersDialedNew":[],"PeersQueried":[],"PeersRemainingLen":0,"PeersSeen":["QmU74uDuMSgouK61ND71bjaYxTJme7iUxAqzp6RygtzQb3"],"PeersToQueryLen":0,"Query":{"Concurrency":0,"Key":"/provider/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ","Type":""},"RateLimit":{"Capacity":3,"Length":3},"Result":{"CloserPeers":null,"FinalSet":null,"FoundPeer":"","QueriedSet":null,"Success":false},"StartTime":"2019-07-24T18:26:20.321265-07:00"},"XOR":12,"event":"dhtQueryRunner.addPeerToQuery","peerID":"QmU74uDuMSgouK61ND71bjaYxTJme7iUxAqzp6RygtzQb3","system":"dht","time":"2019-07-25T01:26:20.321409Z"}`}</code>
          </div>
        )}
        {data && queryId && (
          <div>
            {' '}
            Queries Found:
            {data &&
              Object.keys(data.queries).map((key) => (
                <button
                  onClick={() => this.changeQueryFilter(key)}
                  className={`queryId ${queryId === key && 'selected'}`}
                  key={key}
                >
                  {key}
                  {key === queryId && (
                    <FontAwesomeIcon
                      icon={faCheckCircle}
                      style={{ color: '#7DC24B' }}
                    />
                  )}
                </button>
              ))}
          </div>
        )}
        {!data && (
          <>
            <div className="row center">
              <button onClick={this.toggleDarkMode}>Toggle Dark Mode</button>
            </div>
            <div className="row center">
              <label htmlFor="file-upload" className="customFileUpload">
                CHOOSE FILE
              </label>
              <input
                type="file"
                id="file-upload"
                className="inputfile"
                onChange={(e) => this.handleFileChosen(e.target.files[0])}
              />
            </div>
            <div className="row center">
              <button onClick={this.readStream} disabled={readingStream}>
                {readingStream
                  ? 'Reading from stream at localhost:7000/events'
                  : 'Read from stream'}
              </button>
            </div>
          </>
        )}

        <div className={'my-pretty-chart-container'}>
          {data && queryId && (
            <Chart
              width={windowWidth}
              data={data}
              queryId={queryId}
              darkMode={darkMode}
            />
          )}
        </div>
      </div>
    )
  }
}

export default App
