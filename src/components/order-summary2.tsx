/* eslint-disable @next/next/no-img-element */
import {
  CheckCircle,
  CreditCard,
  Download,
  MapPin,
  Package,
  Printer,
  Truck,
} from "lucide-react";

import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface OrderItem {
  id: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
  details?: { label: string; value: string }[];
}

interface ShippingAddress {
  name: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

interface PaymentMethod {
  type: "card" | "paypal" | "bank";
  lastFour?: string;
  cardBrand?: string;
  email?: string;
}

interface OrderSummaryData {
  orderNumber: string;
  orderDate: string;
  status: "confirmed" | "processing" | "shipped" | "delivered";
  email: string;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  discount?: number;
  total: number;
  shippingAddress: ShippingAddress;
  shippingMethod: string;
  estimatedDelivery: string;
  paymentMethod: PaymentMethod;
}

const DEFAULT_ORDER: OrderSummaryData = {
  orderNumber: "ORD-2024-78432",
  orderDate: "December 14, 2024",
  status: "confirmed",
  email: "customer@souqna.qa",
  items: [
    {
      id: "1",
      name: "Minimalist Beige Sneakers",
      image:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Minimalist-Beige-Sneakers-2.png",
      price: 120.0,
      quantity: 1,
      details: [
        { label: "Size", value: "42" },
        { label: "Color", value: "Beige" },
      ],
    },
    {
      id: "2",
      name: "Embroidered Blue Top",
      image:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/clothes/Woman-in-Embroidered-Blue-Top-2.png",
      price: 140.0,
      quantity: 2,
      details: [
        { label: "Size", value: "M" },
        { label: "Color", value: "Blue" },
      ],
    },
    {
      id: "3",
      name: "Classic Fedora Hat",
      image:
        "https://deifkwefumgah.cloudfront.net/shadcnblocks/block/ecommerce/accessories/Classic-Fedora-Hat-2.png",
      price: 84.0,
      quantity: 1,
      details: [{ label: "Size", value: "One Size" }],
    },
  ],
  subtotal: 484.0,
  shipping: 12.0,
  tax: 38.72,
  discount: 50.0,
  total: 484.72,
  shippingAddress: {
    name: "Alex Johnson",
    street: "1234 Maple Street, Apt 5B",
    city: "San Francisco",
    state: "CA",
    zipCode: "94102",
    country: "United States",
  },
  shippingMethod: "Express Shipping",
  estimatedDelivery: "December 18-20, 2024",
  paymentMethod: {
    type: "card",
    lastFour: "4242",
    cardBrand: "Visa",
  },
};

interface OrderSummary2Props {
  order?: OrderSummaryData;
  className?: string;
}

const OrderSummary2 = ({
  order = DEFAULT_ORDER,
  className,
}: OrderSummary2Props) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price);
  };

  const getStatusBadge = (status: OrderSummaryData["status"]) => {
    const variants: Record<
      OrderSummaryData["status"],
      { label: string; className: string }
    > = {
      confirmed: {
        label: "Order Confirmed",
        className: "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10",
      },
      processing: {
        label: "Processing",
        className: "bg-amber-500/10 text-amber-600 hover:bg-amber-500/10",
      },
      shipped: {
        label: "Shipped",
        className: "bg-blue-500/10 text-blue-600 hover:bg-blue-500/10",
      },
      delivered: {
        label: "Delivered",
        className: "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10",
      },
    };
    return variants[status];
  };

  const statusBadge = getStatusBadge(order.status);

  return (
    <section className={cn("py-16 md:py-24", className)}>
      <div className="container max-w-xl">
        {/* Success Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-emerald-500/10">
            <CheckCircle className="size-7 text-emerald-600" />
          </div>
          <h1 className="mb-2 text-2xl font-bold tracking-tight">
            Thank you for your order!
          </h1>
          <p className="text-sm text-muted-foreground">
            Confirmation sent to{" "}
            <span className="font-medium text-foreground">{order.email}</span>
          </p>
        </div>

        {/* Order Info */}
        <Card className="mb-4 shadow-none">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Order</p>
                <p className="font-semibold">{order.orderNumber}</p>
              </div>
              <Badge className={statusBadge.className}>
                {statusBadge.label}
              </Badge>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Placed on {order.orderDate}
            </p>
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card className="mb-4 shadow-none">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Package className="size-4" />
              Items ({order.items.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="space-y-3">
              {order.items.map((item, index) => (
                <div key={item.id}>
                  <div className="flex gap-3">
                    <div className="w-14 shrink-0">
                      <AspectRatio
                        ratio={1}
                        className="overflow-hidden rounded-md bg-muted"
                      >
                        <img
                          src={item.image}
                          alt={item.name}
                          className="size-full object-cover"
                        />
                      </AspectRatio>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm leading-tight font-medium">
                        {item.name}
                      </h3>
                      {item.details && (
                        <p className="text-xs text-muted-foreground">
                          {item.details.map((d, i) => (
                            <span key={d.label}>
                              {d.value}
                              {i < item.details!.length - 1 && " · "}
                            </span>
                          ))}
                        </p>
                      )}
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          Qty: {item.quantity}
                        </span>
                        <span className="text-sm font-medium">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                  {index < order.items.length - 1 && (
                    <Separator className="mt-3" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card className="mb-4 shadow-none">
          <CardContent className="p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipping</span>
                <span>
                  {order.shipping === 0 ? "Free" : formatPrice(order.shipping)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatPrice(order.tax)}</span>
              </div>
              {order.discount && order.discount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Discount</span>
                  <span>-{formatPrice(order.discount)}</span>
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between font-semibold">
                <span>Total</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shipping & Payment */}
        <Card className="mb-4 shadow-none">
          <CardContent className="p-4">
            <div className="space-y-4">
              {/* Shipping */}
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <MapPin className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Delivery</span>
                </div>
                <div className="ml-6 text-sm">
                  <p className="font-medium">{order.shippingAddress.name}</p>
                  <p className="text-muted-foreground">
                    {order.shippingAddress.street}
                  </p>
                  <p className="text-muted-foreground">
                    {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
                    {order.shippingAddress.zipCode}
                  </p>
                </div>
                <div className="mt-2 ml-6 flex items-center gap-2 text-sm">
                  <Truck className="size-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    {order.shippingMethod} · Est. {order.estimatedDelivery}
                  </span>
                </div>
              </div>

              <Separator />

              {/* Payment */}
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <CreditCard className="size-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Payment</span>
                </div>
                {order.paymentMethod.type === "card" && (
                  <div className="ml-6 flex items-center gap-2">
                    <img
                      src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/visa-icon.svg"
                      alt="Visa"
                      className="size-6"
                    />
                    <span className="text-sm">
                      {order.paymentMethod.cardBrand} ····{" "}
                      {order.paymentMethod.lastFour}
                    </span>
                  </div>
                )}
                {order.paymentMethod.type === "paypal" && (
                  <div className="ml-6 flex items-center gap-2">
                    <img
                      src="https://deifkwefumgah.cloudfront.net/shadcnblocks/block/logos/paypal-icon.svg"
                      alt="PayPal"
                      className="size-6"
                    />
                    <span className="text-sm">{order.paymentMethod.email}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="space-y-2">
          <Button className="w-full">
            <Package className="mr-2 size-4" />
            Track Order
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline">
              <Download className="mr-2 size-4" />
              Receipt
            </Button>
            <Button variant="outline">
              <Printer className="mr-2 size-4" />
              Print
            </Button>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Questions?{" "}
          <a href="/contact" className="underline underline-offset-2">
            Contact Support
          </a>
        </p>
      </div>
    </section>
  );
};

export { OrderSummary2 };
