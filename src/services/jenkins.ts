/**
 * Jenkins service module
 * High-level Jenkins operations including build triggering, polling, and status tracking
 */

import {
  JenkinsJob,
  JenkinsJobsTreeResponse,
  JenkinsQueueItemResponse,
  JenkinsBlueOceanNode,
  BuildExecutable,
  BuildResult,
  JenkinsBuildResponse,
} from '../types/jenkins';
import { LabeledValue, TriggerBuildPayload } from '../types';
import { getCurrentConfig } from './config';
import { POLLING } from '../constants';
import { extractJobPath, ensureTrailingSlash } from '../utils/url';
import * as JenkinsAPI from './jenkins-api';

/**
 * Get environment options for a project
 * Fetches Jenkins job tree and filters by project name
 */
export async function getEnvOptions(
  projectName: string,
  baseUrl: string
): Promise<LabeledValue[]> {
  const [error, data] = await JenkinsAPI.fetchJobsTree(baseUrl);

  if (error || !data) {
    console.error('Failed to fetch jobs tree:', error);
    return [];
  }

  const jobs = data.jobs ?? [];
  const target = projectName.toLowerCase();

  return jobs.flatMap((top: JenkinsJob) => {
    const children = top.jobs ?? [];
    return children
      .filter((child: JenkinsJob) => child.name.toLowerCase() === target)
      .map((child: JenkinsJob) => ({
        label: top.name,
        value: child.url,
      }));
  });
}

/**
 * Trigger build with parameters and get queue location
 */
async function triggerBuild(
  payload: TriggerBuildPayload
): Promise<string | undefined> {
  const { jobUrl, branch } = payload;

  const [error, res] = await JenkinsAPI.postBuildWithParameters(jobUrl, {
    GIT_BRANCH: branch,
  });

  if (error || res?.status !== 201) {
    console.error('Failed to trigger build:', error);
    return undefined;
  }

  const location = res.headers['location'] || res.headers['Location'];
  return location || undefined;
}

/**
 * Wait for build to be assigned an executor and get build number
 * Polls the queue until executable is available
 */
async function waitForExecutable(
  queueUrl: string
): Promise<BuildExecutable | undefined> {
  const { QUEUE_MAX_ATTEMPTS, QUEUE_INTERVAL } = POLLING;
  let attempts = 0;

  while (attempts < QUEUE_MAX_ATTEMPTS) {
    const [error, data] = await JenkinsAPI.fetchQueueItem(queueUrl);

    if (!error && data) {
      const queueData = data as JenkinsQueueItemResponse;
      // Check if build number has been assigned
      if (queueData.executable?.url && queueData.executable?.number) {
        return {
          number: queueData.executable.number,
          url: ensureTrailingSlash(queueData.executable.url),
        };
      }
    }

    await new Promise((resolve) => setTimeout(resolve, QUEUE_INTERVAL));
    attempts++;
  }

  return undefined;
}

/**
 * Poll build status until completion (using Blue Ocean API for detailed progress)
 */
async function pollBuildStatus(
  buildNumber: number,
  jobPath: string,
  jenkinsBaseUrl: string,
  onProgress: (progress: JenkinsBlueOceanNode[]) => void
): Promise<boolean> {
  const { BUILD_MAX_ATTEMPTS, BUILD_INTERVAL } = POLLING;
  let attempts = 0;

  while (attempts < BUILD_MAX_ATTEMPTS) {
    const [error, data] = await JenkinsAPI.fetchBlueOceanNodes(
      jenkinsBaseUrl,
      jobPath,
      buildNumber
    );

    if (!error && data && Array.isArray(data)) {
      onProgress(data);

      // Check if any stage has failed - if so, stop immediately
      const hasFailed = data.some(
        (node) =>
          node.state === 'FINISHED' &&
          (node.result === 'FAILURE' ||
            node.result === 'ABORTED' ||
            node.result === 'UNSTABLE')
      );

      if (hasFailed) {
        return true; // Stop polling when a stage fails
      }

      // Check if all stages are finished
      const allFinished = data.every((node) => node.state === 'FINISHED');
      if (allFinished) {
        return true;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, BUILD_INTERVAL));
    attempts++;
  }

  return false;
}

/**
 * Get build result information
 */
async function getBuildResult(
  jobUrl: string,
  buildNumber: number
): Promise<JenkinsBuildResponse | undefined> {
  const buildUrl = `${ensureTrailingSlash(jobUrl)}${buildNumber}/`;
  const [error, data] = await JenkinsAPI.fetchBuild(buildUrl);

  if (error || !data) {
    console.error('Failed to get build result:', error);
    return undefined;
  }

  return data;
}

/**
 * Extract builder and branch information from build data
 */
