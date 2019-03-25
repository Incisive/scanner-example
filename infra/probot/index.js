// Infrastructure Dependencies
const iam = require('./iam');
const acm = require('./acm');
const ecs = require('./ecs');
const parameterStore = require('./parameter_store');
const route53 = require('./route53');

exports.pulumiOutputs = {
    ...iam.pulumiOutputs,
    ...acm.pulumiOutputs,
    ...parameterStore.pulumiOutputs,
    ...ecs.pulumiOutputs,
    ...route53.pulumiOutputs,
};
