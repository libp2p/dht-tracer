import React, { Component } from 'react'
import ReactTooltip from 'react-tooltip'
import { FixedSizeList as List } from 'react-window'
import {
  faTimesCircle,
  faExclamationCircle,
  faCheckCircle,
  faPowerOff,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons'
import { IconCircles } from '../IconCircles'

const actionBarStyle = (action, data, windowWidth) => {
  const { startPos, endPos, width } = calculatePosByDates(
    new Date(data.start),
    new Date(data.end),
    new Date(action.start),
    new Date(action.end),
    new Date(windowWidth),
  )
  const barStyle = {
    marginLeft: startPos || 0,
    marginRight: endPos || 0,
    width: width || 0,
  }

  return barStyle
}

const afterBarStyle = (smallestRightMargin, windowWidth, barsWidth) => {
  return {
    marginLeft: barsWidth - (smallestRightMargin || 0),
  }
}

class Chart extends Component {
  shouldComponentUpdate(nextProps) {
    const { queryId: nextQueryId, data: nextData } = nextProps
    const { queryId, data } = this.props

    if (nextQueryId !== queryId) {
      return true
    }

    if (data.queries[queryId] !== nextData.queries[queryId]) {
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
    const { query, windowWidth, data } = this.props
    const {
      peers,
      id,
      seen,
      queried,
      toDial,
      dialed,
      toQuery,
      remaining,
      queryCompleted,
      success,
      xor,
      hops,
    } = query
    const barsWidth = windowWidth - 50

    const label = `Query ${id}`
    const style = actionBarStyle(query, query, barsWidth)
    const styleAfterBar = afterBarStyle(
      style.marginRight || 0,
      windowWidth,
      barsWidth,
    )
    const PeerRow = ({ index, style }) => (
      <Peer
        style={style}
        key={index}
        peer={peers[index]}
        query={query}
        windowWidth={windowWidth}
        data={data}
      />
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
          <div className="chartLabel" data-tip={label}>{label}</div>
          <div className="chartMiniColumn" />
          <div className="chartMiniColumn">{xor}</div>
          <div className="chartMiniColumn">{hops}</div>
          <div className="chartBars query" style={{ width: windowWidth }}>
            <div
              key={id}
              className={`chartBar chartBarTypemainquery`}
              style={style}
              data-tip={`Query duration: ${query.duration}ms`}
            >
              {`Seen: ${seen}, Queried: ${queried}, Dialed: ${dialed}, To Dial: ${toDial}, To Query: ${toQuery}, Remaining: ${remaining}`}
              {queryCompleted ? (
                <IconCircles
                  icon={faPowerOff}
                  outlineClass="queryCompleted"
                  dataTipText="query completed"
                  floatRight
                />
              ) : (
                <IconCircles
                  icon={faSpinner}
                  outlineClass="queryCompleted"
                  dataTipText="query pending"
                  floatRight
                />
              )}
              {queryCompleted && success && (
                <IconCircles
                  icon={faCheckCircle}
                  outlineClass="queryCompleted"
                  dataTipText="success"
                  floatRight
                />
              )}
              {queryCompleted && !success && (
                <IconCircles
                  icon={faTimesCircle}
                  outlineClass="queryCompleted"
                  dataTipText="failed"
                  floatRight
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
        <List
          height={window.innerHeight}
          itemCount={peers.length}
          width={window.innerWidth}
          itemSize={40}
        >
          {PeerRow}
        </List>
        {/* comment out list and uncomment map below to view without windowing, scrolling feels faster, but might cause rerendering to be very slow with very long peer lists */}
        {/* {peers.map((peer, key) => (
           <Peer key={key} peer={peer} query={query} windowWidth={windowWidth} />
        ))} */}
      </>
    )
  }
}

class Peer extends Component {
  render() {
    const { peer, query, windowWidth, style } = this.props
    const { id, filteredPeersNum, closerPeersNum, newPeersNum } = peer
    const barsWidth = windowWidth - 50
    const label = `Peer ${id}`
    let smallestRightMargin = barsWidth
    let totalDuration = 0

    return (
      <div className="chartRow" style={style}>
        <div className="chartLabel" data-tip={label}>{label}</div>
        <div className="chartMiniColumn">
          {peer.duplicate && (
            <IconCircles
              icon={faExclamationCircle}
              outlineClass="duplicateExclamation"
              dataTipText="duplicate"
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
              smallestRightMargin = style.marginRight || 0
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
                  <IconCircles
                    icon={faTimesCircle}
                    outlineClass="dialFailure"
                    dataTipText={`dail failure`}
                  />
                )}
                {action.type === 'query' && action.success && (
                  <IconCircles
                    icon={faCheckCircle}
                    outlineClass="recordsFound"
                    dataTipText="records found"
                  />
                )}
              </div>
            )
          })}
          <div
            data-tip="total duration # new peers / # filtered peers / # closer peers"
            className="chartBar chartBarAfterDescription"
            style={afterBarStyle(smallestRightMargin || 0, windowWidth, barsWidth)}
          >
            {`${totalDuration}ms`}{' '}
            {closerPeersNum
              ? `${newPeersNum}/${filteredPeersNum}/${closerPeersNum}`
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
