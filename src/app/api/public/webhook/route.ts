import { prisma } from '@/lib/prisma';
import { headers } from "next/headers";
import { NextRequest } from "next/server";
import { Webhook } from "svix";

const webhookSecret: string = process.env.NGROK_WEBHOOK_SECRET || "";

export async function POST(req: NextRequest) {
  console.log("[Webhook] POST request received");

  const payload = await req.json();
  const payloadString = JSON.stringify(payload);

  const headerPayload = await headers();
  const svixId = headerPayload.get("svix-id");
  const svixIdTimeStamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  console.log("[Webhook] svix headers", { svixId, svixIdTimeStamp, svixSignature });

  if (!svixId || !svixIdTimeStamp || !svixSignature) {
    console.error("[Webhook] Missing svix headers");
    return new Response("Missing svix headers", { status: 400 });
  }

  const svixHeaders = {
    "svix-id": svixId,
    "svix-timestamp": svixIdTimeStamp,
    "svix-signature": svixSignature,
  };

  const webhookSecret = process.env.CLERK_WEBHOOK_SECRET || "";
  if (!webhookSecret) {
    console.error("[Webhook] Missing webhook secret");
    return new Response("Missing webhook secret", { status: 500 });
  }

  const wh = new Webhook(webhookSecret);
  let evt: Event;

  try {
    evt = wh.verify(payloadString, svixHeaders) as Event;
    console.log("[Webhook] Verification success");
  } catch (err) {
    console.error("[Webhook] Verification failed", {
      error: err,
      svixHeaders,
      webhookSecretExists: !!webhookSecret,
    });
    return new Response("Invalid signature", { status: 401 });
  }

  const eventType: EventType = evt.type;

  // === Clerk ユーザー情報 ===
  const { id: clerkId, email_addresses, first_name, last_name } = evt.data;
  const email = email_addresses?.[0]?.email_address || null;
  const name = `${first_name ?? ""}${last_name ?? ""}`.trim() || null;

  if (eventType === "user.created") {
    try {
      await prisma.user.create({
        data: {
          clerkUserId: clerkId,
          email,
          name,
        },
      });
    } catch (e) {
      console.error("DB insertion failed:", e);
      return new Response("DB Error", { status: 500 });
    }

    return new Response("User created", { status: 201 });
  }

  if (eventType === "user.deleted") {
    try {
      await prisma.user.updateMany({
        where: { clerkUserId: clerkId },
        data: {
          deletedAt: new Date(),
        },
      });
    } catch (e) {
      console.error("DB deletion failed:", e);
    }

    return new Response("User deleted", { status: 200 });
  }

  if (eventType === "user.updated") {
    try {
      await prisma.user.updateMany({
        where: { clerkUserId: clerkId },
        data: {
          email,
          name,
        },
      });
    } catch (e) {
      console.error("DB update failed:", e);
    }

    return new Response("User updated", { status: 200 });
  }

  return new Response("Unhandled event", { status: 400 });
}

type ClerkEmailAddress = {
    id: string;
    email_address: string;
};
  
type ClerkUserData = {
    id: string;
    email_addresses: ClerkEmailAddress[];
    first_name?: string;
    last_name?: string;
};
  
type Event = {
    data: ClerkUserData;
    object: "event";
    type: EventType;
};
  
type EventType = "user.created" | "user.deleted" | "user.updated";
