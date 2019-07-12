import React, { Component } from 'react'
import { Chart } from 'react-google-charts'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheckCircle } from '@fortawesome/free-solid-svg-icons'
import './App.css'

let fileReader

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
    const data = [
      [
        { type: 'string', id: 'Peer' },
        { type: 'string', id: 'Operation' },
        { type: 'date', id: 'Start' },
        { type: 'date', id: 'End' },
      ],
    ]
    if (queryRunner) {
      data.push([
        'Query',
        `Seen: ${queryRunner.PeersSeen.length}, Queried: ${
          queryRunner.PeersQueried.length
        }, ${(queryRunner.Duration / 1000000000).toFixed(2)}s`,
        new Date(queryRunner.StartTime),
        new Date(queryRunner.EndTime),
      ])
    }
    const peersQueried = {}
    for (let i = 0; i < queryArray.length; i++) {
      const peerQuery = queryArray[i]
      // @todo: make duplicated more clear
      let duplicate = false
      if (peersQueried[peerQuery.peer]) {
        duplicate = true
      }
      peersQueried[peerQuery.peer] = true
      const dataToGraph = [
        `Peer ${peerQuery.peer}`,
        `${duplicate ? 'DUPLICATE' : 'Query'} ${peerQuery.filteredPeers} / ${
          peerQuery.closerPeers
        }`,
        new Date(peerQuery.Start),
        new Date(
          new Date(peerQuery.Start).getTime() + peerQuery.Duration / 1000000,
        ),
      ]
      data.push(dataToGraph)
    }

    for (let i = 0; i < dialArray.length; i++) {
      const peerQuery = dialArray[i]
      const dataToGraph = [
        `Peer ${peerQuery.peer}`,
        'Dial',
        new Date(peerQuery.Start),
        new Date(
          new Date(peerQuery.Start).getTime() + peerQuery.Duration / 1000000,
        ),
      ]
      data.push(dataToGraph)
    }

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
    const { data, queryStart, queryId } = this.state
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
          {data && (
            <Chart
              width={'100vw'}
              height={'100vh'}
              chartType="Timeline"
              loader={<div>Loading Chart</div>}
              data={data}
              options={{
                showRowNumber: true,
              }}
              rootProps={{ 'data-testid': '1' }}
            />
          )}
        </div>
      </div>
    )
  }
}
export default App
