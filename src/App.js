import React, { Component } from 'react'
import { Chart } from 'react-google-charts'
import './App.css'

const firstDate = new Date('2019-07-09T14:25:04.342982-07:00')
class App extends Component {
  render() {
    return (
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
              Math.abs(new Date('2019-07-09T14:25:04.34334-07:00') - firstDate),
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
              Math.abs(new Date('2019-07-09T14:25:04.34239-07:00') - firstDate),
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
    )
  }
}
export default App
