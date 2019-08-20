import React, { Component } from 'react'
import axios from 'axios'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheckCircle, faMoon, faDownload } from '@fortawesome/free-solid-svg-icons'
import './App.css'
import { Chart } from './Components/Chart'
import { ErrorMessage } from './Components/ErrorMessage'
import { EventLogParser } from './Services/EventLogParser'

let fileReader
const windowWidth = window.innerWidth - 300

class App extends Component {
  state = {
    rawData: {},
    data: null,
    queryId: null,
    visiblePeers: [],
    sortKey: 'xor',
    sortAsc: true,
    darkMode: false,
    readingStream: false,
    fileReadError: false,
    streamingError: false,
    recentlySentQuery: false,
    loggingEndpoint: 'http://lvh.me:7000/events',
    command: '',
    commandArgs: '',
    commandArgExplanation: 'command arguments',
    ranQuery: false,
    queryError: false,
    sendingQuery: false,
  }
  formattedArray = []
  rawFileContent = {}

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
        console.error('error', e)
        source.close()
        this.setState({ streamingError: true, readingStream: false })
      },
      false,
    )

    source.addEventListener(
      'message',
      (e) => {
        let parsedData = undefined
        try {
          parsedData = JSON.parse(e.data)
        } catch (e) {
          console.error('err parsing message data', e)
          return
        }

        const { data, id } = EventLogParser.formatNewEvent(parsedData)
        let rawData = window.Object.assign({}, this.state.rawData)

        if (id) {
          if (rawData[id]) {
            rawData[id] += `\n\ndata: ${e.data}`
          } else {
            rawData[id] = `data: ${e.data}`
          }
        }

        this.setState({ 
          data,
          rawData,
        })
      },
      false,
    )
  }

  changeLoggingEndpoint = (e) => {
    this.setState({ loggingEndpoint: e.target.value })
  }

  changeCommand = (e) => {
    const command = e.target.value
    this.setState({ 
      command,
      commandArgs: '',
    })
    this.updateCommandExplanation(command)
  }

  updateCommandExplanation = (command) => {
    let commandArgExplanation
    switch (command) {
      case 'put-value':
        commandArgExplanation = '<key> <value>'
        break
      case 'get-value':
        commandArgExplanation = '<key>'
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

    this.setState({
      recentlySentQuery: true,
    })
    axios
      .get(commandUrlString)
      .then((res) => {
        this.setState({ sendingQuery: false })
      })
      .catch((e) => {
        this.setState({ queryError: true, sendingQuery: false })
        console.error('query error', e)
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
    this.rawFileContent = content
    try {
      this.formattedArray = EventLogParser.parseFileContent(content)
      this.identifyFirstQuery()
      this.filterData()

    } catch (e) {
      console.error('error', e)
      this.setState({ fileReadError: true })
    }
  }

  identifyFirstQuery = () => {
    // use the dhtQueryRunner.Run.Start event to identify which queries are present in the file
    const queryStart = this.formattedArray.filter(
      (event) => event.event === 'dhtQueryRunner.Run.Start',
    )

    // initially show the first query that was started within the file
    const queryId = queryStart[0].QueryRunner.Query.Key + ' @ ' + queryStart[0].QueryRunner.StartTime
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

    let rawData = window.Object.assign({}, this.state.rawData)
    rawData[Object.keys(data.queries)[0]] = this.rawFileContent
    this.setState({ 
      data,
      rawData
    })
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

  saveLog = (queryId) => {
    const { rawData } = this.state
    if (!rawData) {
      alert('no data')
      return
    }

    const content = rawData[queryId]
    if (!content) {
      alert(`no content with id ${queryId}`)
      return
    }

    // https://stackoverflow.com/a/30800715/3512709
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(content)
    const downloadAnchorNode = document.createElement('a')
    downloadAnchorNode.setAttribute("href", dataStr)
    downloadAnchorNode.setAttribute("download", `${queryId}.json`)
    document.body.appendChild(downloadAnchorNode) // required for firefox
    downloadAnchorNode.click()
    downloadAnchorNode.remove()
  }

  setSortKey = (sortKey) => {
    if (sortKey.toLowerCase() === this.state.sortKey.toLowerCase()) {
      let sortAsc = !this.state.sortAsc
      this.setState({
        sortAsc,
      })

      this.updateVisiblePeers()
      return
    }

    this.setState({
      sortKey,
      sortAsc: true,
    })
    this.updateVisiblePeers()
  }

  updateVisiblePeers() {
    if (!this.state.data || !this.state.data.queries)
      return

    let { data: { queries } } = this.state

    const query = queries[this.state.queryId]
    if (!query)
      return

    const { peers } = query
    if (!peers)
      return

    let visiblePeers = peers.slice() // note: copy array
    visiblePeers.sort(compare(this.state.sortKey, this.state.sortAsc ? 'asc' : 'desc'))

    this.setState({
      visiblePeers,
    })
  }

  // note: this is an "hacky" and relies on the fact that there's a high degree of probability that if we've recently \
  //       sent a query, that whatever comes in next is likely ours...
  checkQueryLengthsAndSetActive(prevState) {
    if (!this.state.data || !Object.keys(this.state.data.queries).length)
      return

    // note: most recent query id
    const curKeys = Object.keys(this.state.data.queries)
    const queryId = curKeys[curKeys.length - 1]
    if (!queryId)
      return

    const prevData = prevState.data
    const curData = this.state.data
    if (!prevData && curData) {
      this.setState({
        queryId,
        recentlySentQuery: false
      })
      return
    }
    if (!prevData && !curData)
      return

    const prevKeys = Object.keys(prevData.queries)
    if (prevKeys.length !== curKeys.length) {
      this.setState({
        queryId,
        recentlySentQuery: false
      })
      return
    }
  }

  checkPeersAndUpdateVisiblePeers(prevState) {
    const prevData = prevState.data
    const curData = this.state.data
    if (!prevData && curData) {
      this.updateVisiblePeers()
      return
    }
    if (!prevData && !curData)
      return

    const prevQuery = prevData.queries[this.state.queryId]
    const curQuery = curData.queries[this.state.queryId]
    if (!prevQuery && curQuery) {
      this.updateVisiblePeers()
      return
    }
    if (!prevQuery && !curQuery)
      return

    if (prevQuery.peers.length !== curQuery.peers.length)
      this.updateVisiblePeers()
  }

  componentDidUpdate(prevProps, prevState) {
    // note: sorting for visible peers...
    if (prevState.sortKey !== this.state.sortKey
      || prevState.sortAsc !== this.state.sortAsc)
      this.updateVisiblePeers()

    // note: check peers for visible peers...
    this.checkPeersAndUpdateVisiblePeers(prevState)

    if (this.state.recentlySentQuery)
      this.checkQueryLengthsAndSetActive(prevState)
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
      //sendingQuery,
    } = this.state

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
                  data-tip={key}
                >
                  {key === queryId && (
                    <FontAwesomeIcon
                      icon={faCheckCircle}
                      style={{ color: '#7DC24B' }}
                    />
                  )}
                  <div 
                    style={{ display: 'inline-block', padding: '5px' }}
                    onClick={(e) => {e.stopPropagation(); this.saveLog(key)}}
                  >
                    <FontAwesomeIcon
                      icon={faDownload}
                      style={{ color: '#7DC24B' }}
                    />
                  </div>
                  <span>{key}</span>
                </button>
              ))}
          </div>
        )}

        <div className="startOptions">
          {!data && (
            <div className="row" style={{ alignItems: 'center' }}>
              <div className="row center" style={{ margin: '0px' }}>
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

              <span style={{ padding: '0px 15px' }}> - or - </span>

              <div className="inputRow" style={{ margin: '0px' }}>
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
            </div>
          )}

          {(readingStream || !data) && (
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
                  onKeyDown={(event) => {if(event.keyCode === 13) this.query();}}
                />
              </div>
              <button onClick={this.query}>
                Query
              </button>
            </div>
          )}
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

        <div className={'my-pretty-chart-container'}>
          {data && queryId && (
            <Chart
              width={windowWidth}
              data={data}
              queryId={queryId}
              darkMode={darkMode}
              setSortKey={this.setSortKey}
              visiblePeers={this.state.visiblePeers}
              sortKey={this.state.sortKey}
              sortAsc={this.state.sortAsc}
            />
          )}
        </div>
      </div>
    )
  }
}

// function for dynamic sorting
// https://www.sitepoint.com/sort-an-array-of-objects-in-javascript/
const compare = (key, order='asc') => {
  return function(a, b) {
    if(!a.hasOwnProperty(key) || !b.hasOwnProperty(key)) {
      // property doesn't exist on either object
      return 0;
    }

    const varA = (typeof a[key] === 'string') ?
      a[key].toUpperCase() : a[key];
    const varB = (typeof b[key] === 'string') ?
      b[key].toUpperCase() : b[key];

    let comparison = 0;
    if (varA > varB) {
      comparison = 1;
    } else if (varA < varB) {
      comparison = -1;
    }
    return (
      (order === 'desc') ? (comparison * -1) : comparison
    );
  };
}

export default App
