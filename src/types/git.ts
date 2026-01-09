/**
 * Git related types
 */

export interface LabeledValue {
  label: string;
  value: string;
}

export interface BranchInfo {
  currentBranch?: string;
  branchOptions: LabeledValue[];
}

export interface GetBranchInfoOptions {
  fetchRemote?: boolean;
}
