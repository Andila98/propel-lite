
"use client";

import * as React from 'react';
import { useEffect } from 'react';

export function AnimatedDeleteIcon() {
  // This useEffect is to ensure the custom element is only rendered on the client side
  const [isClient, setIsClient] = React.useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }
  
  return (
    <div style={{ width: '16px', height: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginRight: '8px' }}>
      <animated-icons
        src="https://animatedicons.co/get-icon?name=delete&style=minimalistic&token=c1352b7b-2e14-4124-b8fd-a064d7e44225"
        trigger="hover"
        icon-attributes='{"variationThumbColour":"#536DFE","variationName":"Two Tone","variationNumber":2,"numberOfGroups":2,"backgroundIsGroup":false,"strokeWidth":1,"defaultColours":{"group-1":"#000000","group-2":"#536DFE","background":"#FFFFFF"}}'
        height="16"
        width="16"
      ></animated-icons>
    </div>
  );
}
