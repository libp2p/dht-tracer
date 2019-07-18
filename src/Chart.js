import React, { Component } from 'react'
import ReactTooltip from 'react-tooltip'
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

const afterBarStyle = (smallestRightMargin, windowWidth, barsWidth) => {
  return {
    marginLeft: barsWidth - smallestRightMargin,
  }
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
    const { data, width, queryId, darkMode } = this.props
    const { queries } = data
    console.log('chart', darkMode)

    const query = queries[queryId]

    return (
      <div className="chart">
        <ReactTooltip />
        <Query
          query={query}
          data={data}
          windowWidth={width}
          darkMode={darkMode}
        />
      </div>
    )
  }
}

class Query extends Component {
  render() {
    const { query, windowWidth, darkMode } = this.props
    console.log('query', darkMode)
    const { peers, id, seen, queried, toQuery } = query
    const barsWidth = windowWidth - 50

    const label = `Query ${id.toUpperCase()}`
    const style = actionBarStyle(query, query, barsWidth)

    console.log('style is', style)

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
              style={style}
              data-tip={`Query duration: ${query.duration}ms`}
            >
              {`Seen: ${seen}, Queried: ${queried}, To Query: ${toQuery}`}
            </div>
            <div
              className="chartBar chartBarAfterDescription"
              style={afterBarStyle(style.marginRight, windowWidth, barsWidth)}
            >
              {`${query.duration}ms`}
            </div>
          </div>
        </div>
        {peers.map((peer, key) => (
          <Peer
            key={key}
            peer={peer}
            query={query}
            windowWidth={windowWidth}
            darkMode={darkMode}
          />
        ))}
      </>
    )
  }
}

class Peer extends Component {
  render() {
    const { peer, query, windowWidth, darkMode } = this.props
    console.log('peers', darkMode)
    const { id, filteredPeersNum, closerPeersNum, newPeersNum } = peer
    const barsWidth = windowWidth - 50
    const label = `Peer ${id.toUpperCase()}`
    let smallestRightMargin = barsWidth
    let totalDuration = 0

    return (
      <div className="chartRow">
        <div className="chartLabel">{label}</div>
        <div className="chartMiniColumn">
          {peer.dup && (
            <FontAwesomeIcon
              data-tip="duplicate"
              icon={faExclamationTriangle}
              className="duplicateExclamation"
            />
          )}
        </div>
        <div data-tip="xor" className="chartMiniColumn">
          {peer.xor}
        </div>
        <div data-tip="hops" className="chartMiniColumn">
          {peer.hops}
        </div>
        <div className="chartBars" style={{ width: windowWidth }}>
          {peer.actions.map((action, key) => {
            const style = actionBarStyle(action, query, barsWidth)
            if (style.marginRight < smallestRightMargin) {
              smallestRightMargin = style.marginRight
            }
            totalDuration += action.duration

            return (
              <div
                key={key}
                className={`chartBar chartBarType${action.type}`}
                style={style}
                data-tip={`${action.type} ${
                  action.type === 'dial' && peer.alreadyConnected
                    ? 'already connected'
                    : action.type === 'added'
                    ? ''
                    : `duration: ${action.duration}ms`
                }`}
              >
                {action.type === 'dial' && !action.success && (
                  <FontAwesomeIcon
                    data-tip="dial-failure"
                    icon={faTimes}
                    className="dialFailure"
                  />
                )}
                {action.type === 'query' && action.success && (
                  <FontAwesomeIcon
                    data-tip="records found"
                    icon={faCheck}
                    className="recordsFound"
                  />
                )}
              </div>
            )
          })}
          <div
            data-tip="total duration # closer peers / # filtered peers / # new peers"
            className="chartBar chartBarAfterDescription"
            style={afterBarStyle(smallestRightMargin, windowWidth, barsWidth)}
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
  let c = Math.ceil((end - start) * scale)
  // test this so we can see when events with no duration happened
  if (c === 0) {
    c = 1
  }

  return {
    startPos: a,
    endPos: b,
    width: c,
  }
}

export { Chart }
