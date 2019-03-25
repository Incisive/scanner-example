const awsx = require('@pulumi/awsx');
const aws = require('@pulumi/aws');
const pulumi = require('@pulumi/pulumi');

const scannerConfig = new pulumi.Config('secrets-scanner');
const accountId = scannerConfig.require('accountId');
const region = aws.config.requireRegion();
const env = pulumi.getStack();

const { scannerActivity } = require('./step_functions');
const { startScanContainer, processResults, handleFailure } = require('./lambda');

// Role for step functions to kick off the lambdas
const stateMachineRole = new aws.iam.Role(`secrets-state-machine-${env}`, {
    assumeRolePolicy: JSON.stringify({
        Version: '2012-10-17',
        Statement: [
            {
                Effect: 'Allow',
                Principal: {
                    Service: `states.${region}.amazonaws.com`,
                },
                Action: 'sts:AssumeRole',
            },
        ],
    }),
});
exports.stateMachineRole = stateMachineRole;

const stateMachineRolePolicy = new aws.iam.RolePolicy(`secrets-state-machine-${env}`, {
    role: stateMachineRole.id,
    policy: JSON.stringify({
        Version: '2012-10-17',
        Statement: [
            {
                Effect: 'Allow',
                Action: ['lambda:InvokeFunction'],
                Resource: '*',
            },
        ],
    }),
});

const stateMachine = new aws.sfn.StateMachine(`secrets-scanner-orchestrator-${env}`, {
    roleArn: stateMachineRole.arn,
    definition: pulumi
        .all([startScanContainer.arn, scannerActivity.id, processResults.lambda.arn, handleFailure.lambda.arn])
        .apply(([startScanArn, scanActivityArn, processResultsArn, handleFailureArn]) => {
            return JSON.stringify({
                Comment: 'State machine to manage scanning of a repo for secrets',
                StartAt: 'StartScannerTask',
                TimeoutSeconds: 1800,
                States: {
                    StartScannerTask: {
                        Type: 'Task',
                        Resource: startScanArn,
                        Next: 'ScanRepository',
                        Catch: [
                            {
                                ErrorEquals: ['States.All'],
                                Next: 'HandleFailure',
                            },
                        ],
                    },

                    ScanRepository: {
                        Type: 'Task',
                        Comment: 'This activity is monitoed by the gitleaks scanner (in ecs)',
                        Resource: scanActivityArn,
                        Next: 'ProcessResults',
                        Catch: [
                            {
                                ErrorEquals: ['States.All'],
                                Next: 'HandleFailure',
                            },
                        ],
                    },

                    // Probably slack notice, and updating the github checks request
                    HandleFailure: {
                        Type: 'Task',
                        Resource: handleFailureArn,
                        End: true,
                    },

                    ProcessResults: {
                        Type: 'Task',
                        Resource: processResultsArn,
                        End: true,
                    },
                },
            });
        }),
});

exports.stateMachine = stateMachine;
