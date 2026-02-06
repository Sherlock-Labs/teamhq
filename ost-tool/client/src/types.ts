export type OSTNode = {
  id: string;
  type: "outcome" | "opportunity" | "solution" | "experiment";
  label: string;
  description: string;
  parentId: string | null;
  children: string[];
};

export type OSTTree = { nodes: OSTNode[] };

export type DebateResult = {
  perspective: string;
  assessment: string;
  score: number;
  keyInsight: string;
  topArguments: string[];
  risks: string[];
};

export type SolutionImpact = {
  solutionId: string;
  solutionLabel: string;
  impactScore: number;
  impactRationale: string;
};

export type Recommendation = {
  recommendation: string;
  rationale: string;
  risks: string[];
  firstSteps: string[];
  deprioritize: string[];
  confidence: number;
  solutionImpacts: SolutionImpact[];
};

export type Session = {
  id: string;
  goal: string;
  context: string;
  createdAt: string;
  ost?: OSTTree;
  selectedSolutions?: string[];
  debate?: DebateResult[];
  recommendation?: Recommendation;
};

export type PerspectiveInfo = {
  id: string;
  name: string;
  description: string;
};
