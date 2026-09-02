export const handler = function(event, context) {
  var givenName = event.request.userAttributes["given_name"] ?? null;
  var familyName = event.request.userAttributes["family_name"] ?? null;

  var shortName = givenName;
  var longName = givenName;
  if (givenName != null && familyName != null) {
    longName = `${givenName} ${familyName}`;
  }

  event.response = {
    "claimsAndScopeOverrideDetails": {
      "idTokenGeneration": {
        "claimsToAddOrOverride": {
          "wp-userid": event.request.userAttributes["custom:wp-userid"] ?? null,
          "entity-id": event.request.userAttributes["custom:entity-id"] ?? null,
          "given_name": givenName,
          "family_name": familyName,
          "short_name": shortName,
          "long_name": longName
        },
        // "claimsToSuppress": [
        //   "email",
        //   "phone_number"
        // ]
      },
      "accessTokenGeneration": {
        "claimsToAddOrOverride": {
          "wp-userid": event.request.userAttributes["custom:wp-userid"] ?? null,
          "entity-id": event.request.userAttributes["custom:entity-id"] ?? null,
          "wp-edit-username": event.request.userAttributes["custom:wp-edit-username"] ?? null,
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
    }
  };
  // Return to Amazon Cognito
  context.done(null, event);
};