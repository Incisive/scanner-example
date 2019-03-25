const aws = require('@pulumi/aws');
const pulumi = require('@pulumi/pulumi');
const probotConfig = new pulumi.Config('probot');
const scannerConfig = new pulumi.Config('secrets-scanner');

const { paramStoreKms } = require('../kms');

const appId = new aws.ssm.Parameter('probot_app_id', {
    name: '/secrets_probot_scanner/app_id',
    type: 'SecureString',
    keyId: paramStoreKms.keyId,
    value: probotConfig.require('app_id'),
});

exports.appId = appId;

const webhookSecret = new aws.ssm.Parameter('webhook_secret', {
    name: '/secrets_probot_scanner/webhook_secret',
    type: 'SecureString',
    keyId: paramStoreKms.keyId,
    value: probotConfig.require('webhook_secret'),
});

exports.webhookSecret = webhookSecret;

const privateKey = new aws.ssm.Parameter('private_key', {
    name: '/secrets_probot_scanner/private_key',
    type: 'SecureString',
    keyId: paramStoreKms.keyId,
    value: Buffer.from(probotConfig.require('private_key'), 'base64').toString('ascii'),
});

exports.privateKey = privateKey;

const newrelicLicense = new aws.ssm.Parameter('new_relic_license_key', {
    name: '/secrets_probot_scanner/new_relic_license_key',
    type: 'SecureString',
    keyId: paramStoreKms.keyId,
    value: scannerConfig.require('new_relic_license_key'),
});

exports.newrelicLicense = newrelicLicense;

exports.pulumiOutputs = {};
