"use client";

/* eslint-disable @next/next/no-img-element */

import {
  Bell,
  Bookmark,
  Bug,
  ChevronDown,
  CreditCard,
  FileQuestion,
  Heart,
  HeartHandshake,
  HelpCircle,
  History,
  LayoutGrid,
  LifeBuoy,
  LogOut,
  type LucideIcon,
  Menu,
  MessageCircleHeart,
  Search,
  Settings,
  ShoppingCart,
  Star,
  ThumbsUp,
  User,
} from "lucide-react";
import {
  type CSSProperties,
  Fragment,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Logo,
  LogoImage,
  LogoTextDesktop,
} from "@/components/logo";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type HomeLink = {
  href: string;
  logo: {
    src: string;
    alt: string;
  };
};

type Link = {
  label: string;
  href: string;
};

interface SideMenuItem extends Link {
  icon: LucideIcon;
}

type HelpfullLinkGroup = {
  group: string;
  links: Link[];
};

type SideMenuType = Array<SideMenuItem[]>;

type MegaMenuSectionType = {
  label: string;
  href: string;
  id: string;
  items: {
    label: string;
    href: string;
  }[];
};

type MenuItemType = {
  label: string;
  href?: string;
  id?: string;
  sections?: MegaMenuSectionType[];
};

type MenuType = MenuItemType[];

interface HelpfullLinksDropdownProps {
  groups?: HelpfullLinkGroup[];
}

interface SecondaryMenuProps {
  menu: MenuType;
}

interface SecondaryMenuMobileProps {
  menu: MenuType;
}

type DesktopMenuDropdownItemProps = MenuItemType;

interface MobileMenuProps {
  menu: SideMenuType;
  homeLink: HomeLink;
}

interface EcommerceNavbar2Props {
  home: HomeLink;
  helpfullLinks?: HelpfullLinkGroup[];
  menu: MenuType;
  sideMenu: SideMenuType;
  className?: string;
}

const storefrontCollectionHref = (label: string) =>
  `/template-showcase/products?category=${encodeURIComponent(
    label
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, ""),
  )}`;

const storefrontNavHref = (label: string) => {
  const routes: Record<string, string> = {
    "About Us": "/about",
    Accessibility: "/accessibility",
    Account: "/account",
    "Account Settings": "/account/settings",
    Blog: "/blog",
    Cancellations: "/returns",
    Careers: "/about",
    "Contact Us": "/contact",
    "Customer Support": "/contact",
    FAQs: "/faq",
    Feedback: "/contact",
    "Gift Cards": "/template-showcase/products?tag=gifts",
    Help: "/contact",
    "Help Center": "/contact",
    "Order Tracking": "/orders",
    "Payment Methods": "/account/settings",
    "Privacy Policy": "/privacy",
    "Product Manuals": "/template-showcase/products",
    Promotions: "/template-showcase/products?tag=featured",
    "Promotions & Deals": "/template-showcase/products?tag=featured",
    "Purchase History": "/orders",
    "Recently Viewed": "/template-showcase/products",
    "Report a Bug": "/contact",
    "Returns & Refunds": "/returns",
    Sale: "/template-showcase/products?tag=sale",
    "Saved Items": "/template-showcase/products",
    "Shipping Information": "/shipping",
    "Sign Out": "/account",
    "Skin Quiz": "/template-showcase/products",
    "Store Locator": "/contact",
    "Student Discounts": "/template-showcase/products?tag=featured",
    "Support Tickets": "/contact",
    "Terms & Conditions": "/terms",
    "Warranty & Repairs": "/returns",
    Wishlist: "/template-showcase/products",
  };

  return routes[label] ?? storefrontCollectionHref(label);
};

const HOME = {
  href: "/",
  logo: {
    src: "/favicon.svg",
    alt: "Souqna",
  },
};

