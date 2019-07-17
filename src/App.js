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
  }
  formattedArray = []

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
    // filter and reformat the data for the visualization
    EventLogParser.formattedArray = this.formattedArray
    const data = EventLogParser.formatEvents(queryId)
    this.setState({ data })
  }

  render() {
    const { data, queryStart, queryId } = this.state

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
        <div className={'my-pretty-chart-container'}>
          {data && <Chart width={windowWidth} data={data} />}
        </div>
      </div>
    )
  }
}

export default App
