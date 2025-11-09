# Volleyball-Specific Elements Reference

This document maps all volleyball-specific references throughout the codebase for easy identification during the refactoring to make the application sport-agnostic (TeamBuilder).

---

## 1. Configuration Layer

### 1.1 Volleyball Config File
**File:** `src/config/volleyball.js`

**Impact:** HIGH - This is the central configuration for volleyball

**Elements:**
- Position codes: S, OPP, OH, MB, L
- Position names: Setter, Opposite, Outside Hitter, Middle Blocker, Libero
- Position weights: S(1.3), OPP(1.2), OH(1.15), MB(1.1), L(1.0)
- Position order: [S, OPP, OH, MB, L]
- Default composition: S=1, OPP=1, OH=2, MB=2, L=0 (6-player team)

**Refactoring Strategy:** Keep file structure, create generic version

---

## 2. Service Layer

### 2.1 PlayerService
**File:** `src/services/PlayerService.js`
**Impact:** MEDIUM - Direct dependency

**Volleyball References:**
- Line 9: `import volleyballConfig from '../config/volleyball.js'`
- Line 14: `this.positions = volleyballConfig.positions`
- Line 34-43: Position validation uses volleyball positions
- Lines 88-92: Creates position-indexed ratings/comparisons objects

**Changes Needed:**
- Accept config as constructor parameter
- Use `this.config.positions` instead of `volleyballConfig.positions`
- Line 34: Change validation to accept any position codes from config

**Example:**
```javascript
class PlayerService {
    constructor(activityConfig, stateManager, eventBus, eloService) {
        this.config = activityConfig;  // NEW
        this.positions = activityConfig.positions;  // CHANGED
    }
}
```

---

### 2.2 EloService
**File:** `src/services/EloService.js`
**Impact:** MEDIUM - Uses position weights

**Volleyball References:**
- Line 3: `import volleyballConfig from '../config/volleyball.js'`
- Line 36: `this.POSITION_WEIGHTS = volleyballConfig.positionWeights`
- Lines 249-250: Uses position weights in `calculateTeamStrength()`

**Changes Needed:**
- Accept config as constructor parameter
- Line 36: Use injected config
- No other changes needed - logic is already generic

---

### 2.3 ComparisonService
**File:** `src/services/ComparisonService.js`
**Impact:** LOW - Only used for iteration

**Volleyball References:**
- Line 11: `import volleyballConfig from '../config/volleyball.js'`
- Line 245: `const positions = volleyballConfig.positionOrder` (in getAllProgress)
- Line 277: Same reference in resetAll method

**Changes Needed:**
- Accept config as constructor parameter
- Replace both references with `this.config.positionOrder`

---

### 2.4 TeamOptimizerService
**File:** `src/services/TeamOptimizerService.js`
**Impact:** MEDIUM - Passes config to optimizer

**Volleyball References:**
- Line 9: `import volleyballConfig from '../config/volleyball.js'`
- Line 16: `this.optimizer = new TeamOptimizerService(volleyballConfig)`
- Line 19: `this.positions = volleyballConfig.positions`

**Changes Needed:**
- Accept config as constructor parameter
- Line 16: Pass injected config to optimizer
- Line 19: Use injected config

---

## 3. Page Layer

### 3.1 SettingsPage
**File:** `src/pages/SettingsPage.js`
**Impact:** HIGH - Renders position UI

**Volleyball References:**
- Line 13: `import volleyballConfig from '../config/volleyball.js'`
- Line 99-150: `renderPositionCheckboxes()` method uses volleyball positions
- Line 144: `const positions = playerService.positions`

**Changes Needed:**
- Accept config as constructor parameter (via props)
- Pass config to `renderPositionCheckboxes()`
- Use config for position rendering

---

### 3.2 ComparePage
**File:** `src/pages/ComparePage.js`
**Impact:** MEDIUM - Position selector dropdown

**Volleyball References:**
- Line 12: Implicit usage via playerService
- Lines 54-68: Position selector dropdown shows volleyball positions
- Line 73: Progress bars use volleyball positions from playerService

**Changes Needed:**
- Use config passed from app or injected service
- Position selector will automatically use injected config

---

### 3.3 RankingsPage
**File:** `src/pages/RankingsPage.js`
**Impact:** MEDIUM - Ranking display

**Volleyball References:**
- Implicit - Uses playerService.positions
- Line 43: Renders "{positionName}s" (e.g., "Setters")
- Line 32-34: Iterates volleyball positions

**Changes Needed:**
- Minimal - mostly works through playerService
- Ensure playerService uses injected config

---

### 3.4 TeamsPage
**File:** `src/pages/TeamsPage.js`
**Impact:** HIGH - Team composition input

