/**
 * DMCE Mutation Registry (Dynamic Mutation Coding Engine)
 * 
 * Defines deterministic, reproducible mutation contracts based on SME specification.
 * Mutations represent real-world infrastructure/scale shifts (e.g. heap clamped to configured memory limit,
 * CPU core restricted, streaming I/O constraint) requiring candidates to adapt algorithmic strategy.
 */

const DEFAULT_MUTATION_MEMORY_LIMIT_MB = 14;

/**
 * Factory creating memory mutation contract with dynamic memory limit and buffer settings.
 */
function createMemoryMutationContract(memoryLimitMb = DEFAULT_MUTATION_MEMORY_LIMIT_MB, adaptationTimeBufferSec = 0) {
    const memMb = (typeof memoryLimitMb === 'number' && !isNaN(memoryLimitMb) && memoryLimitMb > 0)
        ? memoryLimitMb
        : DEFAULT_MUTATION_MEMORY_LIMIT_MB;
    const bufferSec = (typeof adaptationTimeBufferSec === 'number' && !isNaN(adaptationTimeBufferSec) && adaptationTimeBufferSec >= 0)
        ? adaptationTimeBufferSec
        : 0;

    return {
        id: `mut_mem_opt_${memMb}mb`,
        mutationId: `mut_mem_opt_${memMb}mb`,
        type: 'MEMORY_LIMIT',
        headline: 'System Scale Mutation: Memory Cap Clamped',
        description: `Peak stream volume exceeded. Maximum runtime heap has been dynamically reduced to ${memMb} MB. Adapt your existing solution to operate in-place using streaming or iterators without loading full datasets into RAM.`,
        resourceConstraints: {
            memoryLimitMb: memMb,
            memoryLimitBytes: memMb * 1024 * 1024,
            cpuQuotaPercent: 100,
            timeoutMs: 6000
        },
        adaptationTimeBufferSec: bufferSec,
        mutationRule: 'STRICT_MEMORY_ENFORCEMENT',
        mutationTests: [
            {
                input: 'STREAM_BENCHMARK_100000_ELEMENTS',
                expectedOutput: 'STREAM_PROCESSED_OK',
                category: 'MUTATION',
                isHidden: true,
                explanation: `Validates memory usage remains strictly under ${memMb}MB during high-throughput ingestion.`
            },
            {
                input: 'LARGE_SCALE_IN_PLACE_ITERATION',
                expectedOutput: 'IN_PLACE_OK',
                category: 'MUTATION',
                isHidden: false,
                explanation: 'Ensures data structures are mutated in-place rather than replicated in auxiliary arrays.'
            }
        ]
    };
}

const MUTATION_CONTRACTS = {
    'mut_mem_opt_14mb': createMemoryMutationContract(14, 0),
    'mut_mem_opt_16mb': createMemoryMutationContract(16, 0),
    'mut_cpu_clamp_25pct': {
        mutationId: 'mut_cpu_clamp_25pct',
        type: 'CPU_THROTTLE',
        headline: 'System Scale Mutation: Compute Core Clamped (25% Quota)',
        description: 'Node CPU capacity clamped to 25% due to noisy-neighbor failover. Naive O(N^2) algorithms will experience Time-Limit Exceeded. Optimize time complexity to O(N log N) or O(N).',
        resourceConstraints: {
            memoryLimitMb: 128,
            memoryLimitBytes: 128 * 1024 * 1024,
            cpuQuotaPercent: 25,
            timeoutMs: 3000 // Tighter timeout under clamped compute
        },
        adaptationTimeBufferSec: 0, // No extra time — recruiter's configured time is absolute
        mutationRule: 'STRICT_TIME_COMPLEXITY_ENFORCEMENT',
        mutationTests: [
            {
                input: 'LARGE_ARRAY_QUADRATIC_STRESS_TEST',
                expectedOutput: 'OPTIMIZED_PASS',
                category: 'MUTATION',
                isHidden: true,
                explanation: 'Fails algorithms with quadratic or higher time complexity.'
            }
        ]
    },

    'mut_stream_chunk_4kb': {
        mutationId: 'mut_stream_chunk_4kb',
        type: 'STREAMING_CHUNK',
        headline: 'System Scale Mutation: Low-Latency Chunk Streaming',
        description: 'Input pipeline switched from bulk buffered payload to 4KB streaming chunks. Solution must consume inputs incrementally.',
        resourceConstraints: {
            memoryLimitMb: 32,
            memoryLimitBytes: 32 * 1024 * 1024,
            cpuQuotaPercent: 100,
            timeoutMs: 5000
        },
        adaptationTimeBufferSec: 0, // No extra time — recruiter's configured time is absolute
        mutationRule: 'STREAMING_CHUNK_ENFORCEMENT',
        mutationTests: [
            {
                input: 'CHUNKED_STREAM_INGESTION_4KB',
                expectedOutput: 'STREAM_PROCESSED_OK',
                category: 'MUTATION',
                isHidden: false,
                explanation: 'Tests chunked parsing without buffering complete file.'
            }
        ]
    }
};

/**
 * Returns a mutation contract by ID or null, with optional overrides.
 */
function getMutationContract(mutationId, options = {}) {
    if (!mutationId) return null;
    let base = MUTATION_CONTRACTS[mutationId] || null;

    if (!base && mutationId.startsWith('mut_mem_opt_')) {
        const match = mutationId.match(/^mut_mem_opt_(\d+)mb$/);
        const mem = match ? parseInt(match[1], 10) : DEFAULT_MUTATION_MEMORY_LIMIT_MB;
        return createMemoryMutationContract(mem, options.adaptationTimeBufferSec ?? 0);
    }

    if (base && base.type === 'MEMORY_LIMIT' && options.memoryLimitMb !== undefined) {
        return createMemoryMutationContract(options.memoryLimitMb, options.adaptationTimeBufferSec ?? base.adaptationTimeBufferSec);
    }

    if (base) {
        return {
            ...base,
            resourceConstraints: { ...base.resourceConstraints },
            adaptationTimeBufferSec: options.adaptationTimeBufferSec !== undefined ? options.adaptationTimeBufferSec : base.adaptationTimeBufferSec
        };
    }
    return null;
}

/**
 * Returns all available mutation contracts.
 */
function listMutationContracts() {
    return Object.values(MUTATION_CONTRACTS);
}

/**
 * Deterministically selects the primary mutation contract for a question or session config.
 */
function selectMutationForQuestion(question = {}, options = {}) {
    if (question && question.mutationContractId && MUTATION_CONTRACTS[question.mutationContractId]) {
        return getMutationContract(question.mutationContractId, options);
    }
    // If explicitly configured memoryLimitMb is provided, create tailored contract
    const configuredMem = options.memoryLimitMb 
        || question?.config?.memoryLimitMb 
        || question?.dynamicMutation?.memoryLimitMb 
        || question?.memoryLimitMb;
    if (configuredMem) {
        const bufferSec = options.adaptationTimeBufferSec !== undefined
            ? options.adaptationTimeBufferSec
            : (question?.config?.mutationTimeBufferSec ?? question?.dynamicMutation?.mutationTimeBufferSec ?? question?.mutationTimeBufferSec ?? 0);
        return createMemoryMutationContract(configuredMem, bufferSec);
    }
    // Default legacy SME contract (16MB)
    return MUTATION_CONTRACTS['mut_mem_opt_16mb'];
}

module.exports = {
    DEFAULT_MUTATION_MEMORY_LIMIT_MB,
    createMemoryMutationContract,
    MUTATION_CONTRACTS,
    getMutationContract,
    listMutationContracts,
    selectMutationForQuestion
};
