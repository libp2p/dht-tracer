import React, { Component } from 'react'
import { Message } from './Message'
import { exampleLog } from '../../utils/exampleLog'

class ErrorMessage extends Component {
  render() {
    const {
      fileReadError,
      streamingError,
      readingStream,
      ranQuery,
      queryError,
    } = this.props

    return (
      <>
        {fileReadError && (
          <Message>
            <div>
              Sorry, your log file seems to be improperly formatted. Please make
              sure there isn't any extra info in your log file and your log
              entries are formatted like the below examples:{' '}
            </div>
            <code>{exampleLog}</code>
          </Message>
        )}
        {streamingError && (
          <Message>
            <div>
              Sorry, there is a problem connecting to the event stream. Please
              check that your connection is open and you are pointing to the
              right endpoint.
            </div>
          </Message>
        )}
        {!readingStream && ranQuery && (
          <Message warning>
            <div>
              If you run queries here without first reading from the event
              logs, you won't see them visualized here.
            </div>
          </Message>
        )}
        {queryError && (
          <Message>
            <div>
              There was an error running your query, please check that your
              arguments are formatted properly.
            </div>
          </Message>
        )}
      </>
    )
  }
}

export default ErrorMessage
