import { DateTime } from 'luxon'

class EventLogParserService {
  formattedArray = []

  queryRunner = { PeersSeen: [], PeersQueried: [], PeersToQueryLen: 0 }

  query = {
    start: 0,
    end: 0,
    duration: 0,
    peers: [],
    seen: this.queryRunner.PeersSeen.length,
    queried: this.queryRunner.PeersQueried.length,
    toQuery: this.queryRunner.PeersToQueryLen,
  }

  peerDials = {}

  peerQueries = {}

  peerAdds = {}

  dateStart = null

  dateEnd = null

  parseFileContent(content) {
    console.log('formatted array', this.formattedArray)
    console.log('pending peer dials', this.peerDials)
    const array = content.split('\n')

    return array.map((event) => {
      try {
        return JSON.parse(event)
      } catch {
        return { error: 'incorrectly formatted event' }
      }
    })
  }

  formatDate = (date) => {
    if (!date) {
      return null
    }
    const dateTime =
      typeof date === 'string'
        ? DateTime.fromISO(date)
        : DateTime.fromMillis(date)
    if (!this.dateStart || dateTime < this.dateStart) {
      this.dateStart = dateTime
    }
    if (!this.dateEnd || dateTime > this.dateEnd) {
      this.dateEnd = dateTime
    }

    return dateTime
  }

  findEventsForTypeAndQuery(type, queryId) {
    return this.formattedArray
      .filter((event) => event.event === type)
      .filter((event) => event.QueryRunner.Query.Key === queryId)
  }

  findAndAddPeerAction = (peer, peerData) => {
    let foundPeer = this.query.peers.find((p) => p.id === peer)
    if (!foundPeer) {
      foundPeer = {
        id: peer,
        actions: [],
      }
      this.query.peers.push(foundPeer)
    }

    ;[
      'dup',
      'filteredPeersNum',
      'closerPeersNum',
      'newPeersNum',
      'xor',
      'hops',
      'alreadyConnected',
    ].forEach((key) => {
      if (!(key in peerData)) return
      foundPeer[key] = peerData[key]
    })

    foundPeer.actions.push({
      type: peerData.type,
      start: peerData.start,
      end: peerData.end,
      duration: peerData.duration,
      success: peerData.success,
    })
  }

  updateQueryRunner(queryRunner, time) {
    const { PeersSeen, PeersQueried, PeersToQueryLen } = queryRunner
    this.queryRunner.PeersSeen = PeersSeen
    this.queryRunner.PeersQueried = PeersQueried
    this.queryRunner.PeersToQueryLen = PeersToQueryLen
    this.query.end = this.formatDate(time)
    this.query.duration = new Date(this.query.end) - new Date(this.query.start)
  }

  finishedPeerQueryAction(peerID, peerQuery) {
    const {
      filteredPeers,
      closerPeers,
      newPeersNum,
      success,
      end,
      start,
    } = peerQuery
    const filteredPeersNum = filteredPeers ? filteredPeers.length : 0
    const closerPeersNum = closerPeers ? closerPeers.length : 0
    this.findAndAddPeerAction(peerID, {
      type: 'query',
      filteredPeersNum,
      closerPeersNum,
      newPeersNum,
      success,
      duration: new Date(end) - new Date(start),
      start: this.formatDate(start),
      end: this.formatDate(end),
    })
  }

  processPeerQueryStart(peerQuery) {
    const { peerID, time } = peerQuery
    this.peerQueries[peerID] = {}
    this.peerQueries[peerID].start = time
  }

  processPeerQueryEnd(peerQuery) {
    const { peerID, time, QueryRunner } = peerQuery
    if (this.peerQueries[peerID]) {
      this.peerQueries[peerID].end = time
    }
    if (
      this.peerQueries[peerID].closerPeers ||
      this.peerQueries[peerID].success
    ) {
      this.finishedPeerQueryAction(peerID, peerQuery)
      this.updateQueryRunner(QueryRunner, time)
    }
  }

  processPeerQueryResult(peerQuery) {
    const findNumNewPeers = (peerQuery) => {
      const {
        filteredPeers,
        QueryRunner: { PeersSeen },
      } = peerQuery
      let newPeersNum = 0
      if (filteredPeers && filteredPeers.length > 0) {
        for (const peer of filteredPeers) {
          if (!PeersSeen.includes(peer)) {
            newPeersNum += 1
          }
        }
      }

      return newPeersNum
    }
    const { peerID, success, filteredPeers, closerPeers } = peerQuery
    if (this.peerQueries[peerID]) {
      this.peerQueries[peerID].success = success
      this.peerQueries[peerID].filteredPeers = filteredPeers
      this.peerQueries[peerID].closerPeers = closerPeers
      this.peerQueries[peerID].newPeersNum = findNumNewPeers(peerQuery)
    }

    // not idea but for now do this check in case end or result come in out of order
    if (this.peerQueries[peerID].end) {
      this.finishedPeerQueryAction(peerID, peerQuery)
    }
  }

