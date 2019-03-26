const aws = require('@pulumi/aws');

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