**Volleyball References:**
- Line 12: `import volleyballConfig from '../config/volleyball.js'`
- Line 23: `composition: volleyballConfig.defaultComposition`
- Line 94: `Object.entries(volleyballConfig.positions)` in renderCompositionInputs()

**Changes Needed:**
- Accept config as constructor parameter
- Line 23: Use injected config for default composition
- Line 94: Use injected config for position iteration

---

## 4. Application Layer

### 4.1 Main Application (app.js)
**File:** `src/app.js`
**Impact:** HIGH - Central coordination point

**Volleyball References:**
- Line 33: `import volleyballConfig from './config/volleyball.js'`
- Line 451-459: Event message: `"${data.winner.name} defeats ${data.loser.name} at ${posName}!"`
- Line 589: `getPositionName()` method returns position names from config
- Line 589: `volleyballConfig.positions[pos] || pos`

**Changes Needed:**
- Store volleyballConfig as instance property (injected)
- Line 589: Use `this.config.positions[pos]` instead
- Message is generic, no change needed - just uses position names

---

## 5. Constants Layer

### 5.1 Utils Constants
**File:** `src/utils/constants.js`
**Impact:** LOW - Deprecated, kept for compatibility

**Volleyball References:**
- Lines 18-24: `POSITIONS` constant with volleyball position mapping
- Line 26: `POSITION_KEYS` array

**Changes Needed:**
- These are marked as deprecated
- Can be removed or kept for backwards compatibility
- Not used by main application

---

## 6. Dependency Injection Layer

### 6.1 Service Configuration
**File:** `src/config/services.js`
**Impact:** HIGH - Controls how services are initialized

**Current Issues:**
- Doesn't inject activity config to services
- Services import config directly instead of receiving via DI

**Changes Needed:**
```javascript
// Add activity config as a parameter
export const serviceConfig = (activityConfig) => ({
    eloService: {
        implementation: EloService,
        lifetime: ServiceLifetime.SINGLETON,
        dependencies: ['activityConfig'],
        // NEW: Provide config to factory
        factory: (deps) => new EloService(activityConfig)
    },
    playerService: {
        implementation: PlayerService,
        lifetime: ServiceLifetime.SINGLETON,
        dependencies: ['activityConfig', 'stateManager', 'eventBus', 'eloService'],
        factory: (deps) => new PlayerService(
            activityConfig,
            deps.stateManager,
            deps.eventBus,
            deps.eloService
        )
    },
    // ... etc
});
```

---

## 7. UI/Text References

### 7.1 Hard-coded Volleyball Terms

**In SettingsPage:**
- "Player Management" - generic, keep as is
- "Positions (select all applicable)" - generic, keep as is
- "Position" in checkboxes - generic, keep as is

**In ComparePage:**
- "Select Position to Compare:" - generic, keep as is
- "Comparison Progress" - generic, keep as is

**In RankingsPage:**
- "Player Rankings by Position" - generic, keep as is
- "{positionName}s" in titles - automatic via config

**In TeamsPage:**
- "Create Balanced Teams" - generic, keep as is
- "Team Composition" - generic, keep as is
- "Number of Teams" - generic, keep as is

**In app.js event messages:**
- "Player X defeats Player Y at {positionName}!" - generic (uses config values)

---

## 8. Data Structure References

### 8.1 Player Object Structure

**Current Structure:**
```javascript
{
    id: string,
    name: string,
    positions: string[],  // e.g., ['S', 'OH']
    ratings: {            // e.g., { 'S': 1520, 'OH': 1480 }
        [position]: number
    },
    comparisons: {        // e.g., { 'S': 5, 'OH': 3 }
        [position]: number
    },
    comparedWith: {       // e.g., { 'S': ['John', 'Mary'], 'OH': ['Alice'] }
        [position]: string[]
    },
    createdAt: string
}
```

**Assessment:** COMPLETELY GENERIC - No changes needed!

---

## 9. Configuration Injection Map

### Current State (BEFORE Refactoring)

```
app.js
  ├── imports volleyballConfig ❌
  └── uses directly ❌

ServiceRegistry
  ├── does NOT inject config ❌
  └── services import directly ❌

PlayerService ❌
  ├── imports volleyballConfig
  └── uses for validation

EloService ❌
  ├── imports volleyballConfig
  └── uses for position weights

ComparisonService ❌
  ├── imports volleyballConfig
  └── uses for position iteration

TeamOptimizerService ❌
  ├── imports volleyballConfig
  └── passes to optimizer

SettingsPage ❌
  ├── imports volleyballConfig
  └── uses for position rendering

TeamsPage ❌
  ├── imports volleyballConfig
  └── uses for composition

ComparePage
  └── uses indirectly via services

RankingsPage
  └── uses indirectly via services
```

### Desired State (AFTER Refactoring)

