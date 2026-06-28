/* eslint-disable @next/next/no-img-element */
import { Price, PriceValue } from "@/components/price";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Product {
  name: string;
  image: {
    src: string;
    alt: string;
  };
  link: string;
  price: ProductPrice;
  collection: string;
}

type ProductCardProps = Product;

interface ProductPrice {
  regular: number;
  sale?: number;
  currency: string;
}

type ProductList = Array<Product>;

const PRODUCTS_LIST: ProductList = [
  {
    collection: "Golden Hour",
    name: "Bloom & Gleam earrings",
    link: "/template-showcase/products",
    image: {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/accessories/Elegant-Floral-Earrings-1.png",
      alt: "",
    },
    price: {
      regular: 4000.0,
      currency: "USD",
    },
  },
  {
    collection: "Golden Hour",
    name: "Sweetheart Spark earrings",
    link: "/template-showcase/products",
    image: {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/accessories/Gold-Heart-Earrings-1.png",
      alt: "",
    },
    price: {
      regular: 8000.0,
      sale: 7599.0,
      currency: "USD",
    },
  },
  {
    collection: "Golden Hour",
    name: "Golden Whisper earrings",
    link: "/template-showcase/products",
    image: {
      src: "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/accessories/Gold-Hoop-Earrings-on-Ceramic-Dish-1.png",
      alt: "",
    },
    price: {
      regular: 6000.0,
      currency: "USD",
    },
  },
];

interface ProductList5Props {
  className?: string;
}

const ProductList5 = ({ className }: ProductList5Props) => {
  return (
    <section className={cn("py-32", className)}>
      <div className="container">
        <div className="mb-12 flex flex-col gap-12 md:flex-row md:justify-between">
          <div className="flex flex-col gap-4">
            <p className="text-center leading-tight font-medium text-primary md:text-left">
              Where elegance meets everyday.
            </p>
            <h1 className="text-center text-4xl font-semibold md:text-left">
              Customer Favorites
            </h1>
          </div>
          <div className="self-end">
            <Button variant="secondary">See the Collection</Button>
          </div>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
          {PRODUCTS_LIST.map((item, index) => (
            <ProductCard key={`product-list-5-card-${index}`} {...item} />
          ))}
        </div>
      </div>
    </section>
  );
};

const ProductCard = ({
  name,
  link,
  image,
  price,
  collection,
}: ProductCardProps) => {
  const { regular, sale, currency } = price;

  return (
    <a href={link} className="block h-full w-full min-w-47.5">
      <Card className="group h-full gap-3.5 rounded-none border-none bg-background p-0 shadow-none">
        <CardHeader className="block p-0">
          <AspectRatio ratio={1} className="w-full overflow-hidden rounded-2xl">
            <img
              src={image.src}
              alt={image.alt}
              className="block size-full object-cover object-center"
            />
          </AspectRatio>
        </CardHeader>
        <CardContent className="flex h-full flex-col gap-2 p-0">
          <p className="text-xs text-muted-foreground uppercase">
            {collection}
          </p>
          <CardTitle className="leading-tight font-medium">{name}</CardTitle>
          <Price onSale={sale != null} className="text-lg font-semibold">
            <PriceValue price={regular} currency={currency} variant="regular" />
            <PriceValue price={sale} currency={currency} variant="sale" />
          </Price>
        </CardContent>
      </Card>
    </a>
  );
};

export { ProductList5 };
