import * as cdk from 'aws-cdk-lib'
import * as CodeBuild from 'aws-cdk-lib/aws-codebuild'
import * as S3 from 'aws-cdk-lib/aws-s3'
import * as CodePipeline from 'aws-cdk-lib/aws-codepipeline'
import * as CodePipelineAction from 'aws-cdk-lib/aws-codepipeline-actions'

export interface PipelineProps extends cdk.StackProps {
  github: {
    owner: string
    repository: string
    branch: string
  }
}

export class Pipeline extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: PipelineProps) {
    super(scope, id, props)

    // Amazon S3 bucket to store CRA website
    const bucketWebsite = new S3.Bucket(this, 'Files', {
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'error.html',
      publicReadAccess: true,
    })

    // AWS CodeBuild artifacts
    const outputSources = new CodePipeline.Artifact()
    const outputWebsite = new CodePipeline.Artifact()

    // AWS CodePipeline pipeline
    const pipeline = new CodePipeline.Pipeline(this, 'Pipeline', {
      pipelineName: 'Website',
      restartExecutionOnUpdate: true,
    })

    // AWS CodePipeline stage to clone sources from GitHub repository
    pipeline.addStage({
      stageName: 'Source',
      actions: [
        new CodePipelineAction.GitHubSourceAction({
          actionName: 'Checkout',
          owner: props.github.owner,
          repo: props.github.repository,
          oauthToken: cdk.SecretValue.secretsManager('GitHubToken-' + props.github.owner),
          output: outputSources,
          trigger: CodePipelineAction.GitHubTrigger.WEBHOOK,
          branch: props.github.branch,
        }),
      ],
    })

    // AWS CodePipeline stage to build CRA website and CDK resources
    pipeline.addStage({
      stageName: 'Build',
      actions: [
        // AWS CodePipeline action to run CodeBuild project
        new CodePipelineAction.CodeBuildAction({
          actionName: 'Website',
          project: new CodeBuild.PipelineProject(this, 'BuildWebsite', {
            projectName: 'Website',
            buildSpec: CodeBuild.BuildSpec.fromSourceFilename('./infra/buildspec.yml'),
          }),
          input: outputSources,
          outputs: [outputWebsite],
        }),
      ],
    })

    // AWS CodePipeline stage to deployt CRA website and CDK resources
    pipeline.addStage({
      stageName: 'Deploy',
      actions: [
        // AWS CodePipeline action to deploy CRA website to S3
        new CodePipelineAction.S3DeployAction({
          actionName: 'Website',
          input: outputWebsite,
          bucket: bucketWebsite,
        }),
      ],
    })

    new cdk.CfnOutput(this, 'WebsiteURL', {
      value: bucketWebsite.bucketWebsiteUrl,
      description: 'Website URL',
    })
  }
}
