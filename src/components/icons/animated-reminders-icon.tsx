
"use client";

import * as React from 'react';
import { useEffect } from 'react';

// Define the type for the custom element
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'animated-icons': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
        src: string;
        trigger: string;
        attributes: string;
        height: string;
        width: string;
      };
    }
  }
}

export function AnimatedRemindersIcon() {
  // This useEffect is to ensure the custom element is only rendered on the client side
  const [isClient, setIsClient] = React.useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    // Render a placeholder or nothing on the server
    return <div style={{ width: '16px', height: '16px' }} />;
  }
  
  return (
    <div style={{ width: '16px', height: '16px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
      <animated-icons
        src="https://animatedicons.co/get-icon?name=alarm&style=minimalistic&token=86e24606-25f0-4663-82ff-3e5f49d4e5f7"
        trigger="hover"
        attributes='{"variationThumbColour":"#536DFE","variationName":"Two Tone","variationNumber":2,"numberOfGroups":2,"backgroundIsGroup":false,"strokeWidth":1,"defaultColours":{"group-1":"#000000","group-2":"#536DFE","background":"#FFFFFF"}}'
        height="16"
        width="16"
      ></animated-icons>
    </div>
  );
}
