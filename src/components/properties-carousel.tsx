
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
} from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import type { Property } from '@/lib/types';
import { BedDouble, Bath, Banknote } from 'lucide-react';

export function PropertiesCarousel({ properties }: { properties: Property[] }) {
  const plugin = React.useRef(
    Autoplay({ delay: 4000, stopOnInteraction: true })
  )
  
  const formatCurrency = (amount: number, currencyCode: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Carousel 
      opts={{ loop: true }}
      plugins={[plugin.current]}
      className="w-full"
      onMouseEnter={plugin.current.stop}
      onMouseLeave={plugin.current.reset}
     >
      <CarouselContent>
        {properties.map((property) => (
          <CarouselItem key={property.id}>
              <Card className="overflow-hidden group">
                <Link href={`/properties/${property.id}`} className="block">
                  <div className="relative h-64 w-full">
                    <Image
                      src={property.imageUrl}
                      alt={property.address}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                      data-ai-hint="apartment building"
                    />
                     <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  </div>
                  <CardHeader className="absolute bottom-0 text-white">
                    <CardTitle className="text-xl">{property.address}</CardTitle>
                    <CardDescription className="text-primary-foreground/80 capitalize">{property.propertyType}</CardDescription>
                  </CardHeader>
                </Link>
                <CardFooter className="bg-muted/50 p-4 flex justify-between text-sm">
                   <div className="flex items-center gap-2">
                        <BedDouble className="h-4 w-4 text-muted-foreground" />
                        <span>{property.bedrooms} Beds</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Bath className="h-4 w-4 text-muted-foreground" />
                        <span>{property.bathrooms} Baths</span>
                    </div>
                    <div className="flex items-center gap-2">
                         <Banknote className="h-4 w-4 text-muted-foreground" />
                         <span>{formatCurrency(property.rent, property.currency)}/mo</span>
                    </div>
                </CardFooter>
              </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}

    