const awsx = require('@pulumi/awsx');
const pulumi = require('@pulumi/pulumi');
const config = new pulumi.Config('probot');
const scannerConfig = new pulumi.Config('secrets-scanner');
const env = pulumi.getStack();

// Infrastructure Dependencies
const { cluster } = require('../ecs');
const { secretsVpc } = require('../vpc');
const { secretsCert } = require('./acm');
const { taskRole } = require('./iam');
const { stateMachine } = require('../secrets_scanner/app');

const loadbalancerSg = new awsx.ec2.SecurityGroup(`probot-public-${env}`, {
    vpc: secretsVpc,
});
awsx.ec2.SecurityGroupRule.ingress(
    'https-access',
    loadbalancerSg,
    new awsx.ec2.AnyIPv4Location(),
    new awsx.ec2.TcpPorts(443),
    'only allow https access'
);
awsx.ec2.SecurityGroupRule.egress(
    'outbound-internet-access',
    loadbalancerSg,
    new awsx.ec2.AnyIPv4Location(),
    new awsx.ec2.AllTcpPorts(),
    'allow outbound internet access'
);

// Create the load balancer for the fargate task
const loadBalancer = new awsx.elasticloadbalancingv2.ApplicationLoadBalancer(`probot-lb-${env}`, {
    vpc: secretsVpc,
    subnets: secretsVpc.publicSubnetIds,
    securityGroups: [loadbalancerSg.id],
    external: true,
});

// listener on the balancer for https
const appListener = loadBalancer
    .createTargetGroup(`probot-target-${env}`, {
        port: 3000,
        protocol: 'HTTP',
        healthCheck: { path: '/probot' },
        deregistrationDelay: 30,
    })
    .createListener('https', {
        certificateArn: secretsCert.arn,
        protocol: 'HTTPS',
        port: 443,
        sslPolicy: 'ELBSecurityPolicy-2016-08',
    });

const probotServiceSg = new awsx.ec2.SecurityGroup(`probot-internal-${env}`, {
    vpc: secretsVpc,
});
awsx.ec2.SecurityGroupRule.ingress(
    'probot-service-http',
    probotServiceSg,
    new awsx.ec2.AnyIPv4Location(),
    new awsx.ec2.TcpPorts(3000),
    'allow port 3000'
);
awsx.ec2.SecurityGroupRule.egress(
    'probot-service-outbound',
    probotServiceSg,
    new awsx.ec2.AnyIPv4Location(),
    new awsx.ec2.AllTcpPorts(),
    'allow outbound internet access'
);

const probotService = new awsx.ecs.FargateService(`probot-${env}`, {
    cluster,
    deploymentMinimumHealthyPercent: 50,
    assignPublicIp: false,
    subnets: secretsVpc.privateSubnetIds,
    waitForSteadyState: true,
    securityGroups: [probotServiceSg],
    desiredCount: parseInt(config.require('task_scale'), 0),
    taskDefinitionArgs: {
        taskRole,
        containers: {
            probot: {
                image: awsx.ecs.Image.fromDockerBuild('secrets-probot', {
                    context: './containers/probot',
                    // cacheFrom: { stages: ['builder'] },
                }),
                memory: 512,
                portMappings: [appListener],
                environment: [
                    {
                        name: 'STATE_MACHINE_ARN',
                        value: stateMachine.id,
                    },
                    {
                        name: 'NEW_RELIC_APP_NAME',
                        value: `RV Secrets Scanner - Probot - [${scannerConfig.require('environmentShort')}]`,
                    },
                    { name: 'NEW_RELIC_LABELS', value: `Environment: ${scannerConfig.require('environment')}` },
                ],
            },
        },
    },
});

exports.probotServiceEndpoint = loadBalancer.loadBalancer.dnsName;
exports.probotServiceZoneId = loadBalancer.loadBalancer.zoneId;

// Bubble up to main export
exports.pulumiOutputs = {
    probotServiceEndpoint: loadBalancer.loadBalancer.dnsName,
    probotServiceZoneId: loadBalancer.loadBalancer.zoneId,
};
