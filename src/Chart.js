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
    const { data, width } = this.props
    const { queries, start, end } = data

    return (
      <div className="chart">
        <DateTime date={start} />
        <DateTime date={end} />
        {queries.map((query, key) => (
          <Query key={key} query={query} data={data} windowWidth={width} />
        ))}
      </div>
    )
  }
}

class Query extends Component {
  render() {
    const { start, end, query, data, windowWidth } = this.props
    const { peers } = query

    return (
      <div className="chart">
        <DateTime date={start} />
        <DateTime date={end} />
        {peers.map((peer, key) => (
          <Peer key={key} peer={peer} data={data} windowWidth={windowWidth} />
        ))}
      </div>
    )
  }
}

class Peer extends Component {
  actionBarStyle = (action, data, windowWidth) => {
    const { startPos, endPos, width } = calculatePosByDates(
      data.start,
      data.end,
      action.start,
      action.end,
      windowWidth,
    )
    const barStyle = {
      marginLeft: startPos,
      marginRight: endPos,
      width: width,
    }

    return barStyle
  }

  render() {
    const { peer, data, windowWidth } = this.props
    const { id } = peer
    const label = `Peer ${id.substr(0, 6).toUpperCase()}`

    return (
      <div className="chartRow">
        <div className="chartLabel">{label}</div>
        <div className="chartLabel">xor</div>
        <div className="chartLabel">hops</div>
        <div className="chartBars">
          {peer.actions.map((action, key) => (
            <div
              key={key}
              className={`chartBar chartBarType${action.type} ${key > 0 &&
                'additionalBar'}`}
              style={this.actionBarStyle(action, data, windowWidth)}
            >
              {action.type}
            </div>
          ))}
        </div>
      </div>
    )
  }
}

const calculatePosByDates = (min, max, start, end, windowWidth) => {
  const scale = windowWidth / (max - min)
  const a = Math.floor((start - min) * scale)
  const b = Math.ceil((max - end) * scale)
  const c = Math.ceil((end - start) * scale)
  console.log('scale is', scale)

  // console.log(min, max, start, end)
  // console.log('A', a, 'B', b, 'C', c)

  return {
    startPos: a,
    endPos: b,
    width: c,
  }
}

export { Chart }