const HELPFUL_LINKS = [
  {
    group: "Support",
    links: [
      { label: "Customer Support", href: storefrontNavHref("Customer Support") },
      { label: "Contact Us", href: storefrontNavHref("Contact Us") },
      { label: "FAQs", href: storefrontNavHref("FAQs") },
      { label: "Product Manuals", href: storefrontNavHref("Product Manuals") },
      { label: "Warranty & Repairs", href: storefrontNavHref("Warranty & Repairs") },
    ],
  },
  {
    group: "Orders & Shipping",
    links: [
      { label: "Order Tracking", href: storefrontNavHref("Order Tracking") },
      { label: "Shipping Information", href: storefrontNavHref("Shipping Information") },
      { label: "Returns & Refunds", href: storefrontNavHref("Returns & Refunds") },
      { label: "Cancellations", href: storefrontNavHref("Cancellations") },
    ],
  },
  {
    group: "Shopping Tools",
    links: [
      { label: "Store Locator", href: storefrontNavHref("Store Locator") },
      { label: "Gift Cards", href: storefrontNavHref("Gift Cards") },
      { label: "Student Discounts", href: storefrontNavHref("Student Discounts") },
      { label: "Promotions & Deals", href: storefrontNavHref("Promotions & Deals") },
    ],
  },
  {
    group: "Company & Legal",
    links: [
      { label: "About Us", href: storefrontNavHref("About Us") },
      { label: "Careers", href: storefrontNavHref("Careers") },
      { label: "Privacy Policy", href: storefrontNavHref("Privacy Policy") },
      { label: "Terms & Conditions", href: storefrontNavHref("Terms & Conditions") },
      { label: "Accessibility", href: storefrontNavHref("Accessibility") },
    ],
  },
];

