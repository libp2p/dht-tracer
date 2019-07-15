import React from 'react'
import { DateTime as LuxonDateTime, Interval } from 'luxon'

const units = [
  { name: 'ms', acronym: 'ms', duration: 1 },
  { name: 'second', acronym: 's', duration: 1000 },
  { name: 'minute', acronym: 'm', duration: 60 * 1000 },
  { name: 'hour', acronym: 'h', duration: 60 * 1000 * 60 },
  { name: 'day', acronym: 'd', duration: 24 * 60 * 1000 * 60 },
  { name: 'week', acronym: 'w', duration: 7 * 24 * 60 * 1000 * 60 },
  { name: 'month', acronym: 'mo', duration: 30 * 24 * 60 * 1000 * 60 },
  { name: 'year', acronym: 'y', duration: 365 * 24 * 60 * 1000 * 60 },
]

class DateTime extends React.Component {
  static shortDayFormat(date) {
    if (!date) {
      return null
    }

    let format
    const checkFormat = 'yyyyLLLdd'
    const today = LuxonDateTime.local()
    const formatted = date.toFormat(checkFormat)

    if (today.toFormat(checkFormat) === formatted) {
      format = 'h:mm a'
    } else {
      format = 'LLL d, yyyy'
    }

    return format
  }

  state = {
    now: LuxonDateTime.local(),
  }

  interval = null

  componentDidMount() {
    const { format } = this.props

    if (format === 'ago') {
      this.interval = setInterval(() => {
        this.setState({
          now: LuxonDateTime.local(),
        })
      }, 1000)
    }
  }

  componentWillUnmount() {
    clearInterval(this.interval)
  }

  ago(date, short) {
    const { now } = this.state
    let dir = ' ago'

    const diff = (v, n) =>
      short === undefined
        ? `${n} ${v.name}${n > 1 ? 's' : ''}${dir}`
        : n + v.acronym

    let { milliseconds } = Interval.fromDateTimes(date, now).toDuration()

    if (milliseconds < 0) {
      milliseconds *= -1
      dir = ' from now'
    }

    milliseconds = Math.round(milliseconds)

    let unitIndex = 0

    while (
      units[unitIndex + 1] &&
      milliseconds > units[unitIndex + 1].duration
    ) {
      unitIndex += 1
    }

    return diff(
      units[unitIndex],
      Math.round(milliseconds / units[unitIndex].duration),
    )
  }

  render() {
    const { date: dateProp, format, style } = this.props

    let date = dateProp
    let dateFormatted = ''

    if (date) {
      // if (date.indexOf(' ') > -1) {
      //   date = LuxonDateTime.fromISO(`${date.replace(' ', 'T')}.000`)
      // } else if (date.indexOf('T') === -1) {
      //   date = LuxonDateTime.fromFormat(date, 'yyyyLLddHHmmss')
      // } else {
      //   date = LuxonDateTime.fromISO(date)
      // }

      switch (format) {
        case 'shortday':
          dateFormatted = date.toFormat(DateTime.shortDayFormat(date))
          break

        case 'monthyear':
          dateFormatted = date.toFormat('LLLL yyyy')
          break

        case 'ago':
          dateFormatted = `${this.ago(date, true)} ago`
          break

        case 'datetime':
        default:
          dateFormatted = date.toFormat('LLL d yyyy, h:mm a')
          break
      }
    }

    return <span style={style}>{dateFormatted}</span>
  }
}

export { DateTime }
