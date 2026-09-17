import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";

const http = httpRouter();

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Handle OPTIONS preflight for /api/* routes
http.route({
  path: "/api/members",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }),
});

http.route({
  path: "/api/checkins",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }),
});

http.route({
  path: "/api/checkin",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }),
});

http.route({
  path: "/api/register",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }),
});

// GET /api/members
http.route({
  path: "/api/members",
  method: "GET",
  handler: httpAction(async (ctx) => {
    const members = await ctx.runQuery(api.members.list, {});
    return new Response(JSON.stringify(members), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }),
});

// GET /api/checkins?date=YYYY-MM-DD
http.route({
  path: "/api/checkins",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const date = url.searchParams.get("date") || undefined;
    const records = await ctx.runQuery(api.checkins.getForDate, { date });
    return new Response(JSON.stringify(records), {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }),
});

// POST /api/checkin
http.route({
  path: "/api/checkin",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { phone, date, time } = body;
      if (!phone) {
        return new Response(JSON.stringify({ error: "Missing phone" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      const res = await ctx.runMutation(api.checkins.checkIn, { phone, date, time });
      return new Response(JSON.stringify(res), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message || "Failed to check in" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
  }),
});

// POST /api/register
http.route({
  path: "/api/register",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      const body = await request.json();
      const { phone, name, ministry, date, time } = body;
      if (!phone || !name) {
        return new Response(JSON.stringify({ error: "Missing phone or name" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      const res = await ctx.runMutation(api.checkins.registerAndCheckIn, {
        phone,
        name,
        ministry,
        date,
        time,
      });
      return new Response(JSON.stringify(res), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message || "Failed to register" }), {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }
  }),
});

// Default status probe
http.route({
  path: "/",
  method: "GET",
  handler: httpAction(async () => {
    return new Response(
      JSON.stringify({
        status: "ok",
        service: "Calvary Charismatic Center Adum Attendance Backend",
        endpoints: ["/api/members", "/api/checkins", "/api/checkin", "/api/register"],
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      }
    );
  }),
});

export default http;
