const aws = require('@pulumi/aws');
const pulumi = require('@pulumi/pulumi');
const config = new pulumi.Config('secrets-scanner');

const accountId = config.require('accountId');
const { paramStoreKms } = require('../kms');
const { stateMachine } = require('../secrets_scanner/app');

const taskRole = new aws.iam.Role('probot_task', {
    assumeRolePolicy: JSON.stringify({
        Version: '2012-10-17',
        Statement: [
            {
                Action: 'sts:AssumeRole',
                Principal: {
                    Service: 'ecs-tasks.amazonaws.com',
                },
                Effect: 'Allow',
                Sid: '',
            },
        ],
    }),
});

exports.taskRole = taskRole;

// attach the policy to the role
const rolePolicy = new aws.iam.RolePolicy('probot_task_policy', {
    role: taskRole,
    policy: pulumi.all([paramStoreKms.arn, stateMachine.name]).apply(([paramArn, machineName]) => {
        return JSON.stringify({
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
                        'states:DescribeStateMachine',
                        'states:DescribeExecution',
                        'states:ListExecutions',
                        'states:GetExecutionHistory',
                        'states:StartExecution',
                        'states:DescribeStateMachineForExecution',
                    ],
                    Resource: [
                        `arn:aws:states:*:${accountId}:execution:*:*`,
                        `arn:aws:states:*:${accountId}:stateMachine:${machineName}`,
                    ],
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
        });
    }),
});

exports.pulumiOutputs = {};
