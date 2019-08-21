import React, { Component } from 'react'

import { FixedSizeList as List } from 'react-window'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faSpinner,
} from '@fortawesome/free-solid-svg-icons'

import Peer from '../Peer'

class Peers extends Component {
  render() {
    const {
      visiblePeerIds,
      peers,
      style,
      query,
      windowWidth,
      data,
      peerDials,
      peerAdds,
      renderFullList,
    } = this.props

    const PeerRow = ({ index, style }) => {
      let visiblePeerId = visiblePeerIds[index]
      let peerIdx = -1
      for (const tmpPeerIdx in peers) {
        if (peers[tmpPeerIdx].id === visiblePeerId) {
          peerIdx = tmpPeerIdx
          break
        }
      }
    
      if (peerIdx === -1)
        return <></>
    
      return (
        <Peer
          style={style}
          key={index}
          peer={peers[peerIdx]}
          query={query}
          windowWidth={windowWidth}
          data={data}
          peerDials={peerDials}
          peerAdds={peerAdds}
        />
      )
    }

    return (
      <>
        {renderFullList ? (
          <div className="list" style={{ position: 'relative' }}>
            <div
              style={{
                zIndex: 1000,
                backgroundColor: 'rgba(0,0,0,0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'absolute',
                width: '100%',
                height: '100%',
              }} 
            >
              <FontAwesomeIcon
                data-tip="saving image"
                icon={faSpinner}
                className="color-white fa-spin"
              />
            </div>
            <div style={{ width: '100%' }}>
              {visiblePeerIds.map((visiblePeerId) => {
                let peerIdx = -1
                for (const tmpPeerIdx in peers) {
                  if (peers[tmpPeerIdx].id === visiblePeerId) {
                    peerIdx = tmpPeerIdx
                    break
                  }
                }

                if (peerIdx === -1)
                  return <></>

                return (
                  <Peer
                    fullWidth={true}
                    key={visiblePeerId}
                    style={style}
                    peer={peers[peerIdx]}
                    query={query}
                    windowWidth={windowWidth}
                    data={data}
                    peerDials={peerDials}
                    peerAdds={peerAdds}
                  />
                )
              })}
            </div>
          </div>
        ) : (
          <List
            height={window.innerHeight}
            itemCount={visiblePeerIds.length}
            width={window.innerWidth}
            itemSize={40}
            className={"list"}
          >
            {PeerRow}
          </List>
        )}
        {/* comment out list and uncomment map below to view without windowing, scrolling feels faster, but might cause rerendering to be very slow with very long peer lists */}
        {/* {peers.map((peer, key) => (
           <Peer key={key} peer={peer} query={query} windowWidth={windowWidth} />
        ))} */}
      </>
    )
  }
}

export default Peers
