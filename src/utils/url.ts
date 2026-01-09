/**
 * URL utility functions
 */

/**
 * Ensure URL has a trailing slash
 */
export function ensureTrailingSlash(url: string): string {
  return url.endsWith('/') ? url : `${url}/`;
}

/**
 * Extract job path from Jenkins job URL
 * Example: https://jenkins.com/job/Test/job/ProjectName/ -> Test/ProjectName
 */
export function extractJobPath(jobUrl: string): string {
  try {
    const url = new URL(jobUrl);
    const pathParts = url.pathname.split('/').filter((p) => p && p !== 'job');
    return pathParts.join('/');
  } catch {
    // Fallback: direct string processing
    return jobUrl.split('/job/').slice(1).join('/').replace(/\/$/, '');
  }
}
