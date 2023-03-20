#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib'

import { config } from '../config'
import { Pipeline } from '../infra/stacks/pipeline'

const app = new cdk.App()
new Pipeline(app, 'Pipeline', config)

// app.synth()