```
app.js
  ├── imports activityConfig ✓
  └── injects to services ✓

ServiceRegistry
  ├── injects config ✓
  └── services receive as parameter ✓

PlayerService ✓
  ├── receives config in constructor
  └── uses for validation

EloService ✓
  ├── receives config in constructor
  └── uses for position weights

ComparisonService ✓
  ├── receives config in constructor
  └── uses for position iteration

TeamOptimizerService ✓
  ├── receives config in constructor
  └── passes to optimizer

SettingsPage ✓
  ├── receives config as prop
  └── uses for position rendering

TeamsPage ✓
  ├── receives config as prop
  └── uses for composition

ComparePage ✓
  └── uses via services (auto)

RankingsPage ✓
  └── uses via services (auto)
```

---

## 10. Summary of Changes Required

### HIGH Priority (Core to sport abstraction)
1. `src/config/volleyball.js` - Rename to `src/config/activity.js` (make generic template)
2. `src/config/services.js` - Modify to accept activityConfig parameter
3. `src/app.js` - Store config and inject to services

### MEDIUM Priority (Service updates)
4. `src/services/PlayerService.js` - Accept config in constructor
5. `src/services/EloService.js` - Accept config in constructor
6. `src/services/TeamOptimizerService.js` - Accept config in constructor
7. `src/services/ComparisonService.js` - Accept config in constructor

### MEDIUM Priority (Page updates)
8. `src/pages/SettingsPage.js` - Accept and use injected config
9. `src/pages/TeamsPage.js` - Accept and use injected config
10. `src/pages/ComparePage.js` - Ensure uses injected service config
11. `src/pages/RankingsPage.js` - Ensure uses injected service config

### LOW Priority (Constants cleanup)
12. `src/utils/constants.js` - Remove deprecated POSITIONS constant

---

## 11. Files NOT Requiring Changes

The following files are already sport-agnostic and require NO changes:

✓ `src/core/StateManager.js` - State structure is generic
✓ `src/core/EventBus.js` - Event system is generic
✓ `src/core/Router.js` - Router is generic
✓ `src/core/StorageAdapter.js` - Storage is generic
✓ `src/core/ServiceRegistry.js` - DI container is generic (just needs config injection)
✓ `src/core/ErrorHandler.js` - Error handling is generic
✓ `src/pages/BasePage.js` - Base page class is generic
✓ `src/components/base/Component.js` - Component base is generic
✓ `src/components/base/Toast.js` - Toast notifications are generic
✓ `src/components/base/Modal.js` - Modal dialogs are generic
✓ `src/components/base/Icons.js` - Icon system is generic
✓ `src/components/base/Button.js` - Button component is generic
✓ `src/utils/csv.js` - CSV utilities are generic
✓ `src/utils/formatters.js` - Formatters are generic
✓ `src/utils/validators.js` - Validators are generic
✓ `src/utils/stringUtils.js` - String utilities are generic
✓ `src/utils/validation.js` - Validation is generic
✓ `src/config/rating.js` - Rating config is already generic!

---

## 12. Refactoring Checklist

### Phase 1: Configuration Foundation
- [ ] Create generic activity config template
- [ ] Update ServiceRegistry to pass config
- [ ] Update app.js to inject config

### Phase 2: Service Updates
- [ ] Update PlayerService constructor
- [ ] Update EloService constructor
- [ ] Update ComparisonService constructor
- [ ] Update TeamOptimizerService constructor

### Phase 3: Page Updates
- [ ] Update SettingsPage to use injected config
- [ ] Update TeamsPage to use injected config
- [ ] Update ComparePage to use service config
- [ ] Update RankingsPage to use service config

### Phase 4: Testing
- [ ] Test with volleyball config
- [ ] Create test config for another sport (e.g., basketball)
- [ ] Verify all positions use config values
- [ ] Test team creation with different compositions

### Phase 5: Cleanup
- [ ] Remove deprecated constants
- [ ] Update documentation
- [ ] Update README

---

## 13. Example Refactoring: PlayerService

### BEFORE
```javascript
import volleyballConfig from '../config/volleyball.js';

class PlayerService {
    constructor() {
        this.positions = volleyballConfig.positions;
        this.DEFAULT_RATING = 1500;
    }

    validate(name, positions) {
        const validPositions = Object.keys(this.positions);  // ❌ Hardcoded
        // ...
    }
}

export default new PlayerService();
```

### AFTER
```javascript
class PlayerService {
    constructor(activityConfig, stateManager, eventBus, eloService) {
        this.config = activityConfig;  // ✓ Injected
        this.positions = activityConfig.positions;  // ✓ From config
        this.DEFAULT_RATING = 1500;
        this.stateManager = stateManager;
        this.eventBus = eventBus;
        this.eloService = eloService;
    }

    validate(name, positions) {
        const validPositions = Object.keys(this.config.positions);  // ✓ From config
        // ...
    }
}

export default PlayerService;  // ✓ Exported as class, not instance
```

---