const MENU = [
  {
    id: "shop",
    label: "Shop",
    href: storefrontNavHref("Shop"),
    sections: [
      {
        label: "Face",
        id: "face",
        href: storefrontNavHref("Face"),
        items: [
          "Cleansers",
          "Oil Cleansers",
          "Foam Cleansers",
          "Toners",
          "Essences",
          "Serums",
          "Moisturizers",
          "Eye Creams",
          "Face Oils",
          "Face Masks",
          "Exfoliators",
          "Spot Treatments",
        ].map((label) => ({ label, href: storefrontCollectionHref(label) })),
      },
      {
        label: "Body",
        id: "body",
        href: storefrontNavHref("Body"),
        items: [
          "Body Wash",
          "Body Scrubs",
          "Body Lotions",
          "Body Creams",
          "Body Oils",
          "Hand Creams",
          "Foot Care",
          "Firming Treatments",
          "Bath Essentials",
          "After Sun Care",
        ].map((label) => ({ label, href: storefrontCollectionHref(label) })),
      },
      {
        label: "Sun Protection",
        id: "sun",
        href: storefrontNavHref("Sun Protection"),
        items: [
          "Daily SPF",
          "Mineral Sunscreen",
          "Chemical Sunscreen",
          "Tinted SPF",
          "SPF Sticks",
          "Face Sunscreen",
          "Body Sunscreen",
          "Lip SPF",
          "After Sun",
          "Sun Sprays",
        ].map((label) => ({ label, href: storefrontCollectionHref(label) })),
      },
      {
        label: "Cleansing",
        id: "cleansing",
        href: storefrontNavHref("Cleansing"),
        items: [
          "Micellar Water",
          "Gel Cleansers",
          "Cream Cleansers",
          "Balms",
          "Cleansing Oils",
          "Makeup Removers",
          "Exfoliating Cleansers",
          "Sensitive Skin Cleansers",
          "Travel Sizes",
          "Refill Packs",
        ].map((label) => ({ label, href: storefrontCollectionHref(label) })),
      },
      {
        label: "Treatments",
        id: "treatments",
        href: storefrontNavHref("Treatments"),
        items: [
          "Acne Treatments",
          "Brightening Treatments",
          "Anti-Aging Treatments",
          "Hydration Boosters",
          "Peels",
          "Overnight Masks",
          "Ampoules",
          "Corrective Serums",
          "Calming Treatments",
          "Repair Treatments",
        ].map((label) => ({ label, href: storefrontCollectionHref(label) })),
      },
      {
        label: "Tools & Devices",
        id: "tools",
        href: storefrontNavHref("Tools & Devices"),
        items: [
          "Facial Rollers",
          "Gua Sha",
          "LED Masks",
          "Cleansing Brushes",
          "Facial Massagers",
          "Ice Rollers",
          "Pore Tools",
          "Microcurrent Devices",
          "Refill Heads",
          "Travel Tools",
        ].map((label) => ({ label, href: storefrontCollectionHref(label) })),
      },
      {
        label: "Masks",
        id: "masks",
        href: storefrontNavHref("Masks"),
        items: [
          "Sheet Masks",
          "Clay Masks",
          "Sleeping Masks",
          "Peel-Off Masks",
          "Hydrating Masks",
          "Purifying Masks",
          "Soothing Masks",
          "Brightening Masks",
          "Exfoliating Masks",
          "Multi-Masking Sets",
        ].map((label) => ({ label, href: storefrontCollectionHref(label) })),
      },
      {
        label: "Eye & Lip Care",
        id: "eye-lip",
        href: storefrontNavHref("Eye & Lip Care"),
        items: [
          "Eye Creams",
          "Eye Serums",
          "Eye Masks",
          "Lip Balms",
          "Lip Masks",
          "Lip Scrubs",
          "Anti-Puff Treatments",
          "Dark Circle Care",
          "SPF Lip Care",
          "Overnight Lip Care",
        ].map((label) => ({ label, href: storefrontCollectionHref(label) })),
      },
      {
        label: "Hair & Scalp",
        id: "hair",
        href: storefrontNavHref("Hair & Scalp"),
        items: [
          "Scalp Treatments",
          "Scalp Scrubs",
          "Hair Serums",
          "Hair Oils",
          "Hair Masks",
          "Hair Sunscreen",
          "Anti-Dandruff Care",
          "Growth Treatments",
          "Leave-In Care",
          "Hair Tools",
        ].map((label) => ({ label, href: storefrontCollectionHref(label) })),
      },
      {
        label: "Bath & Wellness",
        id: "wellness",
        href: storefrontNavHref("Bath & Wellness"),
        items: [
          "Bath Oils",
          "Bath Salts",
          "Soaks",
          "Aromatherapy",
          "Body Relaxers",
          "Stress Relief",
          "Sleep Care",
          "Massage Oils",
          "Self-Care Sets",
          "Wellness Gifts",
        ].map((label) => ({ label, href: storefrontCollectionHref(label) })),
      },
      {
        label: "Men's Care",
        id: "men",
        href: storefrontNavHref("Men's Care"),
        items: [
          "Face Wash",
          "Moisturizers",
          "After Shave",
          "Beard Care",
          "Eye Creams",
          "Anti-Aging",
          "Oil Control",
          "Body Care",
          "Travel Kits",
          "Grooming Sets",
        ].map((label) => ({ label, href: storefrontCollectionHref(label) })),
      },
      {
        label: "Teen Skincare",
        id: "teen",
        href: storefrontNavHref("Teen Skincare"),
        items: [
          "Gentle Cleansers",
          "Acne Care",
          "Oil Control",
          "Soothing Moisturizers",
          "Spot Treatments",
          "SPF",
          "Starter Kits",
          "Sensitive Skin",
          "Travel Sizes",
          "Daily Essentials",
        ].map((label) => ({ label, href: storefrontCollectionHref(label) })),
      },
      {
        label: "Travel Sizes",
        id: "travel",
        href: storefrontNavHref("Travel Sizes"),
        items: [
          "Mini Cleansers",
          "Mini Serums",
          "Mini Moisturizers",
          "Mini Masks",
          "Travel Kits",
          "Refillables",
          "Carry-On Approved",
          "Sample Sets",
          "Weekend Kits",
          "On-the-Go Care",
        ].map((label) => ({ label, href: storefrontCollectionHref(label) })),
      },
      {
        label: "Gifts & Sets",
        id: "gifts",
        href: storefrontNavHref("Gifts & Sets"),
        items: [
          "Gift Sets",
          "Starter Kits",
          "Routine Bundles",
          "Best Sellers",
          "Holiday Sets",
          "Limited Editions",
          "Mini Sets",
          "Luxury Gifts",
          "Under $50",
          "Under $100",
        ].map((label) => ({ label, href: storefrontCollectionHref(label) })),
      },
    ],
  },

  {
    id: "collections",
    label: "Collections",
    href: storefrontNavHref("Collections"),
    sections: [
      {
        label: "By Concern",
        id: "concerns",
        href: storefrontNavHref("By Concern"),
        items: [
          "Acne",
          "Dryness",
          "Sensitivity",
          "Fine Lines",
          "Wrinkles",
          "Dark Spots",
          "Redness",
          "Dullness",
          "Uneven Texture",
          "Large Pores",
        ].map((label) => ({ label, href: storefrontCollectionHref(label) })),
      },
      {
        label: "By Skin Type",
        id: "skin-type",
        href: storefrontNavHref("By Skin Type"),
        items: [
          "Normal",
          "Dry",
          "Oily",
          "Combination",
          "Sensitive",
          "Mature",
          "Acne-Prone",
          "Dehydrated",
          "Reactive",
          "All Skin Types",
        ].map((label) => ({ label, href: storefrontCollectionHref(label) })),
      },
      {
        label: "By Ingredient",
        id: "ingredients",
        href: storefrontNavHref("By Ingredient"),
        items: [
          "Hyaluronic Acid",
          "Vitamin C",
          "Retinol",
          "Niacinamide",
          "Ceramides",
          "Peptides",
          "Salicylic Acid",
          "AHA & BHA",
          "Bakuchiol",
          "Centella Asiatica",
        ].map((label) => ({ label, href: storefrontCollectionHref(label) })),
      },
      {
        label: "By Routine",
        id: "routine",
        href: storefrontNavHref("By Routine"),
        items: [
          "Morning Routine",
          "Night Routine",
          "Minimal Routine",
          "Advanced Routine",
          "Weekly Treatments",
          "Travel Routine",
          "Post-Treatment Care",
          "Seasonal Care",
          "Self-Care Rituals",
          "Professional Inspired",
        ].map((label) => ({ label, href: storefrontCollectionHref(label) })),
      },
      {
        label: "Clean & Conscious",
        id: "clean",
        href: storefrontNavHref("Clean & Conscious"),
        items: [
          "Clean Beauty",
          "Vegan",
          "Cruelty-Free",
          "Fragrance-Free",
          "Dermatologist Tested",
          "Sensitive-Safe",
          "Eco Packaging",
          "Recyclable",
          "Refillable",
          "Sustainable Brands",
        ].map((label) => ({ label, href: storefrontCollectionHref(label) })),
      },
    ],
  },

  { label: "Skin Quiz", href: storefrontNavHref("Skin Quiz") },
  { label: "About Us", href: storefrontNavHref("About Us") },
  { label: "Blog", href: storefrontNavHref("Blog") },
  { label: "Sale", href: storefrontNavHref("Sale") },
];

