import { env } from "./_generated/server";

export default {
  providers: [
    {
      domain: env.COGNITO_DOMAIN,
      applicationID: env.COGNITO_CLIENT_ID,
    },
  ],
};