function extractBuilderAndBranch(
  data: JenkinsBuildResponse
): { builder: string | null; branch: string | null } {
  let builder: string | null = null;
  let branch: string | null = null;

  const actions = data.actions || [];

  // Extract builder from CauseAction
  const causeAction = actions.find(
    (action) => action?._class === 'hudson.model.CauseAction'
  );

  if (causeAction && Array.isArray(causeAction.causes)) {
    const userIdCause = causeAction.causes.find(
      (cause) => cause._class === 'hudson.model.Cause$UserIdCause'
    );
    if (userIdCause) {
      builder = userIdCause.userName || userIdCause.userId || null;
    }
  }

  // Extract branch from ParametersAction
  const parametersAction = actions.find(
    (action) => action?._class === 'hudson.model.ParametersAction'
  );

  if (parametersAction && Array.isArray(parametersAction.parameters)) {
    const gitBranchParam = parametersAction.parameters.find(
      (param) => param.name === 'GIT_BRANCH'
    );
    if (gitBranchParam) {
      branch = String(gitBranchParam.value || null);
    }
  }

  return { builder, branch };
}

/**
 * Trigger build and track entire lifecycle
 * Handles: queue -> building -> completion
 */
export async function triggerBuildWithLifecycle(
  payload: TriggerBuildPayload,
  onProgress: (progress: JenkinsBlueOceanNode[]) => void,
  onResult: (result: BuildResult) => void | Promise<void>
): Promise<void> {
  try {
    const config = getCurrentConfig();
    const { jobUrl } = payload;

    console.log('Triggering build with payload:', payload);

    // Step 1: Trigger build and get queue location
    const queueLocation = await triggerBuild(payload);
    if (!queueLocation) {
      await onResult({
        stage: 'finished',
        success: false,
        message: '触发构建失败: 无法获取队列位置',
      });
      return;
    }

    await onResult({
      stage: 'queued',
      message: '等待构建分配执行器...',
    });

    // Step 2: Wait for queue to assign build number
    const executable = await waitForExecutable(queueLocation);
    if (!executable) {
      await onResult({
        stage: 'finished',
        success: false,
        message: '触发构建失败: 无法获取构建信息',
      });
      return;
    }

    await onResult({
      stage: 'building',
      message: '构建中...',
      buildNumber: executable.number,
      buildUrl: executable.url,
    });

    // Step 3: Extract job path for Blue Ocean API
    const jobPath = extractJobPath(jobUrl);

    // Step 4: Poll build status until completion
    const isFinished = await pollBuildStatus(
      executable.number,
      jobPath,
      config.url,
      onProgress
    );

    if (!isFinished) {
      await onResult({
        stage: 'finished',
        success: false,
        message: '构建超时: 构建未在预期时间内完成',
        buildNumber: executable.number,
        buildUrl: executable.url,
      });
      return;
    }

    // Step 5: Get final build result
    const buildData = await getBuildResult(jobUrl, executable.number);
    if (!buildData) {
      await onResult({
        stage: 'finished',
        success: false,
        message: '构建失败: 无法获取构建结果',
        buildNumber: executable.number,
        buildUrl: executable.url,
      });
      return;
    }

    // Step 6: Send final result
    const isSuccess = buildData.result === 'SUCCESS';
    const builderInfo = extractBuilderAndBranch(buildData);

    await onResult({
      stage: 'finished',
      success: isSuccess,
      message: isSuccess ? '构建成功' : `构建失败: ${buildData.result}`,
      buildNumber: executable.number,
      buildUrl: buildData.url,
      result: buildData.result || undefined,
      duration: buildData.duration,
      ...builderInfo,
    });
  } catch (error) {
    console.error('Build lifecycle error:', error);
    await onResult({
      stage: 'finished',
      success: false,
      message: `构建异常: ${String(error)}`,
    });
  }
}

/**
 * Get last build result for a job
 */
export async function getLastBuildResult(
  jobUrl: string
): Promise<{
  builder: string | null;
  branch: string | null;
  timestamp?: number;
  buildNumber?: number;
  buildUrl?: string;
  result?: string;
}> {
  const [error, data] = await JenkinsAPI.fetchLastBuild(jobUrl);

  if (error || !data) {
    console.error('Failed to get last build result:', error);
    return { builder: null, branch: null };
  }

  const builderAndBranch = extractBuilderAndBranch(data);
  return {
    ...builderAndBranch,
    timestamp: data.timestamp,
    buildNumber: data.number,
    buildUrl: data.url,
    result: data.result || undefined,
  };
}

/**
 * Send webhook notification
 */
export async function sendWebhook(
  webhookUrl: string,
  payload: BuildResult
): Promise<void> {
  const [error] = await JenkinsAPI.postWebhook(webhookUrl, payload);
  if (error) {
    console.error('Failed to send webhook:', error);
  }
}
