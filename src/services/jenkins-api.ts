/**
 * Jenkins API client
 * Provides methods to interact with Jenkins REST API
 */

import { AxiosResponse } from 'axios';
import {
  JenkinsJobsTreeResponse,
  JenkinsQueueItemResponse,
  JenkinsBuildResponse,
  JenkinsBlueOceanNodesResponse,
} from '../types/jenkins';
import request from '../utils/request';
import { ensureTrailingSlash } from '../utils/url';
import { JENKINS_API } from '../constants';

/**
 * Fetch Jenkins jobs tree structure
 */
export async function fetchJobsTree(
  baseUrl: string
): Promise<[Error | null, JenkinsJobsTreeResponse?]> {
  const url = `${ensureTrailingSlash(baseUrl)}${JENKINS_API.JOBS_TREE}`;
  return request.get(url, {
    returnData: true,
  } as any);
}

/**
 * Fetch queue item information
 */
export async function fetchQueueItem(
  queueUrl: string,
  signal?: AbortSignal
): Promise<[Error | null, JenkinsQueueItemResponse?]> {
  const url = `${ensureTrailingSlash(queueUrl)}${JENKINS_API.QUEUE_API}`;
  return request.get(url, {
    returnData: true,
    signal,
  } as any);
}

/**
 * Fetch build information
 */
export async function fetchBuild(
  buildUrl: string,
  signal?: AbortSignal
): Promise<[Error | null, JenkinsBuildResponse?]> {
  const url = `${ensureTrailingSlash(buildUrl)}${JENKINS_API.BUILD_API}`;
  return request.get(url, {
    returnData: true,
    signal,
  } as any);
}

/**
 * Fetch last build information
 */
export async function fetchLastBuild(
  jobUrl: string
): Promise<[Error | null, JenkinsBuildResponse?]> {
  const url = `${ensureTrailingSlash(jobUrl)}${JENKINS_API.LAST_BUILD}`;
  return request.get(url, {
    returnData: true,
  } as any);
}

/**
 * Trigger build with parameters
 */
export async function postBuildWithParameters(
  jobUrl: string,
  params: Record<string, string>
): Promise<[Error | null, AxiosResponse<unknown>?]> {
  const url = `${ensureTrailingSlash(jobUrl)}${JENKINS_API.BUILD_WITH_PARAMS}`;
  return request.post(url, new URLSearchParams(params), {
    returnData: false,
  } as any);
}

/**
 * Fetch Blue Ocean Pipeline Nodes (stages)
 * Used to get detailed stage-level progress
 */
export async function fetchBlueOceanNodes(
  jenkinsBaseUrl: string,
  jobPath: string,
  buildNumber: number,
  signal?: AbortSignal
): Promise<[Error | null, JenkinsBlueOceanNodesResponse?]> {
  // Convert jobPath to Blue Ocean format
  // Example: Test/ProjectName -> Test/pipelines/ProjectName
  const pathParts = jobPath.split('/').filter((p) => p);

  // Insert 'pipelines' between path parts
  const blueOceanPath = pathParts.join('/pipelines/');

  const url = `${ensureTrailingSlash(
    jenkinsBaseUrl
  )}${JENKINS_API.BLUE_OCEAN_BASE}/${blueOceanPath}/runs/${buildNumber}/nodes/`;



  return request.get(url, {
    returnData: true,
    signal,
  } as any);
}

/**
 * Send Webhook notification
 */
export async function postWebhook(
  webhookUrl: string,
  payload: unknown
): Promise<[Error | null, any?]> {
  return request.post(webhookUrl, payload, {
    returnData: false,
  } as any);
}
