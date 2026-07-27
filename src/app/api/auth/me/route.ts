import { ensureDevice, checkSubscription } from "@/lib/subscription";

export async function GET(request: Request) {
  const anonUserId = request.headers.get("x-anon-user-id");
  if (!anonUserId) {
    return Response.json(
      {
        isSubscribed: false,
        expiresAt: null,
        freeUsesRemaining: 0,
        canAccessFull: false,
      },
      { status: 200 }
    );
  }

  const device = await ensureDevice(anonUserId);
  const status = checkSubscription(device);
  return Response.json(status);
}
