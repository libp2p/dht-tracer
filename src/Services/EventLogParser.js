import { DateTime } from 'luxon'

class EventLogParserService {
  formattedArray = []

  data = { queries: {} }

  parseFileContent(content) {
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

    return dateTime
  }

  initializeQueryObject(id, time) {
    if (!this.data.queries[id]) {
      this.data.queries[id] = {
        id,
        start: this.formatDate(time),
        end: this.formatDate(time),
        duration: 0,
        peers: [],
        seen: 0,
        queried: 0,
        toQuery: 0,
        peerDials: {},
        peerQueries: {},
        peerAdds: {},
        queryCompleted: false,
      }
    }
  }

  findAndAddPeerAction = (peerID, queryID, peerData) => {
    let foundPeer = this.data.queries[queryID].peers.find(
      (p) => p.id === peerID,
    )
    if (!foundPeer) {
      foundPeer = {
        id: peerID,
        actions: [],
      }
      this.data.queries[queryID].peers.push(foundPeer)
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
    const {
      PeersSeen,
      PeersQueried,
      PeersToQueryLen,
      Query: { Key },
    } = queryRunner
    const query = this.data.queries[Key]
    query.seen = PeersSeen.length
    query.queried = PeersQueried.length
    query.toQuery = PeersToQueryLen
    query.end = this.formatDate(time)
    query.duration = new Date(query.end) - new Date(query.start)
  }

  finishedPeerDialAction(peerID, queryID, peerDial) {
    const { duplicate, alreadyConnected, success, end, start } = peerDial
    this.findAndAddPeerAction(peerID, queryID, {
      type: 'dial',
      dup: duplicate,
      alreadyConnected,
      success,
      duration: new Date(end) - new Date(start),
      start: this.formatDate(start),
      end: this.formatDate(end),
    })
  }

  finishedPeerQueryAction(peerID, queryID, peerQuery) {
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
    this.findAndAddPeerAction(peerID, queryID, {
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

  finishedPeerAddedAction(peerID, queryID, peerAdd) {
    const { hops, xor, end, start } = peerAdd
    this.findAndAddPeerAction(peerID, queryID, {
      type: 'add',
      hops,
      xor,
      duration: new Date(end) - new Date(start),
      start: this.formatDate(start),
      end: this.formatDate(end),
    })
  }

  processPeerQueryStart(peerQuery) {
    const {
      peerID,
      time,
      QueryRunner: {
        Query: { Key },
      },
    } = peerQuery
    this.initializeQueryObject(Key, time)
    this.data.queries[Key].peerQueries[peerID] = {}
    this.data.queries[Key].peerQueries[peerID].start = time
  }

  processPeerQueryEnd(peerQuery) {
    const { peerID, time, QueryRunner } = peerQuery
    const {
      Query: { Key },
    } = QueryRunner
    const peerQueryObject =
      this.data.queries[Key] && this.data.queries[Key].peerQueries[peerID]
    if (peerQueryObject) {
      peerQueryObject.end = time
      if (peerQueryObject.closerPeers || peerQueryObject.success) {
        this.finishedPeerQueryAction(peerID, Key, peerQueryObject)
        this.updateQueryRunner(QueryRunner, time)
      }
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
    const {
      peerID,
      success,
      filteredPeers,
      closerPeers,
      QueryRunner: {
        Query: { Key },
      },
    } = peerQuery
    const peerQueryObject =
      this.data.queries[Key] && this.data.queries[Key].peerQueries[peerID]
    if (peerQueryObject) {
      peerQueryObject.success = success
      peerQueryObject.filteredPeers = filteredPeers
      peerQueryObject.closerPeers = closerPeers
      peerQueryObject.newPeersNum = findNumNewPeers(peerQuery)
      // not ideal but for now do this check in case end or result come in out of order
      if (peerQueryObject.end) {
        this.finishedPeerQueryAction(peerID, Key, peerQueryObject)
      }
    }
  }

  processDialPeerDialing(peerDial) {
    const {
      peerID,
      time,
      QueryRunner: {
        Query: { Key },
      },
    } = peerDial
    this.initializeQueryObject(Key, time)
    this.data.queries[Key].peerDials[peerID] = {}
    let peerDialObject = this.data.queries[Key].peerDials[peerID]
    if (peerDialObject) {
      peerDialObject.duplicate = true
    }
    peerDialObject.start = time
  }

  processDialPeerFailure(peerDial) {
    const { peerID, time, QueryRunner } = peerDial
    const {
      Query: { Key },
    } = QueryRunner
    const peerDialObject =
      this.data.queries[Key] && this.data.queries[Key].peerDials[peerID]
    if (peerDialObject) {
      peerDialObject.end = time
      peerDialObject.success = false
      this.finishedPeerDialAction(peerID, Key, peerDialObject)
      this.updateQueryRunner(QueryRunner, time)
    }
  }

  processDialPeerSuccess(peerDial) {
    const { peerID, time, QueryRunner } = peerDial
    const {
      Query: { Key },
    } = QueryRunner
    const peerDialObject =
      this.data.queries[Key] && this.data.queries[Key].peerDials[peerID]
    if (peerDialObject) {
      peerDialObject.end = time
      peerDialObject.success = true
      this.finishedPeerDialAction(peerID, Key, peerDialObject)
      this.updateQueryRunner(QueryRunner, time)
    }
  }

  processDialPeerAlreadyConencted(peerDial) {
    const { peerID, time, XOR, QueryRunner } = peerDial
    const {
      Query: { Key },
    } = QueryRunner
    this.initializeQueryObject(Key, time)
    this.data.queries[Key].peerDials[peerID] = {}
    const peerDialObject = this.data.queries[Key].peerDials[peerID]
    if (peerDialObject) {
      peerDialObject.duplicate = true
    }
    peerDialObject.start = time
    peerDialObject.end = time
    peerDialObject.alreadyConnected = true
    peerDialObject.success = true
    peerDialObject.xor = XOR
    this.finishedPeerDialAction(peerID, Key, peerDialObject)
    this.updateQueryRunner(QueryRunner, time)
  }

  processPeerAdded(peerAdd) {
    const { peerID, time, Hops, XOR, QueryRunner } = peerAdd
    const {
      Query: { Key },
    } = QueryRunner
    this.initializeQueryObject(Key, time)
    this.data.queries[Key].peerAdds[peerID] = {}
    const peerAddObject = this.data.queries[Key].peerAdds[peerID]
    peerAddObject.start = time
    peerAddObject.end = time
    peerAddObject.hops = Hops
    peerAddObject.xor = XOR
    this.finishedPeerAddedAction(peerID, Key, peerAddObject)
    this.updateQueryRunner(QueryRunner, time)
  }

  processQueryRunnerStart(runnerStart) {
    const { time, QueryRunner } = runnerStart
    const {
      Query: { Key },
    } = QueryRunner
    this.initializeQueryObject(Key, time)
    this.updateQueryRunner(QueryRunner, time)
  }

  processQueryRunnerEnd(runnerEnd) {
    const {
      QueryRunner: {
        Query: { Key },
      },
    } = runnerEnd
    this.processQueryRunnerStart(runnerEnd)
    this.data.queries[Key].queryCompleted = true
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
      case 'dhtQueryRunner.addPeerToQuery':
        this.processPeerAdded(eventLog)
        break
      case 'dhtQueryRunner.Run.Start':
        this.processQueryRunnerStart(eventLog)
        break
      case 'dhtQueryRunner.Run.End':
        this.processQueryRunnerEnd(eventLog)
        break
      default:
    }

    return this.data
  }

  formatEvents() {
    for (const eventLog of this.formattedArray) {
      this.formatNewEvent(eventLog)
    }

    console.log('data is', this.data)

    return this.data
  }
}

export const EventLogParser = new EventLogParserService()
