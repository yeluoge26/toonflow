import { describe, it, expect } from 'vitest';

// Pipeline state machine - models the batch production pipeline stages
// Based on t_pipelineTask statuses and t_batch workflow in the codebase

type StageStatus = 'pending' | 'running' | 'completed' | 'failed';

interface PipelineStage {
  name: string;
  status: StageStatus;
  retryCount: number;
  maxRetries: number;
}

interface PipelineState {
  batchId: string;
  stages: PipelineStage[];
  status: 'pending' | 'running' | 'completed' | 'failed';
}

// The pipeline stages for a typical ToonFlow batch production
const DEFAULT_STAGES = ['script', 'storyboard', 'image', 'video', 'audio', 'compose'];

function createPipelineState(batchId: string, stageNames: string[] = DEFAULT_STAGES): PipelineState {
  return {
    batchId,
    stages: stageNames.map(name => ({
      name,
      status: 'pending',
      retryCount: 0,
      maxRetries: 3,
    })),
    status: 'pending',
  };
}

function transitionStage(state: PipelineState, stageName: string, newStatus: StageStatus): PipelineState {
  const updated = { ...state, stages: state.stages.map(s => ({ ...s })) };
  const stage = updated.stages.find(s => s.name === stageName);
  if (!stage) throw new Error(`Stage "${stageName}" not found`);

  if (stage.status === 'completed' && newStatus !== 'completed') {
    throw new Error(`Cannot transition completed stage "${stageName}" to "${newStatus}"`);
  }

  stage.status = newStatus;
  if (newStatus === 'failed') {
    stage.retryCount++;
  }

  // Update overall status
  if (updated.stages.every(s => s.status === 'completed')) {
    updated.status = 'completed';
  } else if (updated.stages.some(s => s.status === 'failed' && s.retryCount >= s.maxRetries)) {
    updated.status = 'failed';
  } else if (updated.stages.some(s => s.status === 'running')) {
    updated.status = 'running';
  }

  return updated;
}

function canRetry(state: PipelineState, stageName: string): boolean {
  const stage = state.stages.find(s => s.name === stageName);
  if (!stage) return false;
  return stage.status === 'failed' && stage.retryCount < stage.maxRetries;
}

function getNextPendingStage(state: PipelineState): string | null {
  // Find the first pending stage where all previous stages are completed
  for (let i = 0; i < state.stages.length; i++) {
    const stage = state.stages[i];
    if (stage.status === 'pending') {
      const allPreviousCompleted = state.stages.slice(0, i).every(s => s.status === 'completed');
      if (allPreviousCompleted) return stage.name;
      return null; // blocked by incomplete previous stage
    }
  }
  return null;
}

function isComplete(state: PipelineState): boolean {
  return state.stages.every(s => s.status === 'completed');
}

function isStageComplete(state: PipelineState, stageName: string): boolean {
  const stage = state.stages.find(s => s.name === stageName);
  return stage?.status === 'completed' ?? false;
}

