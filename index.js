const aws = require('@pulumi/aws');
const awsx = require('@pulumi/awsx');
const cloud = require('@pulumi/cloud-aws');
const pulumi = require('@pulumi/pulumi');
const config = new pulumi.Config('rv-secrets-bot');

const { pulumiOutputs } = require('./infra');

// Merge all nested pulumiOutputs into a final exports
module.exports = { ...module.exports, ...pulumiOutputs };
