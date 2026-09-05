export const handler = function (event, context) {
  const attributes = event.request.userAttributes;
  const givenName = attributes["given_name"];
  const familyName = attributes["family_name"];

  const shortName = givenName;
  const longName =
    givenName && familyName ? `${givenName} ${familyName}` : (givenName ?? familyName);

  event.response = {
    claimsAndScopeOverrideDetails: {
      idTokenGeneration: {
        claimsToAddOrOverride: {
          ...(attributes["custom:wp-userid"] !== undefined
            ? { "wp-userid": attributes["custom:wp-userid"] }
            : {}),
          ...(attributes["custom:entity-id"] !== undefined
            ? { "entity-id": attributes["custom:entity-id"] }
            : {}),
          ...(givenName !== undefined ? { given_name: givenName, short_name: shortName } : {}),
          ...(familyName !== undefined ? { family_name: familyName } : {}),
          ...(longName !== undefined ? { long_name: longName } : {}),
        },
        // "claimsToSuppress": [
        //   "email",
        //   "phone_number"
        // ]
      },
      accessTokenGeneration: {
        claimsToAddOrOverride: {
          aud: event.callerContext.clientId,
          ...(attributes["custom:wp-userid"] !== undefined
            ? { "wp-userid": attributes["custom:wp-userid"] }
            : {}),
          ...(attributes["custom:entity-id"] !== undefined
            ? { "entity-id": attributes["custom:entity-id"] }
            : {}),
          ...(attributes.email !== undefined ? { email: attributes.email } : {}),
          ...(attributes["custom:conscribo-id"] !== undefined
            ? { "conscribo-id": attributes["custom:conscribo-id"] }
            : {}),
        },
        // "claimsToSuppress": [],
        // "scopesToAdd": [
        //   "openid",
        //   "email",
        //   "solar-system-data/asteroids.add"
        // ],
        // "scopesToSuppress": [
        //   "phone_number",
        //   "aws.cognito.signin.user.admin"
        // ]
      },
      // "groupOverrideDetails": {
      //   // "groupsToOverride": [
      //   //   "new-group-A",
      //   //   "new-group-B",
      //   //   "new-group-C"
      //   // ],
      //   // "iamRolesToOverride": [
      //   //   "arn:aws:iam::123456789012:role/new_roleA",
      //   //   "arn:aws:iam::123456789012:role/new_roleB",
      //   //   "arn:aws:iam::123456789012:role/new_roleC"
      //   // ],
      //   // "preferredRole": "arn:aws:iam::123456789012:role/new_role",
      // }
    },
  };
  // Return to Amazon Cognito
  context.done(null, event);
};
