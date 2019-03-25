const aws = require('@pulumi/aws');
const awsx = require('@pulumi/awsx');
const pulumi = require('@pulumi/pulumi');
const scannerConfig = new pulumi.Config('secrets-scanner');
const env = pulumi.getStack();
const config = new pulumi.Config('secrets-scanner');
const accountId = config.require('accountId');

// Infrastructure Dependencies
const { cluster } = require('../ecs');
const { secretsVpc } = require('../vpc');
const { paramStoreKms } = require('../kms');
const { scannerActivity } = require('./step_functions');

// Role for the fargate task that scans the repos for secrets.
// This needs access to the state machine, s3, param store (thus kms)
const taskRole = new aws.iam.Role(`secrets-scanner-task-${env}`, {
    assumeRolePolicy: JSON.stringify({
        Version: '2012-10-17',
        Statement: [
            {
                Effect: 'Allow',
                Principal: {
                    Service: 'ecs-tasks.amazonaws.com',
                },
                Action: 'sts:AssumeRole',
            },
        ],
    }),
});

exports.taskRole = taskRole;

const taskRolePolicy = new aws.iam.RolePolicy(`secrets-scanner-task-${env}`, {
    role: taskRole.id,
    policy: pulumi.all([paramStoreKms.arn, scannerActivity.arn]).apply(([paramArn, activityArn]) =>
        JSON.stringify({
            Version: '2012-10-17',
            Statement: [
                {
                    Effect: 'Allow',
                    Action: ['kms:ListKeys', 'kms:ListAliases', 'kms:Describe*', 'kms:Decrypt'],
                    Resource: [paramArn],
                },
                {
                    Effect: 'Allow',
                    Action: [
                        'states:GetActivityTask',
                        'states:SendTaskSuccess',
                        'states:SendTaskFailure',
                        'states:SendTaskHeartbeat',
                    ],
                    Resource: [activityArn],
                },
                {
                    Effect: 'Allow',
                    Action: ['ssm:GetParameters', 'ssm:GetParametersByPath'],
                    Resource: [`arn:aws:ssm:*:${accountId}:parameter/secrets_probot_scanner/*`],
                },
                {
                    Effect: 'Allow',
                    Action: 'ssm:DescribeParameters',
                    Resource: '*',
                },
            ],
        })
    ),
});

const scannerTask = new awsx.ecs.FargateTaskDefinition(`secrets-scanner-${env}`, {
    taskRole: taskRole,
    memory: 2048,
    containers: {
        secrets_scanner: {
            image: awsx.ecs.Image.fromDockerBuild(`secrets-scanner-${env}`, {
                context: './containers/secrets_scanner',
                // cacheFrom: { stages: ['builder'] },
            }),
            memory: 2048,
            environment: [
                {
                    name: 'ACTIVITY_ARN',
                    value: scannerActivity.id,
                },
                {
                    name: 'ACCOUNT_ID',
                    value: scannerConfig.require('accountId'),
                },
                {
                    name: 'NEW_RELIC_APP_NAME',
                    value: `RV Secrets Scanner - Scanner - [${scannerConfig.require('environmentShort')}]`,
                },
                { name: 'NEW_RELIC_LABELS', value: `Environment: ${scannerConfig.require('environment')}` },
            ],
        },
    },
});

exports.scannerTask = scannerTask;
