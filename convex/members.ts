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
    ministry: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const cleanPhone = normalizePhone(args.phone);
    const cleanName = args.name.trim();
    const cleanMinistry = args.ministry?.trim() || "";

    if (!cleanPhone || cleanPhone.length < 7) {
      throw new Error("Valid phone number with at least 7 digits is required.");
    }
    if (!cleanName) {
      throw new Error("Member name is required.");
    }

    const existing = await ctx.db
      .query("members")
      .withIndex("by_phone", (q) => q.eq("phone", cleanPhone))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        name: cleanName,
        ministry: cleanMinistry || undefined,
      });
      return existing._id;
    }

    return await ctx.db.insert("members", {
      phone: cleanPhone,
      name: cleanName,
      ministry: cleanMinistry || undefined,
      createdAt: Date.now(),
    });
  },
});

export const update = mutation({
  args: {
    originalPhone: v.string(),
    name: v.string(),
    phone: v.string(),
    ministry: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const origClean = normalizePhone(args.originalPhone);
    const newClean = normalizePhone(args.phone);
    const cleanName = args.name.trim();
    const cleanMinistry = args.ministry?.trim() || "";

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
      ministry: cleanMinistry || undefined,
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
