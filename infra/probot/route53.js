const aws = require('@pulumi/aws');
const pulumi = require('@pulumi/pulumi');
const env = pulumi.getStack();

const { probotServiceEndpoint } = require('./ecs');

// Fetch the main zoneID from the main account infrastructure project
const prodInfra = new pulumi.StackReference(`Incisive/rv-secrets-infra/prod`);

const probotCname = new aws.route53.Record(`probot-${env}.secrets.redventures.io`, {
    name: `probot-${env}.secrets.redventures.io`,
    records: [probotServiceEndpoint],
    type: 'CNAME',
    ttl: 300,
    zoneId: prodInfra.getOutput('route53:secrets:zoneId'),
});

exports.pulumiOutputs = { probotCname: probotCname.fqdn };
