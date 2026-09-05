function withoutNullishValues(claims) {
  return Object.fromEntries(Object.entries(claims).filter(([, value]) => value != null));
}

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
        claimsToAddOrOverride: withoutNullishValues({
          "wp-userid": attributes["custom:wp-userid"],
          "entity-id": attributes["custom:entity-id"],
          given_name: givenName,
          family_name: familyName,
          short_name: shortName,
          long_name: longName,
        }),
        // "claimsToSuppress": [
        //   "email",
        //   "phone_number"
        // ]
      },
      accessTokenGeneration: {
        claimsToAddOrOverride: withoutNullishValues({
          aud: event.callerContext.clientId,
          "wp-userid": attributes["custom:wp-userid"],
          "entity-id": attributes["custom:entity-id"],
          email: attributes.email,
          "conscribo-id": attributes["custom:conscribo-id"],
        }),
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
