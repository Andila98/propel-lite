

"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
  CardContent,
} from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import type { Property } from '@/lib/types';
import { BedDouble, Bath, Banknote } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export function PropertiesCarousel({ properties }: { properties: Property[] }) {
  const plugin = React.useRef(
    Autoplay({ delay: 4000, stopOnInteraction: true })
  )
  
  if (!properties || properties.length === 0) {
    return (
      <Card className="flex items-center justify-center h-80">
        <CardContent>
          <p className="text-muted-foreground">No properties to display.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Carousel 
      opts={{ loop: true }}
      plugins={[plugin.current]}
      className="w-full"
      onMouseEnter={plugin.current.stop}
      onMouseLeave={plugin.current.reset}
     >
      <CarouselContent>
        {properties.map((property) => {
           const rent = property.units?.[0]?.rent || 0;
           const bedrooms = property.units?.reduce((acc, unit) => acc + (parseInt(unit.size) || 0), 0);
           const bathrooms = property.units?.length || 0; // Simplified
           return (
          <CarouselItem key={property.id}>
              <Card className="overflow-hidden group">
                <Link href={`/properties/${property.id}`} className="block">
                  <div className="relative h-64 w-full">
                    <Image
                      src={property.imageUrl || `https://picsum.photos/seed/${property.id}/800/500`}
                      alt={property.address}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                      data-ai-hint="apartment building"
                    />
                     <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  </div>
                  <CardHeader className="absolute bottom-0 text-white">
                    <CardTitle className="text-xl">{property.name || property.address}</CardTitle>
                    <CardDescription className="text-primary-foreground/80 capitalize">{property.type}</CardDescription>
                  </CardHeader>
                </Link>
                <CardFooter className="bg-muted/50 p-4 flex justify-between text-sm">
                   <div className="flex items-center gap-2">
                        <BedDouble className="h-4 w-4 text-muted-foreground" />
                        <span>{bedrooms} Beds</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Bath className="h-4 w-4 text-muted-foreground" />
                        <span>{bathrooms} Baths</span>
                    </div>
                    <div className="flex items-center gap-2">
                         <Banknote className="h-4 w-4 text-muted-foreground" />
                         <span>{formatCurrency(rent, property.currency)}/mo</span>
                    </div>
                </CardFooter>
              </Card>
          </CarouselItem>
           )
        })}
      </CarouselContent>
    </Carousel>
  );
}
