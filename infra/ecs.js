const aws = require('@pulumi/aws');
const awsx = require('@pulumi/awsx');
const pulumi = require('@pulumi/pulumi');
const env = pulumi.getStack();

// Infrastructure Dependencies
const { secretsVpc } = require('./vpc');

const cluster = new awsx.ecs.Cluster(`secrets-scanner-${env}`, {
    vpc: secretsVpc,
    name: `secrets-scanner-${env}`,
});

exports.cluster = cluster;

exports.pulumiOutputs = {};
