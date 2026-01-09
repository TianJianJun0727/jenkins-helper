/**
 * Git operations service
 * Handles Git repository operations using simple-git
 */

import simpleGit, { SimpleGit, BranchSummary } from 'simple-git';
import { BranchInfo, LabeledValue, GetBranchInfoOptions } from '../types/git';

/**
 * Format branch name by removing remote prefixes
 */
function formatBranchName(branchName: string): string {
  return branchName
    .replace(/^remotes\/origin\//, '')
    .replace(/^origin\//, '')
    .trim();
}

/**
 * Get current branch and remote branch options from Git repository
 * @param baseDir Repository root directory
 * @param options Options for fetching remote branches
 * @returns Branch information including current branch and remote branch options
 */
export async function getBranchInfo(
  baseDir: string,
  options: GetBranchInfoOptions = {}
): Promise<BranchInfo> {
  const { fetchRemote = true } = options;
  const git: SimpleGit = simpleGit({ baseDir });

  // Step 1: Optionally fetch from remote
  if (fetchRemote) {
    try {
      await git.fetch(['--prune']); // --prune removes deleted remote branches
    } catch (err) {
      console.error('Git fetch 失败,继续使用缓存分支信息:', err);
    }
  }

  // Step 2: Parallel execution of independent operations
  const [branchesResult, statusResult] = await Promise.allSettled([
    git.branch(['-r']), // Get remote branches
    git.status(), // Get current status (including current branch)
  ]);

  let branchOptions: LabeledValue[] = [];
  let currentBranch: string | undefined;

  // Process remote branches result
  if (branchesResult.status === 'fulfilled') {
    const branches: BranchSummary = branchesResult.value;
    const remoteBranches = (branches.all || []).filter(
      (b) => b.startsWith('origin/') && !b.includes('->')
    );
    branchOptions = remoteBranches.map((b) => ({
      label: formatBranchName(b),
      value: b,
    }));
  } else {
    console.error('获取远程分支失败:', branchesResult.reason);
  }

  // Process current branch status result
  if (statusResult.status === 'fulfilled') {
    const status = statusResult.value;
    if (status.current) {
      currentBranch = formatBranchName(status.current);
    }
  } else {
    console.error('获取当前分支状态失败:', statusResult.reason);
  }

  return { currentBranch, branchOptions };
}
