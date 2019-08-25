import React, { Component } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMoon } from '@fortawesome/free-solid-svg-icons'
import FoundQueries from './FoundQueries'

class Header extends Component {
  render() {
    const {
      data,
      queryId,
      saveLog,
      saveScreenshot,
      changeQueryFilter,
      toggleDarkMode,
    } = this.props

    return (
      <>
        {false && <FoundQueries
          data={data}
          queryId={queryId}
          saveLog={saveLog}
          saveScreenshot={saveScreenshot}
          changeQueryFilter={changeQueryFilter}
        />
        }
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}><h4 style={{ marginBottom: '0px' }} className="text-center padding">DHT Tracer </h4></div>
        <div onClick={toggleDarkMode} className="nightModeWrapper">
          <FontAwesomeIcon icon={faMoon} className="nightMode" />
        </div>
      </>
    )
  }
}

export default Header