  finishedPeerDialAction(peerID, peerDial) {
    const { duplicate, alreadyConnected, success, end, start } = peerDial
    this.findAndAddPeerAction(peerID, {
      type: 'dial',
      dup: duplicate,
      alreadyConnected,
      success,
      duration: new Date(end) - new Date(start),
      start: this.formatDate(start),
      end: this.formatDate(end),
    })
  }

  processDialPeerDialing(peerDial) {
    const { peerID, time } = peerDial
    if (this.peerDials[peerID]) {
      this.peerDials[peerID].duplicate = true
    } else {
      this.peerDials[peerID] = {}
    }
    this.peerDials[peerID].start = time
  }

  processDialPeerFailure(peerDial) {
    const { peerID, time, QueryRunner } = peerDial
    if (this.peerDials[peerID]) {
      this.peerDials[peerID].end = time
      this.peerDials[peerID].success = false
      this.finishedPeerDialAction(peerID, this.peerDials[peerID])
      this.updateQueryRunner(QueryRunner, time)
    }
  }

  processDialPeerSuccess(peerDial) {
    const { peerID, time, QueryRunner } = peerDial
    if (this.peerDials[peerID]) {
      this.peerDials[peerID].end = time
      this.peerDials[peerID].success = true
      this.finishedPeerDialAction(peerID, this.peerDials[peerID])
      this.updateQueryRunner(QueryRunner, time)
    }
  }

  processDialPeerAlreadyConencted(peerDial) {
    const { peerID, time, XOR, QueryRunner } = peerDial
    if (this.peerDials[peerID]) {
      this.peerDials[peerID].duplicate = true
    } else {
      this.peerDials[peerID] = {}
    }
    this.peerDials[peerID].start = time
    this.peerDials[peerID].end = time
    this.peerDials[peerID].alreadyConnected = true
    this.peerDials[peerID].success = true
    this.peerDials[peerID].xor = XOR
    this.finishedPeerDialAction(peerID, this.peerDials[peerID])
    this.updateQueryRunner(QueryRunner, time)
  }

  processPeerAdded(peerAdd) {
    const { peerID, time, Hops, XOR } = peerAdd
    this.peerAdds[peerID] = {}
    this.peerAdds[peerID].start = time
    this.peerAdds[peerID].end = time
    this.peerAdds[peerID].hops = Hops
    this.peerAdds[peerID].xor = XOR
  }

  formatNewEvent(eventLog) {
    const { event } = eventLog
    switch (event) {
      case 'dhtQueryRunner.dialPeer.Dialing':
        this.processDialPeerDialing(eventLog)
        break
      case 'dhtQueryRunner.dialPeer.DialFailure':
        this.processDialPeerFailure(eventLog)
        break
      case 'dhtQueryRunner.dialPeer.DialSuccess':
        this.processDialPeerSuccess(eventLog)
        break
      case 'dhtQueryRunner.dialPeer.AlreadyConnected':
        this.processDialPeerAlreadyConencted(eventLog)
        break
      case 'dhtQueryRunner.queryPeer.Start':
        this.processPeerQueryStart(eventLog)
        break
      case 'dhtQueryRunner.queryPeer.End':
        this.processPeerQueryEnd(eventLog)
        break
      case 'dhtQueryRunner.queryPeer.Result':
        this.processPeerQueryResult(eventLog)
        break

      default:
    }
  }

  formatEvents(queryId) {
    const filteredArray = this.formattedArray.filter(
      (event) => event.QueryRunner && event.QueryRunner.Query.Key === queryId,
    )
    const queryRunnerRunStart = this.findEventsForTypeAndQuery(
      'dhtQueryRunner.Run.Start',
      queryId,
    )[0]
    this.queryRunner = queryRunnerRunStart.QueryRunner
    this.query.id = queryId
    this.query.start = this.formatDate(queryRunnerRunStart.time)
    this.query.end = this.formatDate(queryRunnerRunStart.time)
    this.query.duration = 0

    for (const eventLog of filteredArray) {
      this.formatNewEvent(eventLog)
    }
    const data = {
      queries: [],
      start: null,
      end: null,
    }
    data.start = this.dateStart
    data.end = this.dateEnd
    data.queries.push(this.query)

    return data
  }

