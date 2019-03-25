const awsx = require('@pulumi/awsx');
const aws = require('@pulumi/aws');
const pulumi = require('@pulumi/pulumi');
const env = pulumi.getStack();

const scannerActivity = new aws.sfn.Activity('gitleaks-scanner', {
    name: `gitleaks-scanner-${env}`,
});
exports.scannerActivity = scannerActivity;

exports.pulumiOutputs = {};