const SIDE_MENU = [
  [
    {
      label: "Account",
      href: storefrontNavHref("Account"),
      icon: User,
    },
    {
      label: "Purchase History",
      href: storefrontNavHref("Purchase History"),
      icon: History,
    },
    {
      label: "Payment Methods",
      href: storefrontNavHref("Payment Methods"),
      icon: CreditCard,
    },
    {
      label: "Account Settings",
      href: storefrontNavHref("Account Settings"),
      icon: Settings,
    },
    {
      label: "Sign Out",
      href: storefrontNavHref("Sign Out"),
      icon: LogOut,
    },
  ],
  [
    {
      label: "Help",
      href: storefrontNavHref("Help"),
      icon: HeartHandshake,
    },
    {
      label: "Help Center",
      href: storefrontNavHref("Help Center"),
      icon: HelpCircle,
    },
    {
      label: "FAQs",
      href: storefrontNavHref("FAQs"),
      icon: FileQuestion,
    },
    {
      label: "Support Tickets",
      href: storefrontNavHref("Support Tickets"),
      icon: LifeBuoy,
    },
  ],
  [
    {
      label: "Wishlist",
      href: storefrontNavHref("Wishlist"),
      icon: Heart,
    },
    {
      label: "Saved Items",
      href: storefrontNavHref("Saved Items"),
      icon: Bookmark,
    },
    {
      label: "Back in Stock Alerts",
      href: storefrontNavHref("Back in Stock Alerts"),
      icon: Bell,
    },
    {
      label: "Recently Viewed",
      href: storefrontNavHref("Recently Viewed"),
      icon: Star,
    },
  ],
  [
    {
      label: "Feedback",
      href: storefrontNavHref("Feedback"),
      icon: MessageCircleHeart,
    },
    {
      label: "Rate Your Experience",
      href: storefrontNavHref("Rate Your Experience"),
      icon: ThumbsUp,
    },
    {
      label: "Report a Bug",
      href: storefrontNavHref("Report a Bug"),
      icon: Bug,
    },
  ],
];