  peerAddedActions(queryId) {
    const peerAdds = {}
    const peerAddedArray = this.findEventsForTypeAndQuery(
      'dhtQueryRunner.addPeerToQuery',
      queryId,
    )
    for (const peerAdd of peerAddedArray) {
      const { peerID, time, Hops, XOR } = peerAdd
      peerAdds[peerID] = {}
      peerAdds[peerID].start = time
      peerAdds[peerID].end = time
      peerAdds[peerID].hops = Hops
      peerAdds[peerID].xor = XOR
    }

    return peerAdds
  }

  filterData(queryId) {
    const queryRunnerRunStart = this.findEventsForTypeAndQuery(
      'dhtQueryRunner.Run.Start',
      queryId,
    )[0]

    this.queryRunner = queryRunnerRunStart.QueryRunner
    const peerQueriesObject = this.combineQueryActions(queryId)
    // const peerDialsObject = this.combineDialActions(queryId)
    const peerAddsObject = this.peerAddedActions(queryId)

    const queryRunnerRunEnd = this.findEventsForTypeAndQuery(
      'dhtQueryRunner.Run.End',
      queryId,
    )[0]

    let dateStart = null
    let dateEnd = null

    const formatDate = (date) => {
      if (!date) {
        return null
      }
      const dateTime =
        typeof date === 'string'
          ? DateTime.fromISO(date)
          : DateTime.fromMillis(date)
      if (!dateStart || dateTime < dateStart) {
        dateStart = dateTime
      }
      if (!dateEnd || dateTime > dateEnd) {
        dateEnd = dateTime
      }

      return dateTime
    }

    const data = {
      queries: [],
      start: null,
      end: null,
    }

    if (!queryRunnerRunStart) {
      return
    }

    let queryDuration = 0
    let start = 0
    let end = 0
    try {
      queryDuration =
        new Date(queryRunnerRunEnd.time) - new Date(queryRunnerRunStart.time)
      start = formatDate(queryRunnerRunStart.time)
      end = formatDate(queryRunnerRunEnd.time)
    } catch {}
    const query = {
      id: queryId,
      seen: queryRunnerRunEnd.QueryRunner.PeersSeen.length,
      queried: queryRunnerRunEnd.QueryRunner.PeersQueried.length,
      toQuery: queryRunnerRunEnd.QueryRunner.PeersToQueryLen,
      duration: queryDuration,
      start,
      end,
      peers: [],
    }

    const findAndAddPeerAction = (peer, peerData) => {
      let foundPeer = query.peers.find((p) => p.id === peer)
      if (!foundPeer) {
        foundPeer = {
          id: peer,
          actions: [],
        }
        query.peers.push(foundPeer)
      }

      ;[
        'dup',
        'filteredPeersNum',
        'closerPeersNum',
        'newPeersNum',
        'xor',
        'hops',
        'alreadyConnected',
      ].forEach((key) => {
        if (!(key in peerData)) return
        foundPeer[key] = peerData[key]
      })

      foundPeer.actions.push({
        type: peerData.type,
        start: peerData.start,
        end: peerData.end,
        duration: peerData.duration,
        success: peerData.success,
      })
    }

    // for (const peer in peerQueriesObject) {
    //   const peerObj = peerQueriesObject[peer]
    //   const {
    //     filteredPeers,
    //     closerPeers,
    //     newPeersNum,
    //     success,
    //     end,
    //     start,
    //   } = peerObj
    //   const filteredPeersNum = filteredPeers ? filteredPeers.length : 0
    //   const closerPeersNum = closerPeers ? closerPeers.length : 0
    //   findAndAddPeerAction(peer, {
    //     type: 'query',
    //     filteredPeersNum,
    //     closerPeersNum,
    //     newPeersNum,
    //     success,
    //     duration: new Date(end) - new Date(start),
    //     start: formatDate(start),
    //     end: formatDate(end),
    //   })
    // }

    // for (const peer in peerDialsObject) {
    //   const peerObj = peerDialsObject[peer]
    //   const { duplicate, alreadyConnected, success, end, start } = peerObj
    //   findAndAddPeerAction(peer, {
    //     type: 'dial',
    //     dup: duplicate,
    //     alreadyConnected,
    //     success,
    //     duration: new Date(end) - new Date(start),
    //     start: formatDate(start),
    //     end: formatDate(end),
    //   })
    // }

    for (const peer in peerAddsObject) {
      const peerObj = peerAddsObject[peer]
      const { hops, end, start, xor } = peerObj
      findAndAddPeerAction(peer, {
        type: 'added',
        hops,
        xor,
        duration: new Date(end) - new Date(start),
        start: formatDate(start),
        end: formatDate(end),
      })
    }

    data.start = dateStart
    data.end = dateEnd
    data.queries.push(query)

    return data
  }
}

export const EventLogParser = new EventLogParserService()