describe('Pipeline state machine', () => {
  describe('createPipelineState', () => {
    it('creates state with default stages', () => {
      const state = createPipelineState('batch-001');
      expect(state.batchId).toBe('batch-001');
      expect(state.stages).toHaveLength(6);
      expect(state.status).toBe('pending');
      expect(state.stages.every(s => s.status === 'pending')).toBe(true);
    });

    it('creates state with custom stages', () => {
      const state = createPipelineState('batch-002', ['script', 'image']);
      expect(state.stages).toHaveLength(2);
      expect(state.stages[0].name).toBe('script');
      expect(state.stages[1].name).toBe('image');
    });

    it('initializes all retry counts to 0', () => {
      const state = createPipelineState('batch-003');
      expect(state.stages.every(s => s.retryCount === 0)).toBe(true);
      expect(state.stages.every(s => s.maxRetries === 3)).toBe(true);
    });
  });

  describe('transitionStage', () => {
    it('transitions a stage to running', () => {
      let state = createPipelineState('batch-010');
      state = transitionStage(state, 'script', 'running');
      expect(state.stages[0].status).toBe('running');
      expect(state.status).toBe('running');
    });

    it('transitions a stage to completed', () => {
      let state = createPipelineState('batch-011');
      state = transitionStage(state, 'script', 'running');
      state = transitionStage(state, 'script', 'completed');
      expect(state.stages[0].status).toBe('completed');
    });

    it('increments retry count on failure', () => {
      let state = createPipelineState('batch-012');
      state = transitionStage(state, 'script', 'running');
      state = transitionStage(state, 'script', 'failed');
      expect(state.stages[0].retryCount).toBe(1);
    });

    it('throws on unknown stage', () => {
      const state = createPipelineState('batch-013');
      expect(() => transitionStage(state, 'nonexistent', 'running')).toThrow('Stage "nonexistent" not found');
    });

    it('throws when transitioning completed stage backwards', () => {
      let state = createPipelineState('batch-014');
      state = transitionStage(state, 'script', 'running');
      state = transitionStage(state, 'script', 'completed');
      expect(() => transitionStage(state, 'script', 'failed')).toThrow('Cannot transition completed stage');
    });

    it('marks overall state as completed when all stages complete', () => {
      let state = createPipelineState('batch-015', ['script', 'image']);
      state = transitionStage(state, 'script', 'running');
      state = transitionStage(state, 'script', 'completed');
      state = transitionStage(state, 'image', 'running');
      state = transitionStage(state, 'image', 'completed');
      expect(state.status).toBe('completed');
    });

    it('marks overall state as failed when retries exhausted', () => {
      let state = createPipelineState('batch-016', ['script']);
      state = transitionStage(state, 'script', 'failed');
      state = transitionStage(state, 'script', 'failed');
      state = transitionStage(state, 'script', 'failed');
      expect(state.status).toBe('failed');
    });
  });

  describe('canRetry', () => {
    it('returns true for failed stage with retries remaining', () => {
      let state = createPipelineState('batch-020');
      state = transitionStage(state, 'script', 'failed');
      expect(canRetry(state, 'script')).toBe(true);
    });

    it('returns false when retries exhausted', () => {
      let state = createPipelineState('batch-021');
      state = transitionStage(state, 'script', 'failed');
      state = transitionStage(state, 'script', 'failed');
      state = transitionStage(state, 'script', 'failed');
      expect(canRetry(state, 'script')).toBe(false);
    });

    it('returns false for non-failed stage', () => {
      const state = createPipelineState('batch-022');
      expect(canRetry(state, 'script')).toBe(false);
    });

    it('returns false for unknown stage', () => {
      const state = createPipelineState('batch-023');
      expect(canRetry(state, 'nonexistent')).toBe(false);
    });
  });

  describe('getNextPendingStage', () => {
    it('returns first stage when none started', () => {
      const state = createPipelineState('batch-030');
      expect(getNextPendingStage(state)).toBe('script');
    });

    it('returns second stage when first is completed', () => {
      let state = createPipelineState('batch-031');
      state = transitionStage(state, 'script', 'completed');
      expect(getNextPendingStage(state)).toBe('storyboard');
    });

    it('returns null when blocked by running stage', () => {
      let state = createPipelineState('batch-032');
      state = transitionStage(state, 'script', 'running');
      expect(getNextPendingStage(state)).toBeNull();
    });

    it('returns null when all stages are completed', () => {
      let state = createPipelineState('batch-033', ['script', 'image']);
      state = transitionStage(state, 'script', 'completed');
      state = transitionStage(state, 'image', 'completed');
      expect(getNextPendingStage(state)).toBeNull();
    });
  });

  describe('isComplete / isStageComplete', () => {
    it('isComplete returns false for new pipeline', () => {
      const state = createPipelineState('batch-040');
      expect(isComplete(state)).toBe(false);
    });

    it('isComplete returns true when all done', () => {
      let state = createPipelineState('batch-041', ['script']);
      state = transitionStage(state, 'script', 'completed');
      expect(isComplete(state)).toBe(true);
    });

    it('isStageComplete returns correct values', () => {
      let state = createPipelineState('batch-042');
      expect(isStageComplete(state, 'script')).toBe(false);
      state = transitionStage(state, 'script', 'completed');
      expect(isStageComplete(state, 'script')).toBe(true);
      expect(isStageComplete(state, 'storyboard')).toBe(false);
    });

    it('isStageComplete returns false for unknown stage', () => {
      const state = createPipelineState('batch-043');
      expect(isStageComplete(state, 'nonexistent')).toBe(false);
    });
  });
});
