import React, { Component } from 'react'
import axios from 'axios'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheckCircle, faMoon } from '@fortawesome/free-solid-svg-icons'
import './App.css'
import { Chart } from './Chart'
import { ErrorMessage } from './Components/ErrorMessage'
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
    streamingError: false,
    loggingEndpoint: 'http://lvh.me:7000/events',
    command: '',
    commandArgs: '',
    commandArgExplanation: 'command arguments',
    ranQuery: false,
    queryError: false,
    sendingQuery: false,
  }
  formattedArray = []

  readStream = () => {
    this.setState({ readingStream: true, streamingError: false })
    const { loggingEndpoint } = this.state
    let source

    if (!!window.EventSource) {
      source = new EventSource(loggingEndpoint)
    }

    source.addEventListener(
      'error',
      (e) => {
        console.log('error', e)
        source.close()
        this.setState({ streamingError: true, readingStream: false })
      },
      false,
    )

    source.addEventListener(
      'message',
      (e) => {
        const data = EventLogParser.formatNewEvent(JSON.parse(e.data))
        this.setState({ data })
      },
      false,
    )
  }

  changeLoggingEndpoint = (e) => {
    this.setState({ loggingEndpoint: e.target.value })
  }

  changeCommand = (e) => {
    const command = e.target.value
    this.setState({ command })
    this.updateCommandExplanation(command)
  }

  updateCommandExplanation = (command) => {
    let commandArgExplanation
    switch (command) {
      case 'put-value':
      case 'get-value':
        commandArgExplanation = '<key> <value>'
        break
      case 'add-provider':
      case 'get-providers':
        commandArgExplanation = '<cid>'
        break
      case 'find-peer':
      case 'ping':
        commandArgExplanation = '<peer-id>'
        break
      default:
        commandArgExplanation = ''
    }
    this.setState({ commandArgExplanation })
  }

  changeCommandArgs = (e) => {
    this.setState({ commandArgs: e.target.value })
  }

  query = () => {
    this.setState({ ranQuery: true, queryError: false, sendingQuery: true })
    const { command, commandArgs, loggingEndpoint } = this.state
    const commandEndpoint = loggingEndpoint.split('/events')[0]
    const baseUrl = `${commandEndpoint}/cmd?q=${command}`
    const commandUrlString = commandArgs ? `${baseUrl}+${commandArgs}` : baseUrl
    axios
      .get(commandUrlString)
      .then((res) => {
        this.setState({ sendingQuery: false })
      })
      .catch((e) => {
        this.setState({ queryError: true, sendingQuery: false })
        console.log('query error', e)
      })
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
    } catch (e) {
      console.log('error', e)
      this.setState({ fileReadError: true })
    }
  }

  identifyFirstQuery = () => {
    // use the dhtQueryRunner.Run.Start event to identify which queries are present in the file
    const queryStart = this.formattedArray.filter(
      (event) => event.event === 'dhtQueryRunner.Run.Start',
    )
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
    let {
      data,
      queryId,
      darkMode,
      readingStream,
      fileReadError,
      streamingError,
      loggingEndpoint,
      command,
      commandArgs,
      commandArgExplanation,
      ranQuery,
      queryError,
      sendingQuery,
    } = this.state

    console.log('data is', data)
    if (data && data.queries && !queryId) {
      queryId = Object.keys(data.queries)[0]
    }

    return (
      <div className="tracer">
        <div className="flex-row">
          <div />
          <h4 className="text-center padding">DHT Tracer </h4>
          <div onClick={this.toggleDarkMode}>
            <FontAwesomeIcon icon={faMoon} className="nightMode" />
          </div>
        </div>

        {fileReadError && (
          <ErrorMessage>
            <div>
              Sorry, your log file seems to be improperly formatted. Please make
              sure there isn't any extra info in your log file and your log
              entries are formatted like the below examples:{' '}
            </div>
            <code>{`data: {"QueryRunner":{"CurrTime":"2019-07-24T18:26:20.321273-07:00","EndTime":"0001-01-01T00:00:00Z","PeersDialQueueLen":0,"PeersDialed":null,"PeersDialedNew":[],"PeersQueried":[],"PeersRemainingLen":0,"PeersSeen":[],"PeersToQueryLen":0,"Query":{"Concurrency":0,"Key":"/provider/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ","Type":""},"RateLimit":{"Capacity":3,"Length":0},"Result":{"CloserPeers":null,"FinalSet":null,"FoundPeer":"","QueriedSet":null,"Success":false},"StartTime":"2019-07-24T18:26:20.321265-07:00"},"event":"dhtQueryRunner.Run.Start","system":"dht","time":"2019-07-25T01:26:20.321328Z"}\n\ndata: {"Hops":0,"QueryRunner":{"CurrTime":"2019-07-24T18:26:20.321372-07:00","EndTime":"0001-01-01T00:00:00Z","PeersDialQueueLen":0,"PeersDialed":null,"PeersDialedNew":[],"PeersQueried":[],"PeersRemainingLen":0,"PeersSeen":["QmU74uDuMSgouK61ND71bjaYxTJme7iUxAqzp6RygtzQb3"],"PeersToQueryLen":0,"Query":{"Concurrency":0,"Key":"/provider/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ","Type":""},"RateLimit":{"Capacity":3,"Length":3},"Result":{"CloserPeers":null,"FinalSet":null,"FoundPeer":"","QueriedSet":null,"Success":false},"StartTime":"2019-07-24T18:26:20.321265-07:00"},"XOR":12,"event":"dhtQueryRunner.addPeerToQuery","peerID":"QmU74uDuMSgouK61ND71bjaYxTJme7iUxAqzp6RygtzQb3","system":"dht","time":"2019-07-25T01:26:20.321409Z"}`}</code>
          </ErrorMessage>
        )}
        {streamingError && (
          <ErrorMessage>
            <div>
              Sorry, there is a problem connecting to the event stream. Please
              check that your connection is open and you are pointing to the
              right endpoint.
            </div>
          </ErrorMessage>
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
          <div className="startOptions">
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
            <div>-or-</div>

            <div className="inputRow">
              <div className="mainInput">
                <input
                  disabled={readingStream}
                  type="text"
                  value={loggingEndpoint}
                  onChange={this.changeLoggingEndpoint}
                />
              </div>
              <button onClick={this.readStream} disabled={readingStream}>
                {readingStream
                  ? 'Reading from stream at localhost:7000/events'
                  : 'Read from stream'}
              </button>
            </div>

            <div className="inputRow">
              <div className="selectInput">
                <select value={command} onChange={this.changeCommand}>
                  <option value="" disabled hidden>
                    Choose command
                  </option>
                  <option value="put-value">put-value</option>
                  <option value="get-value">get-value</option>
                  <option value="add-provider">add-provider</option>
                  <option value="get-providers">get-providers</option>
                  <option value="find-peer">find-peer</option>
                  <option value="ping">ping</option>
                  <option value="reset">reset</option>
                  <option value="exit">exit</option>
                </select>
              </div>
              <div className="mainInput">
                <input
                  type="text"
                  value={commandArgs}
                  onChange={this.changeCommandArgs}
                  placeholder={commandArgExplanation}
                />
              </div>
              <button onClick={this.query} disabled={sendingQuery}>
                Query
              </button>
            </div>
            {!readingStream && ranQuery && (
              <ErrorMessage warning>
                <div>
                  If you run queries here without first reading from the event
                  logs, you won't see them visualized here.
                </div>
              </ErrorMessage>
            )}
            {queryError && (
              <ErrorMessage>
                <div>
                  There was an error running your query, please check that your
                  arguments are formatted properly.
                </div>
              </ErrorMessage>
            )}
          </div>
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
