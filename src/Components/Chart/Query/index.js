import React, { Component } from 'react'

import Peers from '../Peers'
import SortAndFilters from '../SortAndFilters'
import ChartHeader from '../ChartHeader'
import { actionBarStyle, afterBarStyle } from '../../../utils'

class Query extends Component {
  render() {
    const { 
      query,
      windowWidth, 
      data, 
      visiblePeerIds, 
      sortKey, 
      renderFullList,
      sortAsc, 
      completedFilters, 
      handleCompletedFilterChange, 
      setSortKey,
    } = this.props

    const {
      peerDials,
      peerAdds,
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
    } = query
    const barsWidth = windowWidth - 50
    const label = `Query ${id}`

    let style = actionBarStyle(query, query, barsWidth)
    let styleAfterBar = afterBarStyle(
      style.marginRight || 0,
      windowWidth,
      barsWidth,
    )


    return (
      <>
        <SortAndFilters
          sortKey={sortKey}
          sortAsc={sortAsc}
          completedFilters={completedFilters}
          setSortKey={setSortKey}
          handleCompletedFilterChange={handleCompletedFilterChange}
        />
        <ChartHeader
          windowWidth={windowWidth}
          label={label}
          id={id}
          style={style}
          query={query}
          seen={seen}
          queried={queried}
          toDial={toDial}
          toQuery={toQuery}
          remaining={remaining}
          queryCompleted={queryCompleted}
          success={success}
          styleAfterBar={styleAfterBar}
          dialed={dialed}
        />
        <Peers
          visiblePeerIds={visiblePeerIds}
          peers={peers}
          style={style}
          query={query}
          windowWidth={windowWidth}
          data={data}
          peerDials={peerDials}
          peerAdds={peerAdds}
          renderFullList={renderFullList}
        />
      </>
    )
  }
}

export default Query
