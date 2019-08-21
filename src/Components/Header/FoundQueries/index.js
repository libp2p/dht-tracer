import React, { Component } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCheckCircle, faDownload, faCamera } from '@fortawesome/free-solid-svg-icons'

class FoundQueries extends Component {
  render() {
    const {
      data,
      queryId,
      saveLog,
      saveScreenshot,
      changeQueryFilter,
    } = this.props

    return (
      <div className="foundQueriesWrapper">
        {data && queryId &&
          <table className="uk-table uk-table-divider">
            <caption style={{ fontWeight: 'bold' }}>Queries Found</caption>
            <tbody style={{ maxHeight: '150px', overflow: 'auto', display: 'block' }}>
              {Object.keys(data.queries).map((key) => (
                <tr
                  className={`queryId ${queryId === key && 'selected'}`}
                  key={key}
                >
                  <td className="foundQueryIcon">
                  {key === queryId && (
                    <FontAwesomeIcon
                      icon={faCheckCircle}
                      style={{ color: '#7DC24B' }}
                      data-tip="currently selected query"
                    />
                  )}
                  </td>
                  <td className="foundQueryIcon">
                    {key === queryId && (
                      <FontAwesomeIcon
                        icon={faDownload}
                        style={{ color: '#7DC24B' }}
                        data-tip="save as text file"
                        onClick={(e) => {e.stopPropagation(); saveLog(key)}}
                      />
                    )}
                  </td>
                  <td className="foundQueryIcon">
                    {key === queryId && (
                      <FontAwesomeIcon
                        icon={faCamera}
                        style={{ color: '#7DC24B' }}
                        data-tip="save as png"
                        onClick={(e) => {e.stopPropagation(); saveScreenshot(key)}}
                      />
                    )}
                  </td>
                  <td 
                    className="skinny"
                    data-tip={key}
                    onClick={() => changeQueryFilter(key)}
                    style={{ cursor: 'pointer', maxWidth: '250px' }}
                  >
                    <div className="foundQueryKey">{key}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        }
      </div>
    )
  }
}

export default FoundQueries
