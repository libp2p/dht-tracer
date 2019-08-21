// https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/digest#Converting_a_digest_to_a_hex_string

export const digestMessage = async (message) => {
  const msgUint8 = new TextEncoder().encode(message);                           // encode as (utf-8) Uint8Array
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);           // hash the message
  const hashArray = Array.from(new Uint8Array(hashBuffer));                     // convert buffer to byte array
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // convert bytes to hex string

  return hashHex;
}

export const calculatePosByDates = (min, max, start, end, windowWidth) => {
  const scale = windowWidth / (max - min)
  const a = Math.floor((start - min) * scale)
  const b = Math.ceil((max - end) * scale)
  let c = Math.ceil((end - start) * scale)
  // test this so we can see when events with no duration happened
  if (c < 1) {
    c = 1
  }

  return {
    startPos: a,
    endPos: b,
    width: c,
  }
}

export const actionBarStyle = (action, data, windowWidth) => {
  const { startPos, endPos, width } = calculatePosByDates(
    new Date(data.start),
    new Date(data.end),
    new Date(action.start),
    new Date(action.end),
    new Date(windowWidth),
  )
  let barStyle = {
    marginLeft: startPos || 0,
    marginRight: endPos || 0,
    width: width || 0,
  }

  return barStyle
}

export const afterBarStyle = (smallestRightMargin, windowWidth, barsWidth) => {
  return {
    marginLeft: barsWidth - (smallestRightMargin || 0),
  }
}
