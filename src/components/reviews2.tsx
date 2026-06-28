import { BadgeCheck } from "lucide-react";

import { Rating } from "@/components/rating";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface Review {
  id: string;
  rating: number;
  title: string;
  content: string;
  author: {
    name: string;
    avatar?: string;
  };
  date: string;
  verified?: boolean;
}

const DEFAULT_REVIEWS: Review[] = [
  {
    id: "1",
    rating: 5,
    title: "Exceeded my expectations",
    content:
      "I was a bit skeptical at first, but this product really delivered. The quality is outstanding and it arrived faster than expected. Would definitely recommend to anyone on the fence.",
    author: {
      name: "Sarah M.",
      avatar:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-1.webp",
    },
    date: "Dec 10, 2024",
    verified: true,
  },
  {
    id: "2",
    rating: 4,
    title: "Great value for money",
    content:
      "Solid product overall. Does exactly what it's supposed to do. Took off one star because the packaging could be better, but the product itself is great.",
    author: {
      name: "James R.",
      avatar:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-2.webp",
    },
    date: "Dec 8, 2024",
    verified: true,
  },
  {
    id: "3",
    rating: 5,
    title: "Perfect for everyday use",
    content:
      "I've been using this daily for a month now and it still looks and works like new. The build quality is impressive at this price point. Already bought one for my sister.",
    author: {
      name: "Emily K.",
      avatar:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-3.webp",
    },
    date: "Dec 5, 2024",
    verified: true,
  },
  {
    id: "4",
    rating: 4,
    title: "Good but not perfect",
    content:
      "The product is nice and works well. My only minor complaint is that the color is slightly different from the photos, but it's still a great purchase overall.",
    author: {
      name: "Michael T.",
    },
    date: "Dec 2, 2024",
    verified: false,
  },
  {
    id: "5",
    rating: 5,
    title: "Best purchase I've made this year",
    content:
      "Absolutely love it! The attention to detail is remarkable. Customer service was also very helpful when I had questions. Five stars all around.",
    author: {
      name: "Lisa P.",
      avatar:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/avatar-5.webp",
    },
    date: "Nov 28, 2024",
    verified: true,
  },
  {
    id: "6",
    rating: 3,
    title: "Decent but expected more",
    content:
      "It's okay for the price. Nothing special but gets the job done. Shipping was quick which was nice.",
    author: {
      name: "David W.",
    },
    date: "Nov 25, 2024",
    verified: true,
  },
];

interface Reviews2Props {
  reviews?: Review[];
  title?: string;
  className?: string;
}

const Reviews2 = ({
  reviews = DEFAULT_REVIEWS,
  title = "Customer Reviews",
  className,
}: Reviews2Props) => {
  const totalReviews = reviews.length;
  const averageRating =
    reviews.reduce((sum, review) => sum + review.rating, 0) / totalReviews;

  // Calculate rating distribution
  const ratingCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
    percentage:
      (reviews.filter((r) => r.rating === star).length / totalReviews) * 100,
  }));

  return (
    <section className={cn("py-16 md:py-24", className)}>
      <div className="container max-w-5xl">
        <h2 className="mb-8 text-2xl font-semibold tracking-tight md:text-3xl">
          {title}
        </h2>

        <div className="grid gap-8 lg:grid-cols-[280px_1fr] lg:gap-12">
          {/* Summary Sidebar */}
          <div className="space-y-6">
            {/* Average Rating */}
            <div className="text-center lg:text-left">
              <div className="text-5xl font-bold">
                {averageRating.toFixed(1)}
              </div>
              <Rating
                rate={averageRating}
                className="mt-2 justify-center lg:justify-start [&_svg]:size-5"
              />
              <p className="mt-1 text-sm text-muted-foreground">
                Based on {totalReviews} reviews
              </p>
            </div>

            {/* Rating Bars */}
            <div className="space-y-2">
              {ratingCounts.map(({ star, count, percentage }) => (
                <div key={star} className="flex items-center gap-3">
                  <span className="w-8 text-sm text-muted-foreground">
                    {star} ★
                  </span>
                  <Progress value={percentage} className="h-2 flex-1" />
                  <span className="w-8 text-right text-sm text-muted-foreground">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Reviews Grid */}
          <div className="grid gap-4 sm:grid-cols-2">
            {reviews.map((review) => (
              <Card key={review.id} className="gap-0 p-0 shadow-none">
                <CardContent className="p-5">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="size-9">
                          <AvatarImage
                            src={review.author.avatar}
                            alt={review.author.name}
                          />
                          <AvatarFallback className="text-xs">
                            {review.author.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium">
                              {review.author.name}
                            </span>
                            {review.verified && (
                              <BadgeCheck className="size-4 text-emerald-600" />
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {review.date}
                          </p>
                        </div>
                      </div>
                      <Rating
                        rate={review.rating}
                        className="[&_svg]:size-3.5 [&>div]:size-3.5"
                      />
                    </div>

                    {/* Content */}
                    <div>
                      <h3 className="font-medium">{review.title}</h3>
                      <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                        {review.content}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export { Reviews2 };
