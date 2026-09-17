import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

function normalizePhone(p: string): string {
  return (p || "").replace(/\D/g, "");
}

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function getTimeNow(): string {
  return new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export const getForDate = query({
  args: { date: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const targetDate = args.date || getTodayKey();
    const records = await ctx.db
      .query("checkins")
      .withIndex("by_date", (q) => q.eq("date", targetDate))
      .collect();

    return records.sort((a, b) => b.timestamp - a.timestamp);
  },
});

export const getTodayCheckinForPhone = query({
  args: { phone: v.string(), date: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const targetDate = args.date || getTodayKey();
    const cleanPhone = normalizePhone(args.phone);
    if (!cleanPhone) return null;

    return await ctx.db
      .query("checkins")
      .withIndex("by_date_and_phone", (q) =>
        q.eq("date", targetDate).eq("phone", cleanPhone)
      )
      .first();
  },
});

export const checkIn = mutation({
  args: {
    phone: v.string(),
    date: v.optional(v.string()),
    time: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cleanPhone = normalizePhone(args.phone);
    if (!cleanPhone) {
      throw new Error("Phone number is required.");
    }

    const member = await ctx.db
      .query("members")
      .withIndex("by_phone", (q) => q.eq("phone", cleanPhone))
      .first();

    if (!member) {
      throw new Error("Member not found. Please register first.");
    }

    const targetDate = args.date || getTodayKey();
    const existing = await ctx.db
      .query("checkins")
      .withIndex("by_date_and_phone", (q) =>
        q.eq("date", targetDate).eq("phone", cleanPhone)
      )
      .first();

    if (existing) {
      return { id: existing._id, alreadyCheckedIn: true, record: existing };
    }

    const timeStr = args.time || getTimeNow();
    const newId = await ctx.db.insert("checkins", {
      phone: cleanPhone,
      name: member.name,
      ministry: member.ministry,
      date: targetDate,
      time: timeStr,
      timestamp: Date.now(),
    });

    const record = await ctx.db.get(newId);
    return { id: newId, alreadyCheckedIn: false, record };
  },
});

export const registerAndCheckIn = mutation({
  args: {
    phone: v.string(),
    name: v.string(),
    ministry: v.optional(v.string()),
    date: v.optional(v.string()),
    time: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cleanPhone = normalizePhone(args.phone);
    const cleanName = args.name.trim();
    const cleanMinistry = args.ministry?.trim() || "";

    if (!cleanPhone || cleanPhone.length < 7) {
      throw new Error("Valid phone number with at least 7 digits is required.");
    }
    if (!cleanName) {
      throw new Error("Name is required.");
    }

    // 1. Ensure member exists
    const existingMember = await ctx.db
      .query("members")
      .withIndex("by_phone", (q) => q.eq("phone", cleanPhone))
      .first();

    let memberId = existingMember?._id;
    if (existingMember) {
      await ctx.db.patch(existingMember._id, {
        name: cleanName,
        ministry: cleanMinistry || undefined,
      });
    } else {
      memberId = await ctx.db.insert("members", {
        phone: cleanPhone,
        name: cleanName,
        ministry: cleanMinistry || undefined,
        createdAt: Date.now(),
      });
    }

    // 2. Record check-in
    const targetDate = args.date || getTodayKey();
    const existingCheckin = await ctx.db
      .query("checkins")
      .withIndex("by_date_and_phone", (q) =>
        q.eq("date", targetDate).eq("phone", cleanPhone)
      )
      .first();

    if (existingCheckin) {
      return {
        member: { phone: cleanPhone, name: cleanName, ministry: cleanMinistry },
        checkin: existingCheckin,
        alreadyCheckedIn: true,
      };
    }

    const timeStr = args.time || getTimeNow();
    const checkinId = await ctx.db.insert("checkins", {
      phone: cleanPhone,
      name: cleanName,
      ministry: cleanMinistry || undefined,
      date: targetDate,
      time: timeStr,
      timestamp: Date.now(),
    });

    const checkin = await ctx.db.get(checkinId);
    return {
      member: { phone: cleanPhone, name: cleanName, ministry: cleanMinistry },
      checkin,
      alreadyCheckedIn: false,
    };
  },
});
