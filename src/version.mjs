// Single source of truth for release identity.
// RELEASE is the product release (V35 = 35.0.0). The evidence engine carries its own rule
// version (ENGINE_VERSION in src/engine/evaluate.mjs) because saved assessments are stamped
// with it; it changes only when scoring or decision rules change.
export const PRODUCT='Career Radar';
export const RELEASE='35.0.0';
export const RELEASE_LABEL='V35';
