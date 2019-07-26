import { DateTime } from 'luxon'
import update from 'immutability-helper'

class EventLogParserService {
  formattedArray = []

  data = { queries: {} }

  parseFileContent(content) {
    let array = content.split('\n\n')
    array = array.map((line) => line.slice(6))

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
      this.data = update(this.data, {
        queries: {
          [id]: {
            $set: {
              id,
              start: this.formatDate(time),
              end: this.formatDate(time),
              duration: 0,
              peers: [],
              seen: 0,
              queried: 0,
              dialed: 0,
              toDial: 0,
              toQuery: 0,
              remaining: 0,
              peerDials: {},
              peerQueries: {},
              peerAdds: {},
              queryCompleted: false,
            },
          },
        },
      })
    }
  }

  findAndAddPeerAction = (peerID, queryID, peerData) => {
    let foundPeerIndex = this.data.queries[queryID].peers.findIndex(
      (p) => p.id === peerID,
    )
    if (foundPeerIndex === -1) {
      const foundPeer = {
        id: peerID,
        actions: [],
      }
      // use update for non-helper mutations that should affect view
      this.data = update(this.data, {
        queries: { [queryID]: { peers: { $push: [foundPeer] } } },
      })
      foundPeerIndex = this.data.queries[queryID].peers.length - 1
    }
    // update xor and hops of query with vals of successful peer query
    if (peerData.type === 'query' && peerData.success) {
      const { xor, hops } = this.data.queries[queryID].peers[foundPeerIndex]
      this.data = update(this.data, {
        queries: {
          [queryID]: {
            $merge: { xor, hops },
          },
        },
      })
    }

    ;[
      'duplicate',
      'filteredPeersNum',
      'closerPeersNum',
      'newPeersNum',
      'xor',
      'hops',
      'alreadyConnected',
    ].forEach((key) => {
      if (!(key in peerData)) return
      this.data = update(this.data, {
        queries: {
          [queryID]: {
            peers: { [foundPeerIndex]: { [key]: { $set: peerData[key] } } },
          },
        },
      })
    })
    const newPeerAction = (({ type, start, end, duration, success }) => ({
      type,
      start,
      end,
      duration,
      success,
    }))(peerData)
    this.data = update(this.data, {
      queries: {
        [queryID]: {
          peers: {
            [foundPeerIndex]: { actions: { $push: [newPeerAction] } },
          },
        },
      },
    })
  }

  updateQueryRunner(queryRunner, time) {
    const {
      PeersSeen,
      PeersQueried,
      PeersDialQueueLen,
      PeersDialedNew,
      PeersToQueryLen,
      PeersRemainingLen,
      Query: { Key },
      Result: { Success },
    } = queryRunner
    const query = this.data.queries[Key]
    const updatedQueryRunnerData = {
      seen: PeersSeen.length,
      queried: PeersQueried.length,
      toDial: PeersDialQueueLen,
      dialed: PeersDialedNew.length,
      toQuery: PeersToQueryLen,
      remaining: PeersRemainingLen,
      end: this.formatDate(time),
      success: Success,
      duration: new Date(this.formatDate(time)) - new Date(query.start),
    }
    this.data = update(this.data, {
      queries: {
        [Key]: {
          $merge: updatedQueryRunnerData,
        },
      },
    })
  }

  finishedPeerDialAction(peerID, queryID, peerDial) {
    const { alreadyConnected, success, end, start } = peerDial
    this.findAndAddPeerAction(peerID, queryID, {
      type: 'dial',
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
    const { duplicate, hops, xor, end, start } = peerAdd
    this.findAndAddPeerAction(peerID, queryID, {
      type: 'add',
      hops,
      duplicate,
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
      // for now do this check in case end or result come in out of order, maybe later update to return in queryRunnerResult
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
    console.log('peer added', this.data.queries[Key].peerAdds[peerID])
    this.initializeQueryObject(Key, time)
    if (this.data.queries[Key].peerAdds[peerID]) {
      this.data.queries[Key].peerAdds[peerID].duplicate = true
    } else {
      this.data.queries[Key].peerAdds[peerID] = {}
    }
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
    const { time, QueryRunner } = runnerEnd
    const {
      QueryRunner: {
        Query: { Key },
      },
    } = runnerEnd
    this.initializeQueryObject(Key, time)
    this.updateQueryRunner(QueryRunner, time)
    this.data = update(this.data, {
      queries: { [Key]: { queryCompleted: { $set: true } } },
    })
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
