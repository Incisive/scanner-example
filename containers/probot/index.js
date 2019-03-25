require('newrelic');

const AWS = require('aws-sdk');

const stateMachineArn = process.env.STATE_MACHINE_ARN;

module.exports = app => {
    app.on(['check_suite.requested', 'check_run.rerequested'], check);

    async function check(context) {
        console.log(context);
        // Do stuff
        const { head_branch, head_sha } = context.payload.check_suite || context.payload.check_run.check_suite;
        // Probot API note: context.repo() => {username: 'hiimbex', repo: 'testing-things'}

        // Kick off an instance of the state machine and send it this check request
        var stepfunctions = new AWS.StepFunctions();
        try {
            await stepfunctions
                .startExecution({
                    stateMachineArn,
                    name: `${context.payload.repository.name}_${head_branch}_${head_sha}`,
                    input: JSON.stringify(context.payload),
                })
                .promise();

            return context.github.checks.create(
                context.repo({
                    name: 'RV Secrets Bot',
                    head_branch,
                    head_sha,
                    status: 'in_progress',
                })
            );
        } catch (error) {
            console.log(error); // @TODO throw this in datadog / newrelic / something SAAS..
            console.log('Fail');
            return context.github.checks.create(
                context.repo({
                    name: 'RV Secrets Bot',
                    head_branch,
                    head_sha,
                    status: 'completed',
                    conclusion: 'failure',
                    completed_at: new Date(),
                    output: {
                        title: 'Internal Error Occurred',
                        summary: 'This check failed to run due to an internal error.',
                    },
                })
            );
        }
    }
};
