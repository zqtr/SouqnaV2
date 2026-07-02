import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from 'souqna';
import { Eye, Pencil, Copy, Archive, Trash2 } from 'lucide-react';

export const ProductActionsMenu = () => (
  <DropdownMenu open>
    <DropdownMenuTrigger className="inline-flex h-9 items-center rounded-md border bg-background px-4 text-sm font-medium shadow-xs">
      Product actions
    </DropdownMenuTrigger>
    <DropdownMenuContent align="start" style={{ minWidth: 220 }}>
      <DropdownMenuLabel>Karak chai — large</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuGroup>
        <DropdownMenuItem>
          <Eye />
          View on storefront
          <DropdownMenuShortcut>⌘O</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Pencil />
          Edit product
          <DropdownMenuShortcut>⌘E</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Copy />
          Duplicate
        </DropdownMenuItem>
      </DropdownMenuGroup>
      <DropdownMenuSeparator />
      <DropdownMenuItem>
        <Archive />
        Archive
      </DropdownMenuItem>
      <DropdownMenuItem variant="destructive">
        <Trash2 />
        Delete product
        <DropdownMenuShortcut>⌫</DropdownMenuShortcut>
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);
