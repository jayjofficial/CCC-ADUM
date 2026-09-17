import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

const DEFAULT_PIN = "1234";

export const getPin = query({
  args: {},
  handler: async (ctx) => {
    const setting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "adminPin"))
      .first();

    return setting ? setting.value : DEFAULT_PIN;
  },
});

export const setPin = mutation({
  args: {
    currentPin: v.string(),
    newPin: v.string(),
  },
  handler: async (ctx, args) => {
    const setting = await ctx.db
      .query("settings")
      .withIndex("by_key", (q) => q.eq("key", "adminPin"))
      .first();

    const actualPin = setting ? setting.value : DEFAULT_PIN;
    if (args.currentPin !== actualPin) {
      throw new Error("Current PIN is incorrect.");
    }

    if (!/^\d{4,8}$/.test(args.newPin)) {
      throw new Error("New PIN must be 4 to 8 digits.");
    }

    if (setting) {
      await ctx.db.patch(setting._id, { value: args.newPin });
    } else {
      await ctx.db.insert("settings", { key: "adminPin", value: args.newPin });
    }

    return true;
  },
});
