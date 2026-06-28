"use client";
/* eslint-disable @next/next/no-img-element */

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Carousel,
  type CarouselApi,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type ReviewType = {
  author: {
    image?: string;
    name: string;
    verifiedBuyer?: boolean;
  };
  comment: string;
  image?: string;
  product: {
    name: string;
    image: string;
    link: string;
  };
};

type ReviewCardType = ReviewType;

interface Reviews23Props {
  reviews: ReviewType[];
  className?: string;
}

const REVIEWS: ReviewType[] = [
  {
    author: {
      image:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-1.webp",
      name: "Jenny W.",
      verifiedBuyer: true,
    },
    comment:
      "The blush blends beautifully and gives such a natural glow. It's lightweight, buildable, and lasts all day without fading. I'm honestly impressed!",
    image:
      "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/promotional/Close-Up-of-Womans-Face-1.png",
    product: {
      name: "Silky Glow Blush",
      image:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/skin-care-product/Makeup-Product-Flat-Lay-1.png",
      link: "/products",
    },
  },
  {
    author: {
      image:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-3.webp",
      name: "Jenny W.",
      verifiedBuyer: true,
    },
    comment:
      "The shade is gorgeous and the creamy texture makes it super easy to apply. It hydrates the lips while giving a rich bronze shine. Definitely a staple now.",
    image:
      "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/skin-care-product/Close-Up-of-Lips-1.png",
    product: {
      name: "Shimmer Bronze Lipstick",
      image:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/skin-care-product/Shimmering-Bronze-Lipstick-Close-Up-1.png",
      link: "/products",
    },
  },
  {
    author: {
      image:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-4.webp",
      name: "Jenny W.",
      verifiedBuyer: true,
    },
    comment:
      "This anti-aging serum absorbs quickly and leaves my skin feeling firmer and smoother. After a few weeks, my fine lines look noticeably softer. Love it!",
    image:
      "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/skin-care-product/Skincare-Routine-Close-Up-1.png",
    product: {
      name: "Renewal Anti-Aging Serum",
      image:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/skin-care-product/Frosted-Glass-Dropper-1.png",
      link: "/products",
    },
  },
  {
    author: {
      image:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-5.webp",
      name: "Jenny W.",
      verifiedBuyer: true,
    },
    comment:
      "A deeply hydrating cream that feels rich without being heavy. My skin stays soft, moisturized, and glowing all day. Perfect for dry or sensitive skin.",
    image:
      "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/skin-care-product/Woman-Applying-Face-Cream-1.png",
    product: {
      name: "Ultra Hydrating Face Cream",
      image:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/skin-care-product/pexels-carlos-diaz-216017-18350286-1.jpg",
      link: "/products",
    },
  },
  {
    author: {
      image:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-2.webp",
      name: "Jenny W.",
      verifiedBuyer: true,
    },
    comment:
      "Such a luxurious body cream! It melts into the skin and leaves it silky, nourished, and lightly scented. Amazing for daily use-highly recommend.",
    image:
      "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/promotional/Skincare-Routine-1.png",
    product: {
      name: "Nourishing Body Cream",
      image:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/skin-care-product/Elegant-Hand-Holding-Skincare-Product-1.png",
      link: "/products",
    },
  },
];

const Reviews23 = ({ reviews = REVIEWS, className }: Reviews23Props) => {
  const [api, setApi] = useState<CarouselApi>();

  return (
    <section className={cn("overflow-hidden py-32", className)}>
      <div className="container space-y-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-serif text-4xl">Clients Love Us</h2>
          <div className="flex gap-3">
            <Button
              onClick={() => api?.scrollPrev()}
              variant="outline"
              className="rounded-full"
              size="icon-lg"
            >
              <ChevronLeft />
            </Button>
            <Button
              onClick={() => api?.scrollNext()}
              variant="outline"
              className="rounded-full"
              size="icon-lg"
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
        <div>
          <Carousel setApi={setApi} className="[&>div]:overflow-visible">
            <CarouselContent>
              {reviews.map((review) => (
                <CarouselItem
                  className="sm:basis-9/12 md:basis-150 lg:basis-1/2 xl:basis-1/3"
                  key={crypto.randomUUID()}
                >
                  <ReviewCard {...review} />
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
      </div>
    </section>
  );
};

const ReviewCard = ({ image, product, author, comment }: ReviewCardType) => {
  return (
    <Card className="h-full rounded-lg px-4 py-5">
      <CardContent className="flex h-full flex-col justify-between p-0">
        <div className="flex gap-3 max-md:flex-col-reverse">
          <div className="flex-1 space-y-4">
            <div className="flex gap-3">
              <Avatar className="size-12.5 border">
                <AvatarImage src={author.image} alt={author.name} />
                <AvatarFallback>{author.name}</AvatarFallback>
              </Avatar>
              <div className="space-y-0.5">
                <h3 className="font-serif text-base leading-normal">
                  {author.name}
                </h3>
                {author.verifiedBuyer && (
                  <span className="text-xs text-muted-foreground">
                    Verified Buyer
                  </span>
                )}
              </div>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {comment}
            </p>
          </div>
          <div className="basis-40">
            <AspectRatio ratio={0.8} className="overflow-hidden rounded-lg">
              <img
                src={image}
                alt={product.name}
                className="block size-full object-cover object-center"
              />
            </AspectRatio>
          </div>
        </div>
        <div className="mt-auto space-y-3 pt-3">
          <Separator />
          <a href={product.link} className="group flex items-center gap-3">
            <div className="size-10 shrink-0 overflow-hidden rounded-sm">
              <img
                src={product.image}
                alt={product.name}
                className="block size-full object-cover object-center"
              />
            </div>
            <span className="text-sm font-medium underline-offset-2 group-hover:underline">
              {product.name}
            </span>
          </a>
        </div>
      </CardContent>
    </Card>
  );
};

export { Reviews23 };
