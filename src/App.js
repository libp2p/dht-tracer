import React, { Component } from 'react'
//import { Chart } from 'react-google-charts'
import { Chart } from './Chart'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons'

import './App.css'
import { EventLogParser } from './Services/EventLogParser'

let fileReader
const windowWidth = window.innerWidth - 300

class App extends Component {
  state = {
    data: null,
    queryStart: null,
    queryId: null,
    darkMode: false,
  }
  formattedArray = []

  // @todo: complete this, need to change server to return proper format for sse if taking this approach
  readStream = () => {
    console.log('READ STREAM')
    if (!!window.EventSource) {
      var source = new EventSource('http://lvh.me:9000/events')
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
      function(e) {
        console.log(e.data)
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
    this.formattedArray = EventLogParser.parseFileContent(content)

    // use the dhtQueryRunner.Run.Start event to identify which queries are present in the file
    const queryStart = this.formattedArray.filter(
      (event) => event.event === 'dhtQueryRunner.Run.Start',
    )
    // initially show the first query that was started within the file
    const queryId = queryStart[0].QueryRunner.Query.Key
    this.setState({ queryId, queryStart })
    this.filterData()
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
    const { data, queryStart, queryId, darkMode } = this.state
    console.log('app', darkMode)

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
          <button onClick={this.toggleDarkMode}>Toggle Dark Mode</button>
        </div>
        <div className="row center">
          <label htmlFor="file-upload" className="custom-file-upload">
            Choose file with log output
          </label>
          <input
            type="file"
            id="file-upload"
            className="inputfile"
            onChange={(e) => this.handleFileChosen(e.target.files[0])}
          />
        </div>

        {/* <button onClick={this.readStream}>Read from stream</button> */}

        {queryId && (
          <div className={'my-pretty-chart-container'}>
            {data && (
              <Chart
                width={windowWidth}
                data={data}
                queryId={queryId}
                darkMode={darkMode}
              />
            )}
          </div>
        )}
      </div>
    )
  }
}

export default App
