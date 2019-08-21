import React, { Component } from 'react'
import {
  faTimesCircle,
  faCheckCircle,
  faPowerOff,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons'
import { IconCircles } from '../../IconCircles'

class ChartHeader extends Component {
  render() {
    const {
      windowWidth,
      label,
      id,
      style,
      query,
      seen,
      queried,
      toDial,
      toQuery,
      remaining,
      queryCompleted,
      success,
      styleAfterBar,
      dialed,
    } = this.props
    
    return (
      <div className="chartRow headerRow" style={{ zIndex: 1 }}>
        <div className="chartLabel" style={{ width: '200px' }} data-tip={label}>{label}</div>
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
                outlineClass="queryCompleted fa-spin"
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
    )
  }
}

export default ChartHeader
