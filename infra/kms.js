const aws = require('@pulumi/aws');
const awsx = require('@pulumi/awsx');
const pulumi = require('@pulumi/pulumi');
const env = pulumi.getStack();

const paramStoreKms = new aws.kms.Key('parameter_store_kms', {
    description: 'Parameter store kms master key',
    enableKeyRotation: true,
    isEnabled: true,
    deletionWindowInDays: 10,
});
exports.paramStoreKms = paramStoreKms;

// create an alias so Chamber can decrypt the secrets later on
const paramStoreKmsAlias = new aws.kms.Alias('parameter_store_kms_alias', {
    name: 'alias/parameter_store_key',
    targetKeyId: paramStoreKms.keyId,
});
exports.paramStoreKmsAlias = paramStoreKmsAlias;

exports.pulumiOutputs = {};
