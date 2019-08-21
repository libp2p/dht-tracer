import React, { Component } from 'react'
import axios from 'axios'
import html2canvas from 'html2canvas';
import canvasToBlob from 'async-canvas-to-blob'
import { saveAs } from 'file-saver'
import { debounce } from 'lodash'

import './App.css'
import { Chart } from './Components/Chart'
import ErrorMessage from './Components/ErrorMessage'
import { EventLogParser } from './Services/EventLogParser'
import Header from './Components/Header'
import StartMenu from './Components/StartMenu'

let fileReader
const windowWidth = window.innerWidth - 300

class App extends Component {
  state = {
    rawData: {},
    data: null,
    queryId: null,
    visiblePeerIds: [],
    sortKey: 'xor',
    sortAsc: true,
    completedFilters: ['completed', 'not-completed'],
    renderFullList: false,
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
    this.setState({ fileReadError: false })
    
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

  saveScreenshot = debounce((queryId) => {
    const renderFullList = !this.state.renderFullList
    this.setState({
      renderFullList,
    }, async () => {
      let node = document.getElementById('the-chart');

      try {
        const canvas = await html2canvas(node)

        const blob = await canvasToBlob(canvas);

        saveAs(blob, `${queryId}.png`)
      } catch(e) {
        console.error('err saving image from dom', e);
        alert('Sorry, we could not save your image')
      }

      finally {
        this.setState({
          renderFullList: false,
        })
      }
    })
  }, 5000, { leading: true })

  saveLog = debounce((queryId) => {
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
  }, 5000, { leading: true })

  setSortKey = (sortKey) => {
    if (sortKey.toLowerCase() === this.state.sortKey.toLowerCase()) {
      let sortAsc = !this.state.sortAsc
      this.setState({
        sortAsc,
      })

      this.updateVisiblePeerIds()
      return
    }

    this.setState({
      sortKey,
      sortAsc: true,
    })
    this.updateVisiblePeerIds()
  }

  updateVisiblePeerIds() {
    if (!this.state.data || !this.state.data.queries)
      return

    const { data: { queries }, completedFilters } = this.state

    const query = queries[this.state.queryId]
    if (!query)
      return

    const { peers, id, peerDials, peerQueries } = query
    if (!peers || !id || !peerDials || !peerQueries)
      return

    let peersCopy = peers.slice() // note: copy array
    let visiblePeerIds = []

    // 1. filter
    switch (completedFilters.length) {
    case 0:
      this.setState({
        visiblePeerIds
      })
      break

    case 1:
      let completedPeerIds = []
      for (const peer of peersCopy) {
        if (!peer || !peer.id)
          continue

        let dialed = peerDials[peer.id]
        let awaitingResponse = peerQueries[peer.id] && (!peerQueries[peer.id].end || (peerQueries[peer.id].closerPeers && peerQueries[peer.id].closerPeers.length === 0))

        if (dialed && !awaitingResponse)
          completedPeerIds.push(peer.id)
      }

      if (completedFilters[0].toLowerCase() === 'completed') {
        peersCopy = peersCopy.filter((visiblePeer) => { return visiblePeer && visiblePeer.id && completedPeerIds.includes(visiblePeer.id) })
      } else {
        peersCopy = peersCopy.filter((visiblePeer) => { return visiblePeer && visiblePeer.id && !completedPeerIds.includes(visiblePeer.id) })
      }
      break

    case 2:
      break

    default:
      console.error(`expected completed filters length <= 2; received: ${completedFilters.length}`, completedFilters)
    }


    // 2. sort
    peersCopy.sort(compare(this.state.sortKey, this.state.sortAsc ? 'asc' : 'desc'))

    // 3. extract id's
    for (const peer of peersCopy)
      visiblePeerIds.push(peer.id)

    this.setState({
      visiblePeerIds,
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

  checkPeers(prevState) {
    const prevData = prevState.data
    const curData = this.state.data
    if (!prevData && curData)
      return true
    if (!prevData && !curData)
      return false

    const prevQuery = prevData.queries[this.state.queryId]
    const curQuery = curData.queries[this.state.queryId]
    if (!prevQuery && curQuery)
      return true
    if (!prevQuery && !curQuery)
      return false

    if (prevQuery.peers.length !== curQuery.peers.length)
      return true

    return false
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.recentlySentQuery)
      this.checkQueryLengthsAndSetActive(prevState)

    let shouldUpdateVisiblePeerIds = false
    shouldUpdateVisiblePeerIds = this.checkPeers(prevState)

    if (!shouldUpdateVisiblePeerIds && prevState.completedFilters !== this.state.completedFilters)
      shouldUpdateVisiblePeerIds = true

    if (shouldUpdateVisiblePeerIds)
      this.updateVisiblePeerIds()
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
    } = this.state

    if (data && data.queries && !queryId) {
      queryId = Object.keys(data.queries)[0]
    }

    return (
      <div className="tracer">
        <div className="flex-row">
          <Header
            data={data}
            queryId={queryId}
            saveLog={this.saveLog}
            saveScreenshot={this.saveScreenshot}
            changeQueryFilter={this.changeQueryFilter}
            toggleDarkMode={this.toggleDarkMode}
          />
        </div>

        <ErrorMessage
          fileReader={fileReader}
          streamingError={streamingError}
        />

        <StartMenu
          data={data}
          readingStream={readingStream}
          loggingEndpoint={loggingEndpoint}
          command={command}
          commandArgs={commandArgs}
          commandArgExplanation={commandArgExplanation}
          queryError={queryError}
          fileReadError={fileReadError}
          ranQuery={ranQuery}
          changeLoggingEndpoint={this.changeLoggingEndpoint}
          handleFileChosen={this.handleFileChosen}
          readStream={this.readStream}
          changeCommand={this.changeCommand}
          changeCommandArgs={this.changeCommandArgs}
          query={this.query}
        />

        <div className={'my-pretty-chart-container'}>
          {data && queryId && (
            <Chart
              width={windowWidth}
              data={data}
              queryId={queryId}
              darkMode={darkMode}
              setSortKey={this.setSortKey}
              completedFilters={this.state.completedFilters}
              handleCompletedFilterChange={(e) => {
                let filter = e.target.value
                let completedFilters = this.state.completedFilters.slice()

                if (completedFilters.includes(filter)) {
                  completedFilters = completedFilters.filter((completedFilter) => { return completedFilter !== filter })
                } else {
                  completedFilters.push(filter)
                }

                this.setState({ completedFilters })
              }}
              visiblePeerIds={this.state.visiblePeerIds}
              sortKey={this.state.sortKey}
              sortAsc={this.state.sortAsc}
              renderFullList={this.state.renderFullList}
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
