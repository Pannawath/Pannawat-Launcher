/// Dependency resolver — detects conflicts and missing deps
use crate::InstalledMod;
use crate::ModConflict;

pub struct ConflictReport {
    pub conflicts: Vec<ModConflict>,
    pub missing_deps: Vec<String>,
}

/// Check a list of installed mods for conflicts and missing dependencies.
/// Currently a stub — will be expanded when mod metadata is richer.
pub fn check(mods: &[InstalledMod]) -> ConflictReport {
    // TODO: Parse fabric.mod.json inside each .jar to read real dep graph
    ConflictReport {
        conflicts: vec![],
        missing_deps: vec![],
    }
}
