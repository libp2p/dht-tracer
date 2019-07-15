import React, { Component } from 'react'
import ReactTooltip from 'react-tooltip'
import { DateTime } from './DateTime'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTimes } from '@fortawesome/free-solid-svg-icons'
import { faCheck } from '@fortawesome/free-solid-svg-icons'

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
        <ReactTooltip />
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
    const label = `Peer ${id.toUpperCase()}`
    console.log('peer is', peer)

    return (
      <div className="chartRow">
        <div className="chartLabel">{label}</div>
        <div className="chartMiniColumn">xor</div>
        <div className="chartMiniColumn">hops</div>
        <div className="chartBars" style={{ width: windowWidth }}>
          {peer.actions.map((action, key) => (
            <div
              key={key}
              className={`chartBar chartBarType${action.type}`}
              style={this.actionBarStyle(action, data, windowWidth)}
              data-tip={`${action.type} duration: ${action.duration}s`}
            >
              {action.success === 'failure' && (
                <FontAwesomeIcon icon={faTimes} style={{ color: '#C74D6E' }} />
              )}
              {action.success === 'true' && (
                <FontAwesomeIcon icon={faCheck} style={{ color: '#7DC24B' }} />
              )}
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

  return {
    startPos: a,
    endPos: b,
    width: c,
  }
}

export { Chart }
