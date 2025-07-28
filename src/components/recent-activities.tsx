
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
import { UserCheck, Banknote, Home } from 'lucide-react';

export function RecentActivities({ activities }: { activities: ActivityItem[] }) {
  const plugin = React.useRef(
    Autoplay({ delay: 3000, stopOnInteraction: true })
  )

  const ICONS: { [key: string]: React.ReactElement } = {
    'new-tenant': <UserCheck className="h-4 w-4" />,
    'rent-paid': <Banknote className="h-4 w-4" />,
    'lease-ending': <Home className="h-4 w-4" />,
  };
  return (
     <Carousel 
      plugins={[plugin.current]}
      className="w-full"
      onMouseEnter={plugin.current.stop}
      onMouseLeave={plugin.current.reset}
     >
      <CarouselContent>
        {activities.map((activity) => (
          <CarouselItem key={activity.id}>
            <div className="p-1">
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-6 gap-4">
                   <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      {ICONS[activity.type]}
                    </div>
                  <div className="text-center">
                    <p className="text-sm">{activity.description}</p>
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
