import React, { Component } from 'react'
import ErrorMessage from '../ErrorMessage'

class StartMenu extends Component {
  render() {
    const {
      data,
      readingStream,
      loggingEndpoint,
      command,
      commandArgs,
      commandArgExplanation,
      queryError,
      fileReadError,
      ranQuery,
      changeLoggingEndpoint,
      handleFileChosen,
      readStream,
      changeCommand,
      changeCommandArgs,
      query,
    } = this.props

    return (
      <div className="startOptions">
        {!data && (
          <div className="row" style={{ alignItems: 'center' }}>
            <div className="row center" style={{ margin: '0px' }}>
              <label htmlFor="file-upload" className="customFileUpload">
                CHOOSE FILE
              </label>
              <input
                type="file"
                id="file-upload"
                className="inputfile"
                onChange={(e) => handleFileChosen(e.target.files[0])}
              />
            </div>

            <span style={{ padding: '0px 15px' }}> - or - </span>

            <div className="inputRow" style={{ margin: '0px' }}>
              <div className="mainInput">
                <input
                  disabled={readingStream}
                  type="text"
                  value={loggingEndpoint}
                  onChange={changeLoggingEndpoint}
                />
              </div>
              <button onClick={readStream} disabled={readingStream}>
                {readingStream
                  ? 'Reading from stream at localhost:7000/events'
                  : 'Read from stream'}
              </button>
            </div>
          </div>
        )}

        {(readingStream || !data) && (
          <div className="inputRow">
            <div className="selectInput">
              <select value={command} onChange={changeCommand}>
                <option value="" disabled hidden>
                  Choose command
                </option>
                <option value="put-value">put-value</option>
                <option value="get-value">get-value</option>
                <option value="add-provider">add-provider</option>
                <option value="get-providers">get-providers</option>
                <option value="find-peer">find-peer</option>
                <option value="ping">ping</option>
                <option value="reset">reset</option>
                <option value="exit">exit</option>
              </select>
            </div>
            <div className="mainInput">
              <input
                type="text"
                value={commandArgs}
                onChange={changeCommandArgs}
                placeholder={commandArgExplanation}
                onKeyDown={(event) => {if(event.keyCode === 13) query();}}
              />
            </div>
            <button onClick={query}>
              Query
            </button>
          </div>
        )}

        <ErrorMessage
          readingStream={readingStream}
          ranQuery={ranQuery}
          queryError={queryError}
          fileReadError={fileReadError}
        />
      </div>
    )
  }
}

export default StartMenu
