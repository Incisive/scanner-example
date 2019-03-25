const aws = require('@pulumi/aws');

const secretsCert = new aws.acm.Certificate('secrets-probot', {
    domainName: 'probot.secrets.redventures.io',
    subjectAlternativeNames: ['probot-dev.secrets.redventures.io'],
    validationMethod: 'DNS',
});

exports.secretsCert = secretsCert;

exports.pulumiOutputs = {};
