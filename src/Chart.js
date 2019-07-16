import React, { Component } from 'react'
import ReactTooltip from 'react-tooltip'
import { DateTime } from './DateTime'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faTimes,
  faExclamationTriangle,
  faCheck,
} from '@fortawesome/free-solid-svg-icons'

const actionBarStyle = (action, data, windowWidth) => {
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
    const {
      peers,
      start: queryStart,
      end: queryEnd,
      id,
      seen,
      queried,
      toQuery,
    } = query
    const barsWidth = windowWidth - 50

    const label = `Query ${id.toUpperCase()}`

    return (
      <>
        <div className="chartRow">
          <div className="chartLabel" />
          <div className="chartMiniColumn" />
          <div className="chartMiniColumn">xor</div>
          <div className="chartMiniColumn">hops</div>
        </div>
        <div className="chartRow headerRow">
          <div className="chartLabel">{label}</div>
          <div className="chartMiniColumn" />
          <div className="chartMiniColumn">xor</div>
          <div className="chartMiniColumn">hops</div>
          <div className="chartBars" style={{ width: windowWidth }}>
            <div
              key={id}
              className={`chartBar chartBarTypemainquery`}
              style={actionBarStyle(query, data, barsWidth)}
              data-tip={`Query duration: ${query.duration}ms`}
            >
              {`Seen: ${seen}, Queried: ${queried}, To Query: ${toQuery}`}
            </div>
          </div>
        </div>
        {peers.map((peer, key) => (
          <Peer key={key} peer={peer} data={data} windowWidth={windowWidth} />
        ))}
      </>
    )
  }
}

class Peer extends Component {
  afterBarStyle(smallestRightMargin, windowWidth, barsWidth) {
    return {
      marginLeft: barsWidth - smallestRightMargin,
    }
  }

  render() {
    const { peer, data, windowWidth } = this.props
    const { id, filteredPeersNum, closerPeersNum, newPeersNum } = peer
    const barsWidth = windowWidth - 50
    const label = `Peer ${id.toUpperCase()}`
    let smallestRightMargin = barsWidth
    let totalDuration = 0
    console.log('peer is', peer)

    return (
      <div className="chartRow">
        <div className="chartLabel">{label}</div>
        <div className="chartMiniColumn">
          {peer.dup && (
            <FontAwesomeIcon
              icon={faExclamationTriangle}
              style={{ color: '#F7DD72' }}
            />
          )}
        </div>
        <div className="chartMiniColumn">{peer.xor}</div>
        <div className="chartMiniColumn">hops</div>
        <div className="chartBars" style={{ width: windowWidth }}>
          {peer.actions.map((action, key) => {
            const style = actionBarStyle(action, data, barsWidth)
            if (style.marginRight < smallestRightMargin) {
              smallestRightMargin = style.marginRight
            }
            totalDuration += action.duration

            return (
              <div
                key={key}
                className={`chartBar chartBarType${action.type}`}
                style={style}
                data-tip={`${action.type} duration: ${action.duration}ms`}
              >
                {action.type === 'dial' && !action.success && (
                  <FontAwesomeIcon
                    icon={faTimes}
                    style={{ color: '#6B0F1A', padding: '2px' }}
                  />
                )}
                {action.type === 'query' && action.success && (
                  <FontAwesomeIcon
                    icon={faCheck}
                    style={{ color: '#00B295', padding: '2px' }}
                  />
                )}
              </div>
            )
          })}
          <div
            className="chartBar chartBarAfterDescription"
            style={this.afterBarStyle(
              smallestRightMargin,
              windowWidth,
              barsWidth,
            )}
          >
            {`${totalDuration}ms`}{' '}
            {closerPeersNum
              ? `${closerPeersNum}/${filteredPeersNum}/${newPeersNum}`
              : ''}
          </div>
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