const EcommerceNavbar2 = ({
  home = HOME,
  helpfullLinks = HELPFUL_LINKS,
  menu = MENU,
  sideMenu = SIDE_MENU,
  className,
}: EcommerceNavbar2Props) => {
  useEffect(() => {
    document.documentElement.style.setProperty(
      "--primary-nav-height",
      "5.25rem",
    );
    document.documentElement.style.setProperty(
      "--secondary-nav-height",
      "3.25rem",
    );
  }, []);

  return (
    <header className={cn("fixed inset-x-0 top-0 z-50", className)}>
      <div className="flex h-[var(--primary-nav-height)] items-center gap-3 bg-primary px-6 py-4 text-primary-foreground">
        <Logo url={home.href} className="shrink-0 p-2">
          <LogoImage
            src={home.logo.src}
            alt={home.logo.alt}
            className="size-8"
          />
          <LogoTextDesktop className="font-medium text-primary-foreground">
            Souqna
          </LogoTextDesktop>
        </Logo>
        <div className="ml-auto flex items-center gap-3">
          <div className="hidden lg:contents">
            <HelpfullLinksDropdown groups={helpfullLinks} />
            <Button
              variant="ghost"
              className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <Heart />
              Wishlist
            </Button>
            <Button
              variant="ghost"
              className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <User />
              Account
            </Button>
          </div>
          <SearchForm />
          <div className="relative size-fit">
            <Button
              size="icon"
              variant="ghost"
              className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <ShoppingCart />
            </Button>
            <Badge className="absolute top-0 right-0 translate-x-1/2 -translate-y-1/2 bg-amber-500 text-[0.625rem] font-medium text-foreground">
              0
            </Badge>
          </div>
          <div className="contents lg:hidden">
            <MobileMenu menu={sideMenu} homeLink={home} />
          </div>
        </div>
      </div>
      <div className="h-[var(--secondary-nav-height)]">
        <SecondaryMenu menu={menu} />
      </div>
    </header>
  );
};

const SearchForm = () => {
  return (
    <Button
      size="icon"
      variant="ghost"
      className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
    >
      <Search />
    </Button>
  );
};

