import React, { Component } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowUp,
  faArrowDown,
} from '@fortawesome/free-solid-svg-icons'

class SortAndFilters extends Component {
  render() {
    const {
      sortKey,
      sortAsc,
      completedFilters,
      setSortKey,
      handleCompletedFilterChange,
    } = this.props

    return (
      <div className="chartRow" style={{ zIndex: 10, display: 'flex', position: 'relative' }}>
        <div className="chartLabel" />
        <div className="chartMiniColumn" />
        <div 
          className={`chartMiniColumn pointer ${sortKey.toLowerCase() === 'xor' ? 'bold' : ''}`}
          data-tip="sort by xor" 
          onClick={() => { setSortKey('xor'); }}>
            {sortKey.toLowerCase() === 'xor' && (
              <FontAwesomeIcon
                data-tip="awaiting response"
                icon={sortAsc ? faArrowUp : faArrowDown}
                className="color-black fa-xs"
              />
            )}
            xor
        </div>
        <div 
          className={`chartMiniColumn pointer ${sortKey.toLowerCase() === 'hops' ? 'bold' : ''}`} 
          data-tip="sort by hops" 
          onClick={() => { setSortKey('hops'); }}>
            {sortKey.toLowerCase() === 'hops' && (
              <FontAwesomeIcon
                data-tip="sort by hops"
                icon={sortAsc ? faArrowUp : faArrowDown}
                className="color-black fa-xs"
              />
            )}
            hops
        </div>
        <div className="uk-inline" style={{ paddingLeft: '10px' }}>
          <button className="uk-button uk-button-default" type="button">Filters</button>
          <div data-uk-dropdown="mode: click">
            <label><input className="uk-checkbox" type="checkbox" value="completed" checked={completedFilters.includes('completed')} onChange={handleCompletedFilterChange} /> Completed</label>
            <br />
            <label><input className="uk-checkbox" type="checkbox" value="not-completed" checked={completedFilters.includes('not-completed')} onChange={handleCompletedFilterChange} /> Not Completed</label>
          </div>
        </div>
      </div>
    )
  }
}

export default SortAndFilters
