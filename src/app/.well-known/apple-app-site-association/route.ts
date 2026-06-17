const associatedAppIds = [
  'M3C64AFM3S.qa.souqna.merchant',
  'M3C64AFM3S.qa.souqna.merchant.app',
] as const;

export const dynamic = 'force-static';

export function GET() {
  return new Response(
    JSON.stringify({
      webcredentials: {
        apps: associatedAppIds,
      },
    }),
    {
      headers: {
        'content-type': 'application/json',
        'cache-control': 'public, max-age=3600, s-maxage=3600',
      },
    },
  );
}
