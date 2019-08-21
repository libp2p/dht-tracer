import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faExclamationCircle,
  faQuestionCircle,
} from '@fortawesome/free-solid-svg-icons'

export const Message = ({ children, warning }) => (
  <div className="errorMessage">
    <div>
      {!warning && (
        <FontAwesomeIcon icon={faExclamationCircle} className="errorIcon" />
      )}
      {warning && (
        <FontAwesomeIcon icon={faQuestionCircle} className="warningIcon" />
      )}
    </div>
    {children}
  </div>
)
