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

export const getPreviousListMembers = query({
  args: {},
  handler: async (ctx) => {
    const today = getTodayKey();
    // Fetch all check-ins recorded on dates other than today (historical service dates)
    const records = await ctx.db
      .query("checkins")
      .filter((q) => q.neq(q.field("date"), today))
      .collect();

    // Deduplicate by phone so unique members across previous lists are shown
    const map = new Map();
    records.sort((a, b) => b.timestamp - a.timestamp);
    for (const r of records) {
      const key = r.phone || r.name;
      if (!map.has(key)) {
        map.set(key, r);
      }
    }

    return Array.from(map.values());
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
      return { id: existing._id, alreadyCheckedIn: true, record: existing, member };
    }

    const timeStr = args.time || getTimeNow();
    const newId = await ctx.db.insert("checkins", {
      phone: cleanPhone,
      name: member.name,
      age: member.age,
      codeNo: member.codeNo,
      scdGroup: member.scdGroup,
      occupation: member.occupation,
      memberStatus: member.memberStatus,
      ministry: member.ministry,
      address: member.address,
      date: targetDate,
      time: timeStr,
      timestamp: Date.now(),
    });

    const record = await ctx.db.get(newId);
    return { id: newId, alreadyCheckedIn: false, record, member };
  },
});

export const registerAndCheckIn = mutation({
  args: {
    phone: v.string(),
    name: v.string(),
    age: v.optional(v.string()),
    codeNo: v.optional(v.string()),
    scdGroup: v.optional(v.string()),
    occupation: v.optional(v.string()),
    memberStatus: v.optional(v.string()),
    ministry: v.optional(v.string()),
    address: v.optional(v.string()),
    date: v.optional(v.string()),
    time: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cleanPhone = normalizePhone(args.phone);
    const cleanName = args.name.trim();

    if (!cleanPhone || cleanPhone.length < 7) {
      throw new Error("Valid phone number with at least 7 digits is required.");
    }
    if (!cleanName) {
      throw new Error("Name is required.");
    }

    const memberData = {
      name: cleanName,
      phone: cleanPhone,
      age: args.age?.trim() || undefined,
      codeNo: args.codeNo?.trim() || undefined,
      scdGroup: args.scdGroup?.trim() || undefined,
      occupation: args.occupation?.trim() || undefined,
      memberStatus: args.memberStatus?.trim() || undefined,
      ministry: args.ministry?.trim() || undefined,
      address: args.address?.trim() || undefined,
    };

    // 1. Ensure member exists
    const existingMember = await ctx.db
      .query("members")
      .withIndex("by_phone", (q) => q.eq("phone", cleanPhone))
      .first();

    let memberId = existingMember?._id;
    if (existingMember) {
      await ctx.db.patch(existingMember._id, memberData);
    } else {
      memberId = await ctx.db.insert("members", {
        ...memberData,
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
        member: memberData,
        checkin: existingCheckin,
        alreadyCheckedIn: true,
      };
    }

    const timeStr = args.time || getTimeNow();
    const checkinId = await ctx.db.insert("checkins", {
      ...memberData,
      date: targetDate,
      time: timeStr,
      timestamp: Date.now(),
    });

    const checkin = await ctx.db.get(checkinId);
    return {
      member: memberData,
      checkin,
      alreadyCheckedIn: false,
    };
  },
});
