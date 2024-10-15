import dotenv from "dotenv";

dotenv.config();

export default {
  port: process.env.PORT,
  mongooseUrl: process.env.MONGOOSE_URL_LOCAL,
  apiSiret: process.env.API_SIRET_CLIENT_ID,
  apiSiretSecret: process.env.API_SIRET_CLIENT_SECRET,
};
