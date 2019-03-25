const aws = require('@pulumi/aws');
const awsx = require('@pulumi/awsx');
const pulumi = require('@pulumi/pulumi');
const env = pulumi.getStack();

const secretsVpc = new awsx.ec2.Vpc(
    `secrets-bot-${env}`,
    {
        tags: {
            Name: `secrets-bot-${env}`,
        },
        cidrBlock: '10.10.0.0/16',
        numberOfAvailabilityZones: 2,
    },
    { protect: false }
);
exports.secretsVpc = secretsVpc;

exports.pulumiOutputs = {};
