import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

function normalizePhone(p: string): string {
  return (p || "").replace(/\D/g, "");
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const members = await ctx.db.query("members").collect();
    return members.sort((a, b) => a.name.localeCompare(b.name));
  },
});

export const getByPhone = query({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    const cleanPhone = normalizePhone(args.phone);
    if (!cleanPhone) return null;
    return await ctx.db
      .query("members")
      .withIndex("by_phone", (q) => q.eq("phone", cleanPhone))
      .first();
  },
});

export const add = mutation({
  args: {
    name: v.string(),
    phone: v.string(),
    age: v.optional(v.string()),
    codeNo: v.optional(v.string()),
    scdGroup: v.optional(v.string()),
    occupation: v.optional(v.string()),
    memberStatus: v.optional(v.string()),
    ministry: v.optional(v.string()),
    address: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cleanPhone = normalizePhone(args.phone);
    const cleanName = args.name.trim();

    if (!cleanPhone || cleanPhone.length < 7) {
      throw new Error("Valid phone number with at least 7 digits is required.");
    }
    if (!cleanName) {
      throw new Error("Member name is required.");
    }

    const payload = {
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

    const existing = await ctx.db
      .query("members")
      .withIndex("by_phone", (q) => q.eq("phone", cleanPhone))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }

    return await ctx.db.insert("members", {
      ...payload,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    originalPhone: v.string(),
    name: v.string(),
    phone: v.string(),
    age: v.optional(v.string()),
    codeNo: v.optional(v.string()),
    scdGroup: v.optional(v.string()),
    occupation: v.optional(v.string()),
    memberStatus: v.optional(v.string()),
    ministry: v.optional(v.string()),
    address: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const origClean = normalizePhone(args.originalPhone);
    const newClean = normalizePhone(args.phone);
    const cleanName = args.name.trim();

    if (!newClean || newClean.length < 7) {
      throw new Error("Valid phone number is required.");
    }
    if (!cleanName) {
      throw new Error("Name is required.");
    }

    const existing = await ctx.db
      .query("members")
      .withIndex("by_phone", (q) => q.eq("phone", origClean))
      .first();

    if (!existing) {
      throw new Error("Member not found.");
    }

    await ctx.db.patch(existing._id, {
      name: cleanName,
      phone: newClean,
      age: args.age?.trim() || undefined,
      codeNo: args.codeNo?.trim() || undefined,
      scdGroup: args.scdGroup?.trim() || undefined,
      occupation: args.occupation?.trim() || undefined,
      memberStatus: args.memberStatus?.trim() || undefined,
      ministry: args.ministry?.trim() || undefined,
      address: args.address?.trim() || undefined,
    });

    return existing._id;
  },
});

export const remove = mutation({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    const cleanPhone = normalizePhone(args.phone);
    const existing = await ctx.db
      .query("members")
      .withIndex("by_phone", (q) => q.eq("phone", cleanPhone))
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
      return true;
    }
    return false;
  },
});
