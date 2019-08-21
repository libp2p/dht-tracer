import React, { Component } from 'react'
import { IconCircles } from '../../IconCircles'
import {
  faTimesCircle,
  faExclamationCircle,
  faCheckCircle,
  faSpinner,
  faClock,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { actionBarStyle, afterBarStyle } from '../../../utils'

class Peer extends Component {
  render() {
    const { peer, query, windowWidth, peerDials, fullWidth, style } = this.props
    const { id, filteredPeersNum, closerPeersNum, newPeersNum } = peer
    const { peerQueries } = query
    const barsWidth = windowWidth - 50
    const label = `Peer ${id}`
    let smallestRightMargin = barsWidth
    let totalDuration = 0
    const dialed = peerDials[id];

    let peerStyle = window.Object.assign({}, style)
    if (fullWidth) {
      peerStyle.width = '100%'
    }

    return (
      <div className="chartRow hoverable" style={peerStyle}>
        <div className="chartLabel" data-tip={label}>{label}</div>
        <div className="chartMiniColumn">
          {peer.duplicate && (
            <IconCircles
              icon={faExclamationCircle}
              outlineClass="duplicateExclamation"
              dataTipText="duplicate"
            />
          )}
          {!dialed && (
            <FontAwesomeIcon
              icon={faClock}
              className="color-black"
              data-tip="Queued"
            />
          )}
          {peerQueries[id] && (!peerQueries[id].end || (peerQueries[id].closerPeers && peerQueries[id].closerPeers.length === 0)) && (
            <FontAwesomeIcon
              data-tip="awaiting response"
              icon={faSpinner}
              className="color-black fa-spin"
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
            let style = actionBarStyle(action, query, barsWidth)
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
                    : !dialed 
                    ? 'queued'
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
            { !dialed ? 'queued' : `${totalDuration}ms`}{' '}
            {closerPeersNum
              ? `${newPeersNum}/${filteredPeersNum}/${closerPeersNum}`
              : ''}
          </div>
        </div>
      </div>
    )
  }
}

export default Peer
