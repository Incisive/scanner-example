// git clone https://x-access-token:<token>@github.com/owner/repo.git
// git diff-tree --no-commit-id --name-only -r 80659d156100d6b89a2198561725ef77310a5bbd
const AWS = require('aws-sdk');
const activityArn = process.env.ACTIVITY_ARN;

const startTime = new Date().getTime();

var stepFunctions = new AWS.StepFunctions();

let getStepFunctionActivity = async () => {
    let params = {
        activityArn: activityArn,
    };
    return stepFunctions.getActivityTask(params).promise();
};

const executeTask = async () => {};

const reportResults = async () => {};

// Main entrypoint
let fetchWork = true;
const run = async () => {
    while (fetchWork) {
        let curTime = new Date().getTime();
        if (startTime - curTime >= 60000) {
            fetchWork = false;
            break;
        }

        var task = await getStepFunctionActivity();
        if (task.taskToken) {
            await executeTask();
            await reportResults(task.taskToken);
            break;
        }
    }
};

run();
