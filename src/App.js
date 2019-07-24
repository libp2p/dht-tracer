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
    queryId: null,
    darkMode: false,
    readingStream: false,
  }
  formattedArray = []

  readStream = () => {
    this.setState({ readingStream: true })
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
    this.formattedArray = EventLogParser.parseFileContent(content)
    this.identifyFirstQuery()
    this.filterData()
  }

  identifyFirstQuery = () => {
    // use the dhtQueryRunner.Run.Start event to identify which queries are present in the file
    const queryStart = this.formattedArray.filter(
      (event) => event.event === 'dhtQueryRunner.Run.Start',
    )
    // initially show the first query that was started within the file
    const queryId = queryStart[0].QueryRunner.Query.Key
    this.setState({ queryId, queryStart })
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
    console.log('data is', data)
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
    let { data, queryId, darkMode, readingStream } = this.state

    if (data && data.queries && !queryId) {
      queryId = Object.keys(data.queries)[0]
    }

    return (
      <div className="tracer">
        <h4 className="text-center padding">DHT Tracer </h4>
        {data && data.queries && (
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
          {data && (
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
