import mongoose from "mongoose";
import config from "./config";

const connectionCurrent = mongoose.createConnection(`${config.mongooseUrl}`, {
  retryWrites: true,
  w: "majority",
});

export default { connectionCurrent };
