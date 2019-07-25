import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCircle } from '@fortawesome/free-solid-svg-icons'

export const IconCircles = ({
  icon,
  outlineClass,
  dataTipText,
  floatRight,
}) => (
  <span className={`fa-layers fa-fw ${floatRight ? 'floatRight' : ''}`}>
    <FontAwesomeIcon icon={faCircle} className="iconCircleBackground" />
    <FontAwesomeIcon
      data-tip={dataTipText}
      icon={icon}
      className={outlineClass}
    />
  </span>
)
