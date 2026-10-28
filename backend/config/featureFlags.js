/**
 * Hire1Percent — Feature Flag Configuration
 * 
 * Provides safe, additive feature toggles for progressive constraint mutation
 * and AI code change analysis with instant rollback capability.
 */

const runtimeOverrides = new Map();

/**
 * Checks whether the Constraint Mutation & AI Integrity Analysis feature is enabled.
 * Defaults to true if unset or 'true', disabled when explicitly set to 'false' or '0'.
 */
function isConstraintMutationAnalysisEnabled() {
    if (runtimeOverrides.has('CONSTRAINT_MUTATION_ANALYSIS_ENABLED')) {
        return Boolean(runtimeOverrides.get('CONSTRAINT_MUTATION_ANALYSIS_ENABLED'));
    }

    const envVal = process.env.CONSTRAINT_MUTATION_ANALYSIS_ENABLED;
    if (envVal === 'false' || envVal === '0') {
        return false;
    }
    return true;
}

/**
 * Sets runtime override for automated testing or emergency rollback.
 */
function setFeatureFlagOverride(flagName, value) {
    if (value === null || value === undefined) {
        runtimeOverrides.delete(flagName);
    } else {
        runtimeOverrides.set(flagName, Boolean(value));
    }
}

/**
 * Clears all runtime overrides.
 */
function clearFeatureFlagOverrides() {
    runtimeOverrides.clear();
}

module.exports = {
    isConstraintMutationAnalysisEnabled,
    setFeatureFlagOverride,
    clearFeatureFlagOverrides
};
