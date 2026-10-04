import mongoose from "mongoose";
import { readConfig } from "../src/config.js";
import { connectDatabase } from "../src/database.js";
import { EmailOutbox } from "../src/models/index.js";
try {
  await connectDatabase(readConfig().mongoUri);
  const groups = await EmailOutbox.collection
    .aggregate([
      {
        $group: {
          _id: {
            category: "$category",
            template: "$templateKey",
            state: "$state",
          },
          count: { $sum: 1 },
          oldest: { $min: "$createdAt" },
          lastErrorCode: { $max: "$lastErrorCode" },
        },
      },
    ])
    .toArray();
  console.info(JSON.stringify(groups));
} catch {
  console.error("MAIL_STATUS_UNAVAILABLE");
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
