**Feature Folder Structure Optimization Prompt**

You are organizing a frontend project using a feature-based folder structure. Follow these rules strictly when generating or refactoring code:

---

**1. Components**

* Each feature has its own `components/` folder. All components inside must be named and scoped to that feature only.
* If a component is reusable across multiple features, place it in the shared `src/components/` directory instead.
* Never import a component from another feature's folder. Cross-feature component imports are not allowed.

**2. Constants**

* If a feature uses constant values, define them in a `constants/` file within that feature folder.
* All constants must be prefixed or named with the feature name to avoid naming collisions (e.g., `USER_STATUS`, `PAYMENT_METHODS`).

**3. Hooks**

* Custom hooks related to a feature belong in that feature's `hooks/` folder.
* Hooks are used to keep components clean by abstracting logic out of JSX.
* Only place a hook here if it is specific to this feature. Shared hooks go in `src/hooks/`.

---

**Rules Summary:**

* ✅ Feature-scoped components stay inside their feature folder
* ✅ Reusable components → `src/components/`
* ✅ Reusable hooks → `src/hooks/`
* ❌ Never import from another feature's `components/` folder
* ❌ No unnamed or unscoped constants

---

**Optimization Progress:**

- [x] `sidebar`
- [x] `three`
- [x] `canvas`
- [x] `code-detail`
- [x] `code-sidebar`
- [x] `data-type-container`
- [x] `function-definer`
- [x] `functions-container`
- [x] `help-modal`
- [x] `import-export`
- [x] `log-container`
- [x] `project-sidebar`
- [x] `renderer`
- [x] `runner-definer`
- [x] `startup-page`
- [x] `variable-container`