const HelpfullLinksDropdown = ({ groups }: HelpfullLinksDropdownProps) => {
  if (!groups) return;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground data-[state=open]:bg-primary-foreground/10 data-[state=open]:text-primary-foreground"
        >
          <HeartHandshake className="size-4" />
          Help & Support
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-56 !border-primary-foreground/20 !bg-primary !text-primary-foreground"
        align="start"
      >
        {groups.map(({ group, links }, index) => (
          <DropdownMenuSub key={index}>
            <DropdownMenuSubTrigger className="**:!text-primary-foreground focus:bg-primary-foreground/10 focus:!text-primary-foreground data-[state=open]:bg-primary-foreground/10 data-[state=open]:!text-primary-foreground">
              {group}
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="!border-primary-foreground/20 !bg-primary !text-primary-foreground">
                {links.map(({ label, href }, index) => (
                  <DropdownMenuItem
                    asChild
                    key={`${label}-${index}`}
                    className="focus:bg-primary-foreground/10 focus:text-primary-foreground"
                  >
                    <a href={href}>{label}</a>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const MobileMenu = ({ menu, homeLink }: MobileMenuProps) => {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground focus:bg-primary-foreground/10 focus:text-primary-foreground data-[state=open]:bg-primary-foreground/10 data-[state=open]:text-primary-foreground"
        >
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="hide-scrollbar overflow-auto">
        <div className="px-4">
          <SheetHeader>
            <Logo url={homeLink.href} className="max-h-fit shrink-0 basis-11">
              <LogoImage
                src={homeLink.logo.src}
                alt={homeLink.logo.alt}
                className="size-11 shrink-0 invert dark:invert-0"
              />
            </Logo>
          </SheetHeader>
          {menu.map((group, index) => (
            <div key={index} className="py-6 not-last:border-b">
              {group.map(({ href, label, icon: Icon }, index) => (
                <Button
                  asChild
                  variant="ghost"
                  className="w-full justify-start text-left"
                  key={`side-menu-item-${index}`}
                >
                  <a href={href}>
                    <Icon />
                    {label}
                  </a>
                </Button>
              ))}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};

const SecondaryMenu = ({ menu }: SecondaryMenuProps) => {
  const isMobile = useIsMobile();

  return (
    <div className="bg-accent px-6 py-2">
      <div className="hidden lg:contents">
        <NavigationMenu
          className="justify-start [&_a]:bg-transparent [&_a]:hover:bg-accent-foreground/10 [&_button]:bg-transparent [&_button]:hover:bg-accent-foreground/10"
          viewport={isMobile}
        >
          <NavigationMenuList className="gap-3.5">
            {menu.map(({ sections, ...item }, index) => (
              <NavigationMenuItem value={`${index}`} key={index}>
                {sections ? (
                  <DesktopMenuDropdownItem sections={sections} {...item} />
                ) : (
                  <NavigationMenuLink
                    asChild
                    className={cn(
                      navigationMenuTriggerStyle(),
                      "bg-transparent hover:bg-accent-foreground/10",
                    )}
                  >
                    <a href={item.href}>{item.label}</a>
                  </NavigationMenuLink>
                )}
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>
      </div>
      <div className="lg:hidden">
        <SecondaryMenuMobile menu={menu} />
      </div>
    </div>
  );
};

const SecondaryMenuMobile = ({ menu }: SecondaryMenuMobileProps) => {
  if (!menu) return;

  return (
    <Sheet modal={false}>
      <SheetTrigger asChild>
        <Button variant="secondary">
          <LayoutGrid />
          Categories
        </Button>
      </SheetTrigger>
      <SheetContent
        side="top"
        className="!top-[calc(var(--primary-nav-height)+var(--secondary-nav-height))] z-40 !h-[calc(100dvh-var(--primary-nav-height)-var(--secondary-nav-height))] overflow-hidden [&>button]:hidden"
      >
        <div className="min-h-0 flex-1 touch-pan-y overflow-y-auto overscroll-contain pb-10">
          <div className="p-6">
            {menu.map(({ sections, label, href }, index) => (
              <div key={index}>
                <h2 className="border-b py-4 text-lg leading-normal font-bold">
                  {href ? <a href={href}>{label}</a> : <span>{label}</span>}
                </h2>
                {sections && (
                  <Accordion type="multiple">
                    {sections.map(({ id, label, items }) => (
                      <AccordionItem value={id} key={`menu-section-${id}`}>
                        <AccordionTrigger>{label}</AccordionTrigger>
                        <AccordionContent>
                          <div className="flex flex-col">
                            {items.map(({ href, label }, index) => (
                              <Button
                                className="w-full justify-start"
                                asChild
                                variant="ghost"
                                size="sm"
                                key={`menu-item-${index}`}
                              >
                                <a href={href}>{label}</a>
                              </Button>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                )}
              </div>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

const DesktopMenuDropdownItem = ({
  sections,
  label,
  href,
}: DesktopMenuDropdownItemProps) => {
  const [activeSectionId, setActiveSectionId] = useState<string>();

  const sharedClasses = "h-full space-y-2 overflow-auto pt-6 pb-2";

  const MenuItemClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const selectedSectionId =
      e.currentTarget.getAttribute("data-id") ?? undefined;

    setActiveSectionId(selectedSectionId);
  };

  const MenuItemMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    const selectedSectionId =
      e.currentTarget.getAttribute("data-id") ?? undefined;

    setActiveSectionId(selectedSectionId);
  };

  const activeSectionData = useMemo(
    () => sections?.find((section) => section.id === activeSectionId),
    [sections, activeSectionId],
  );

  if (!sections) return;

  return (
    <Fragment>
      <NavigationMenuTrigger>{label}</NavigationMenuTrigger>
      <NavigationMenuContent className="p-0">
        <div
          style={
            {
              "--menu-margin-bottom": "5rem",
            } as CSSProperties
          }
          className="flex max-h-[calc(100dvh-var(--secondary-nav-height)-var(--primary-nav-height)-var(--menu-margin-bottom))] max-w-110"
        >
          <div>
            <div className={cn("w-60", sharedClasses)}>
              <h2 className="px-6 text-sm font-bold">
                <a href={href}>{label}</a>
              </h2>
              <ol>
                {sections.map((section, index) => (
                  <li key={index}>
                    <Button
                      variant="ghost"
                      data-id={section.id}
                      data-state={
                        section.id === activeSectionId ? "active" : "inactive"
                      }
                      onClick={MenuItemClick}
                      onMouseEnter={MenuItemMouseEnter}
                      className={cn(
                        "relative w-full justify-start rounded-none px-6 text-left font-normal",
                        "data-[state=active]:bg-accent",
                        "transition-opacity after:absolute after:inset-y-0 after:left-0 after:h-full after:w-1 after:bg-primary data-[state=inactive]:after:opacity-0",
                      )}
                    >
                      {section.label}
                    </Button>
                  </li>
                ))}
              </ol>
            </div>
          </div>
          {activeSectionData && (
            <div>
              <div className={cn("w-50 bg-accent", sharedClasses)}>
                <h2 className="px-6 text-sm font-bold">
                  {activeSectionData.label}
                </h2>
                <ol>
                  {activeSectionData.items.map((item, index) => (
                    <li key={index}>
                      <NavigationMenuLink
                        className="px-6 hover:underline"
                        asChild
                      >
                        <a href={item.href}>{item.label}</a>
                      </NavigationMenuLink>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          )}
        </div>
      </NavigationMenuContent>
    </Fragment>
  );
};

export { EcommerceNavbar2 };
