import React, { Component } from 'react'
import { DateTime } from './DateTime'

class Chart extends Component {
  // state = {
  //   data: []
  // }
  //
  // static getDerivedStateFromProps(props, state) {
  //   return props
  // }
  //

  render() {
    const { data } = this.props
    const { queries, start, end } = data

    return (
      <div className="chart">
        <DateTime date={start} />
        <DateTime date={end} />
        {queries.map((query, key) => <Query key={key} query={query} data={data} />)}
      </div>
    )
  }
}

class Query extends Component {
  render() {
    const { start, end, query, data } = this.props
    const { peers } = query

    return (
      <div className="chart">
        <DateTime date={start} />
        <DateTime date={end} />
        {peers.map((peer, key) => <Peer key={key} peer={peer} data={data} />)}
      </div>
    )
  }
}

class Peer extends Component {
  actionBarStyle = (action, data) => {
    const { startPos, endPos, width } = calculatePosByDates(data.start, data.end, action.start, action.end)
    const barStyle = {
      marginLeft: startPos,
      marginRight: endPos,
      width
    }

    return barStyle
  }

  render() {
    const { peer, data } = this.props
    const { id, type, start, end } = peer
    const label = `Peer ${id.substr(0,6).toUpperCase()}`

    return (
      <div className="chartRow">
        <div className="chartLabel">
          {label}
        </div>
        <div className="chartLabel">
          xor
        </div>
        <div className="chartLabel">
          hops
        </div>
        <div className="chartBars">
          {peer.actions.map((action, key) => (
            <div key={key} className={`chartBar chartBarType${action.type}`} style={this.actionBarStyle(action, data)}>BAR - {action.type}</div>
          ))}
        </div>
      </div>
    )
  }
}

const calculatePosByDates = (min, max, start, end) => {
  const a = start - min
  const b = end - max
  const c = b - a
  console.log(min, max, start, end)
  console.log('A', a, 'B', b, 'C', c)

  return {
    startPos: 0,
    endPos: 0,
    width: c / max
  }
}

export { Chart }