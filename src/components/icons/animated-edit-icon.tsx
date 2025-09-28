
"use client";

import * as React from 'react';
import { useEffect } from 'react';

type AnimatedIconsElement = React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
  src: string;
  trigger: string;
  'icon-attributes': string;
  height: string;
  width: string;
};

declare module 'react' {
    namespace JSX {
        interface IntrinsicElements {
            'animated-icons': AnimatedIconsElement;
        }
    }
}


export function AnimatedEditIcon() {
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
        src="https://animatedicons.co/get-icon?name=Edit%20V2&style=minimalistic&token=103ba7b6-a0d9-4d83-87ae-7aceb8cc75aa"
        trigger="hover"
        icon-attributes='{"variationThumbColour":"#536DFE","variationName":"Two Tone","variationNumber":2,"numberOfGroups":2,"backgroundIsGroup":false,"strokeWidth":1,"defaultColours":{"group-1":"#000000","group-2":"#536DFE","background":"#FFFFFF"}}'
        height="16"
        width="16"
      ></animated-icons>
    </div>
  );
}
