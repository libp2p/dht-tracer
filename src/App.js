import React, { Component } from 'react'
import { Chart } from 'react-google-charts'
import './App.css'

let fileReader

class App extends Component {
  state = {
    data: null,
  }
  handleFileRead = (e) => {
    // TODO: reject random files
    const content = fileReader.result
    const array = content.split('\n')
    const formattedArray = array.map((event) => {
      try {
        return JSON.parse(event)
      } catch {
        return { error: 'incorrectly formatted event' }
      }
    })

    function parseLogs(array) {
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

    const queryStart = parseLogs(
      formattedArray.filter(
        (event) => event.Operation === 'dhtQueryRunnerStart',
      ),
    )
    const queryId = queryStart[0].query
    console.log('query id is', queryId)
    const queryArray = parseLogs(
      formattedArray.filter((event) => event.Operation === 'queryPeer!'),
    )
    const dialArray = parseLogs(
      formattedArray.filter((event) => event.Operation === 'dialPeer!'),
    )
    const queryRunnerArray = parseLogs(
      formattedArray.filter((event) => event.Operation === 'dhtQueryRunner'),
    )
    const queryRunner = queryRunnerArray[0]
    console.log('query runner is', queryRunner)
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
        }, ${(queryRunner.Duration / 1000000).toFixed(2)}s`,
        new Date(queryRunner.StartTime),
        new Date(queryRunner.EndTime),
      ])
    }
    for (let i = 0; i < queryArray.length; i++) {
      const peerQuery = queryArray[i]
      const dataToGraph = [
        `Peer ${peerQuery.peer}`,
        'querying',
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
        'dialing',
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
    const { data } = this.state
    console.log('data is', data)

    return (
      <div>
        <div className="upload-expense">
          <input
            type="file"
            id="file"
            className="input-file"
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
