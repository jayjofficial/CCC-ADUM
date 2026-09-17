import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  members: defineTable({
    phone: v.string(),
    name: v.string(),
    ministry: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_phone", ["phone"])
    .index("by_name", ["name"]),

  checkins: defineTable({
    phone: v.string(),
    name: v.string(),
    ministry: v.optional(v.string()),
    date: v.string(), // Format: YYYY-MM-DD
    time: v.string(), // E.g., "10:30 AM"
    timestamp: v.number(),
  })
    .index("by_date", ["date"])
    .index("by_date_and_phone", ["date", "phone"]),

  settings: defineTable({
    key: v.string(),
    value: v.string(),
  }).index("by_key", ["key"]),
});
