/**
 * DMCE Mutation Registry (Dynamic Mutation Coding Engine)
 * 
 * Defines deterministic, reproducible mutation contracts based on SME specification.
 * Mutations represent real-world infrastructure/scale shifts (e.g. heap clamped to 16MB,
 * CPU core restricted, streaming I/O constraint) requiring candidates to adapt algorithmic strategy.
 */

const MUTATION_CONTRACTS = {
    'mut_mem_opt_16mb': {
        mutationId: 'mut_mem_opt_16mb',
        type: 'MEMORY_LIMIT',
        headline: 'System Scale Mutation: Memory Cap Clamped',
        description: 'Peak stream volume exceeded. Maximum runtime heap has been dynamically reduced to 16 MB. Adapt your existing solution to operate in-place using streaming or iterators without loading full datasets into RAM.',
        resourceConstraints: {
            memoryLimitMb: 16,
            memoryLimitBytes: 16 * 1024 * 1024,
            cpuQuotaPercent: 100,
            timeoutMs: 6000
        },
        adaptationTimeBufferSec: 600, // +10 minutes
        mutationRule: 'STRICT_MEMORY_ENFORCEMENT',
        mutationTests: [
            {
                input: 'STREAM_BENCHMARK_100000_ELEMENTS',
                expectedOutput: 'STREAM_PROCESSED_OK',
                category: 'MUTATION',
                isHidden: true,
                explanation: 'Validates memory usage remains strictly under 16MB during high-throughput ingestion.'
            },
            {
                input: 'LARGE_SCALE_IN_PLACE_ITERATION',
                expectedOutput: 'IN_PLACE_OK',
                category: 'MUTATION',
                isHidden: false,
                explanation: 'Ensures data structures are mutated in-place rather than replicated in auxiliary arrays.'
            }
        ]
    },

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
        adaptationTimeBufferSec: 480, // +8 minutes
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
        adaptationTimeBufferSec: 600, // +10 minutes
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
 * Returns a mutation contract by ID or null.
 */
function getMutationContract(mutationId) {
    if (!mutationId) return null;
    return MUTATION_CONTRACTS[mutationId] || null;
}

/**
 * Returns all available mutation contracts.
 */
function listMutationContracts() {
    return Object.values(MUTATION_CONTRACTS);
}

/**
 * Deterministically selects the primary mutation contract for a question.
 */
function selectMutationForQuestion(question = {}) {
    if (question && question.mutationContractId && MUTATION_CONTRACTS[question.mutationContractId]) {
        return MUTATION_CONTRACTS[question.mutationContractId];
    }
    // Default to the mentor-specified 16MB memory cap mutation
    return MUTATION_CONTRACTS['mut_mem_opt_16mb'];
}

module.exports = {
    MUTATION_CONTRACTS,
    getMutationContract,
    listMutationContracts,
    selectMutationForQuestion
};
