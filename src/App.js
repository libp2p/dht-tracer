import React, { Component } from 'react'
import { Chart } from 'react-google-charts'
import './App.css'

let fileReader

const handleFileRead = (e) => {
  // TODO: reject random files
  const content = fileReader.result
  const array = content.split('\n')
  const formattedArray = array.map((event) => {
    console.log(event)
    try {
      return JSON.parse(event)
    } catch {
      return { error: 'incorrectly formatted event' }
    }
  })
  console.log('array', formattedArray)
  // … do something with the 'content' …
}

const handleFileChosen = (file) => {
  fileReader = new FileReader()
  fileReader.onloadend = handleFileRead
  fileReader.readAsText(file)
}

const firstDate = new Date('2019-07-09T14:25:04.342982-07:00')

class App extends Component {
  render() {
    return (
      <div>
        <div className="upload-expense">
          <input
            type="file"
            id="file"
            className="input-file"
            onChange={(e) => handleFileChosen(e.target.files[0])}
          />
        </div>
        <div className={'my-pretty-chart-container'}>
          <Chart
            width={'800px'}
            height={'300px'}
            chartType="Timeline"
            loader={<div>Loading Chart</div>}
            data={[
              [
                { type: 'string', id: 'Operation' },
                { type: 'date', id: 'Start' },
                { type: 'date', id: 'End' },
              ],
              ['findPeerSingle', 0, 141324740 / 1000],
              [
                'findPeerSingle',
                Math.abs(
                  new Date('2019-07-09T14:25:04.343077-07:00') - firstDate,
                ),
                Math.abs(
                  new Date('2019-07-09T14:25:04.343077-07:00') -
                    firstDate +
                    141772488 / 1000,
                ),
              ],
              [
                'findPeerSingle',
                Math.abs(
                  new Date('2019-07-09T14:25:04.34334-07:00') - firstDate,
                ),
                Math.abs(
                  new Date('2019-07-09T14:25:04.34334-07:00') -
                    firstDate +
                    141538112 / 1000,
                ),
              ],
              [
                'dhtQueryRunner.Run',
                Math.abs(
                  new Date('2019-07-09T14:25:04.342463-07:00') - firstDate,
                ),
                Math.abs(
                  new Date('2019-07-09T14:25:04.342463-07:00') -
                    firstDate +
                    142544168 / 1000,
                ),
              ],
              [
                'FindPeer',
                Math.abs(
                  new Date('2019-07-09T14:25:04.34239-07:00') - firstDate,
                ),
                Math.abs(
                  new Date('2019-07-09T14:25:04.34239-07:00') -
                    firstDate +
                    142709256 / 1000,
                ),
              ],
            ]}
            options={{
              showRowNumber: true,
            }}
            rootProps={{ 'data-testid': '1' }}
          />
        </div>
      </div>
    )
  }
}
export default App
