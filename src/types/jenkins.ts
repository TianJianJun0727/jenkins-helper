/**
 * Jenkins API types and models
 */

/**
 * Jenkins Job structure
 */
export interface JenkinsJob {
  name: string;
  url: string;
  jobs?: JenkinsJob[];
}

/**
 * Jenkins Jobs Tree API Response
 */
export interface JenkinsJobsTreeResponse {
  jobs?: JenkinsJob[];
}

/**
 * Jenkins Queue Item API Response
 */
export interface JenkinsQueueItemResponse {
  why?: string;
  cancelled?: boolean;
  executable?: {
    number: number;
    url: string;
  };
}

/**
 * Jenkins Build API Response
 */
export interface JenkinsBuildResponse {
  building?: boolean;
  result?: string | null;
  estimatedDuration?: number;
  timestamp?: number;
  duration?: number;
  url?: string;
  fullDisplayName?: string;
  number?: number;
  actions?: Array<{
    _class?: string;
    parameters?: Array<{ name: string; value?: unknown }>;
    causes?: Array<{
      _class?: string;
      userName?: string;
      userId?: string;
    }>;
  }>;
}

/**
 * Jenkins Job Parameter Definition
 */
export interface JenkinsJobParamDefinition {
  name: string;
  type?: string;
  defaultValue?: unknown;
}

/**
 * Jenkins Job Parameter Definitions API Response
 */
export interface JenkinsJobParamDefinitionsResponse {
  property?: Array<{
    parameterDefinitions?: JenkinsJobParamDefinition[];
  }>;
}

/**
 * Jenkins Last Build Parameters API Response
 */
export interface JenkinsLastBuildParamsResponse {
  actions?: Array<{
    parameters?: Array<{ name: string; value?: unknown }>;
  }>;
}

/**
 * Jenkins CSRF Crumb
 */
export interface JenkinsCrumb {
  headerName: string;
  crumb: string;
}

/**
 * Blue Ocean Pipeline Node (Stage)
 */
export interface JenkinsBlueOceanNode {
  displayName: string;
  durationInMillis?: number;
  startTime?: string | null;
  result:
    | 'SUCCESS'
    | 'FAILURE'
    | 'UNSTABLE'
    | 'UNKNOWN'
    | 'ABORTED'
    | 'NOT_BUILT'
    | null;
  state: 'RUNNING' | 'FINISHED' | 'PAUSED' | 'QUEUED' | 'NOT_EXECUTED' | null;
}

/**
 * Blue Ocean Nodes API Response
 */
export type JenkinsBlueOceanNodesResponse = JenkinsBlueOceanNode[];

/**
 * Build executable information
 */
export interface BuildExecutable {
  number: number;
  url: string;
}

/**
 * Build result information
 */
export interface BuildResult {
  stage: 'queued' | 'building' | 'finished';
  projectName?: string;
  builder?: string | null;
  env?: string;
  branch?: string | null;
  result?: string;
  success?: boolean;
  message?: string;
  buildUrl?: string;
  buildNumber?: number;
  duration?: number; // 构建总耗时（毫秒）
}
