const ecs = require('./ecs');
const kms = require('./kms');
const secretsScanner = require('./secrets_scanner');
const probot = require('./probot');
const vpc = require('./vpc');

exports.pulumiOutputs = {
    ...vpc.pulumiOutputs,
    ...ecs.pulumiOutputs,
    ...kms.pulumiOutputs,
    ...probot.pulumiOutputs,
    ...secretsScanner.pulumiOutputs,
};
