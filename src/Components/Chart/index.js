import React, { Component } from 'react'
import ReactTooltip from 'react-tooltip'
import Query from './Query'

class Chart extends Component {
  shouldComponentUpdate(nextProps) {
    const {
      queryId: nextQueryId,
      data: nextData,
      nextSortKey,
      nextSortAsc,
      nextVisiblePeerIds,
      nextCompletedFilters
    } = nextProps

    const {
      queryId,
      data,
      sortKey,
      sortAsc,
      visiblePeerIds,
      completedFilters
    } = this.props

    if (nextQueryId !== queryId) {
      return true
    }

    if (data.queries[queryId] !== nextData.queries[queryId]) {
      return true
    }

    if (data.queries[queryId].queryCompleted !== nextData.queries[queryId].queryCompleted)
      return true

    if (
      nextSortKey !== sortKey 
      || nextSortAsc !== sortAsc 
      || visiblePeerIds !== nextVisiblePeerIds 
      || nextCompletedFilters !== completedFilters
    )
      return true

    return false
  }

  componentDidUpdate(prevProps, prevState, snapshot) {
    ReactTooltip.rebuild()
  }

  render() {
    const {
      data,
      width,
      queryId,
      visiblePeerIds,
      sortKey,
      sortAsc,
      completedFilters,
      handleCompletedFilterChange,
      renderFullList
    } = this.props

    const { queries } = data

    const query = queries[queryId]

    return (
      <div id="the-chart" className="chart">
        <ReactTooltip />
        <Query 
          query={query}
          data={data}
          windowWidth={width}
          setSortKey={this.props.setSortKey}
          visiblePeerIds={visiblePeerIds}
          sortKey={sortKey}
          sortAsc={sortAsc}
          completedFilters={completedFilters}
          handleCompletedFilterChange={handleCompletedFilterChange}
          renderFullList={renderFullList}
        />
      </div>
    )
  }
}

export { Chart }
