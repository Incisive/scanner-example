const aws = require('@pulumi/aws');
const awsx = require('@pulumi/awsx');
const pulumi = require('@pulumi/pulumi');
const env = pulumi.getStack();
const scannerConfig = new pulumi.Config('secrets-scanner');
const region = aws.config.requireRegion();
const accountId = scannerConfig.require('accountId');

const { cluster } = require('../ecs');
const { secretsVpc } = require('../vpc');
const { scannerTask } = require('./ecs');
const { taskRole } = require('../common/iam');

const secretsScannerSg = new awsx.ec2.SecurityGroup(`secrets-scanner-internal-${env}`, {
    vpc: secretsVpc,
});
awsx.ec2.SecurityGroupRule.egress(
    `secrets-scanner-task-outbound-${env}`,
    secretsScannerSg,
    new awsx.ec2.AnyIPv4Location(),
    new awsx.ec2.AllTcpPorts(),
    'allow outbound internet access'
);

exports.secretsScannerSg = secretsScannerSg;

const lambdaRole = new aws.iam.Role('secrets_lambda_role', {
    assumeRolePolicy: JSON.stringify({
        Version: '2012-10-17',
        Statement: [
            {
                Action: 'sts:AssumeRole',
                Principal: {
                    Service: 'lambda.amazonaws.com',
                },
                Effect: 'Allow',
                Sid: '',
            },
        ],
    }),
});

exports.lambdaRole = lambdaRole;

// attach the policy to the role
const lambdaRolePolicy = new aws.iam.RolePolicy('secrets_lambda_policy', {
    role: lambdaRole,
    policy: pulumi
        .all([scannerTask.taskDefinition.family, cluster.cluster.arn, taskRole.arn])
        .apply(([taskFamily, clusterArn, taskRoleArn]) => {
            return JSON.stringify({
                Version: '2012-10-17',
                Statement: [
                    {
                        Effect: 'Allow',
                        Action: ['ecs:RunTask', 'ecs:DescribeClusters'],
                        Resource: [`arn:aws:ecs:${region}:${accountId}:task-definition/${taskFamily}`, clusterArn],
                    },
                    {
                        Effect: 'Allow',
                        Action: [
                            'logs:CreateLogGroup',
                            'logs:CreateLogStream',
                            'logs:PutLogEvents',
                            'logs:DescribeLogStreams',
                        ],
                        Resource: [`arn:aws:logs:${region}:${accountId}:*`],
                    },

                    {
                        Effect: 'Allow',
                        Action: 'iam:PassRole',
                        Resource: taskRoleArn,
                    },
                ],
            });
        }),
});

const startScanContainer = new aws.lambda.CallbackFunction(`secrets-start-scan-container-${env}`, {
    role: lambdaRole,

    callback: async (event, context, callback) => {
        const AWS = require('aws-sdk');
        const Octokit = require('@octokit/rest');

        var ecs = new AWS.ECS();

        var params = {
            taskDefinition: scannerTask.taskDefinition.family.value,
            cluster: cluster.cluster.arn.value,
            launchType: 'FARGATE',
            networkConfiguration: {
                awsvpcConfiguration: {
                    subnets: secretsVpc.privateSubnetIds.map(s => s.value),
                    assignPublicIp: 'DISABLED',
                    securityGroups: [secretsScannerSg.id.value],
                },
            },
        };

        console.log(JSON.stringify(params, null, 4));
        await ecs.runTask(params).promise();

        console.log('Scanner task has been started.');

        callback(null, 'Hello');
    },
});
exports.startScanContainer = startScanContainer;

const processResults = new aws.serverless.Function(
    `secrets-process-results-${env}`,
    { role: lambdaRole },
    (event, context, callback) => {
        // Process results
        callback(null, 'test');
    }
);
exports.processResults = processResults;

const handleFailure = new aws.serverless.Function(
    `secrets-handle-failure-${env}`,
    { role: lambdaRole },
    (event, context, callback) => {
        // Process results
        callback(null, 'test');
    }
);
exports.handleFailure = handleFailure;
