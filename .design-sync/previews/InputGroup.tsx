import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
  Label,
} from 'souqna';
import { Search, Link2 } from 'lucide-react';

export const SearchProducts = () => (
  <div style={{ display: 'grid', gap: 6, maxWidth: 380 }}>
    <Label htmlFor="prod-search">Search products</Label>
    <InputGroup>
      <InputGroupAddon>
        <Search />
      </InputGroupAddon>
      <InputGroupInput id="prod-search" placeholder="Karak, dates, oud…" />
      <InputGroupAddon align="inline-end">
        <InputGroupText>128 items</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  </div>
);

export const PriceInput = () => (
  <div style={{ display: 'grid', gap: 6, maxWidth: 380 }}>
    <Label htmlFor="unit-price">Unit price</Label>
    <InputGroup>
      <InputGroupAddon>
        <InputGroupText>QAR</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput id="unit-price" type="number" defaultValue="45" />
      <InputGroupAddon align="inline-end">
        <InputGroupText>per box</InputGroupText>
      </InputGroupAddon>
    </InputGroup>
  </div>
);

export const StorefrontLink = () => (
  <div style={{ display: 'grid', gap: 6, maxWidth: 380 }}>
    <Label htmlFor="store-url">Storefront link</Label>
    <InputGroup>
      <InputGroupAddon>
        <Link2 />
        <InputGroupText>souqna.qa/</InputGroupText>
      </InputGroupAddon>
      <InputGroupInput id="store-url" defaultValue="qahwa-corner" />
      <InputGroupAddon align="inline-end">
        <InputGroupButton variant="outline" size="xs">
          Copy
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  </div>
);

export const ReplyBox = () => (
  <div style={{ maxWidth: 420 }}>
    <InputGroup>
      <InputGroupAddon align="block-start">
        <InputGroupText>Reply to order #SQ-2214</InputGroupText>
      </InputGroupAddon>
      <InputGroupTextarea
        placeholder="Shukran! Your dates ship tomorrow…"
        rows={3}
      />
      <InputGroupAddon align="block-end">
        <InputGroupText>0 / 500</InputGroupText>
        <InputGroupButton variant="default" size="sm" style={{ marginLeft: 'auto' }}>
          Send
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  </div>
);
