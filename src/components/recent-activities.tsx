
"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import type { ActivityItem } from '@/lib/types';
import { UserCheck, Banknote, Home, AlertTriangle } from 'lucide-react';

export function RecentActivities({ activities }: { activities: ActivityItem[] }) {
  const plugin = React.useRef(
    Autoplay({ delay: 5000, stopOnInteraction: true })
  )

  const ICONS: { [key: string]: React.ReactElement } = {
    'new-tenant': <UserCheck className="h-5 w-5" />,
    'rent-paid': <Banknote className="h-5 w-5" />,
    'lease-ending': <Home className="h-5 w-5" />,
    'income-drop': <AlertTriangle className="h-5 w-5 text-destructive" />,
    'vacancy-rate': <AlertTriangle className="h-5 w-5 text-yellow-500" />,
  };

  if (activities.length === 0) {
    return (
        <Card>
            <CardContent className="flex flex-col items-center justify-center p-6 text-center h-40">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
                    <AlertTriangle className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium">No unusual activity to report.</p>
                <p className="text-xs text-muted-foreground">The AI is monitoring your properties.</p>
            </CardContent>
        </Card>
    )
  }

  return (
     <Carousel 
      plugins={[plugin.current]}
      className="w-full"
      onMouseEnter={plugin.current.stop}
      onMouseLeave={plugin.current.reset}
      opts={{loop: true}}
     >
      <CarouselContent>
        {activities.map((activity) => (
          <CarouselItem key={activity.id}>
            <div className="p-1">
              <Card>
                <CardContent className="flex items-center p-4 gap-4 h-40">
                   <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground shrink-0">
                      {ICONS[activity.type]}
                    </div>
                  <div className="text-left">
                    <p className="text-sm font-semibold">{activity.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">{activity.date}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}

    
