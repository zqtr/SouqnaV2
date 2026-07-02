import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from 'souqna';

export const PayoutTooltip = () => (
  <TooltipProvider>
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        paddingTop: 56,
      }}
    >
      <Tooltip open>
        <TooltipTrigger className="inline-flex h-8 items-center rounded-md border bg-background px-3 text-sm font-medium shadow-xs">
          Request payout
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={6}>
          Payouts settle to your QNB account within 2 business days
        </TooltipContent>
      </Tooltip>
    </div>
  </TooltipProvider>
);
