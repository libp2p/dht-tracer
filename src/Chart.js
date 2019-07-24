import React, { Component } from 'react'
import ReactTooltip from 'react-tooltip'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faTimes,
  faExclamationTriangle,
  faCheck,
  faCheckDouble,
} from '@fortawesome/free-solid-svg-icons'

const actionBarStyle = (action, data, windowWidth) => {
  const { startPos, endPos, width } = calculatePosByDates(
    new Date(data.start),
    new Date(data.end),
    new Date(action.start),
    new Date(action.end),
    new Date(windowWidth),
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
  shouldComponentUpdate(nextProps, nextState) {
    const { queryId: nextQueryId, data: nextData } = nextProps
    const { queryId, data } = this.props

    if (nextQueryId !== queryId) {
      return true
    }

    if (data.queries[queryId].end !== nextData.queries[queryId].end) {
      return true
    }

    if (
      data.queries[queryId].queryCompleted !==
      nextData.queries[queryId].queryCompleted
    ) {
      return true
    }

    return false
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    ReactTooltip.rebuild()
  }

  render() {
    const { data, width, queryId } = this.props
    const { queries } = data

    const query = queries[queryId]

    return (
      <div className="chart">
        <ReactTooltip />
        <Query query={query} data={data} windowWidth={width} />
      </div>
    )
  }
}

class Query extends Component {
  render() {
    const { query, windowWidth } = this.props
    const { peers, id, seen, queried, toQuery, queryCompleted } = query
    const barsWidth = windowWidth - 50
    console.log('query is', query)

    const label = `Query ${id.toUpperCase()}`
    const style = actionBarStyle(query, query, barsWidth)
    const styleAfterBar = afterBarStyle(
      style.marginRight,
      windowWidth,
      barsWidth,
    )

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
              {queryCompleted && (
                <FontAwesomeIcon
                  data-tip="queryCompleted"
                  icon={faCheckDouble}
                  className="queryCompleted"
                />
              )}
            </div>

            <div
              className="chartBar chartBarAfterDescription"
              style={styleAfterBar}
            >
              {`${query.duration}ms`}
            </div>
          </div>
        </div>
        {peers.map((peer, key) => (
          <Peer key={key} peer={peer} query={query} windowWidth={windowWidth} />
        ))}
      </>
    )
  }
}

class Peer extends Component {
  render() {
    const { peer, query, windowWidth } = this.props
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
  if (c < 1) {
    c = 1
  }

  return {
    startPos: a,
    endPos: b,
    width: c,
  }
}

export { Chart }
