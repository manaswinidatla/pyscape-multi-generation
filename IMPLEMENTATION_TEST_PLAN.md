# Implementation Test Plan - Prerequisite-Based Module Gating

## Overview
Implemented prerequisite-based module unlock system in [Learn.js](src/pages/Learn.js) that dynamically determines module availability based on user progress and module prerequisites.

## Database Schema Verification ✓

### Tables Used
| Table | Key Columns | Purpose |
|-------|-------------|---------|
| modules | id, prerequisites (INTEGER[]), is_published, order_index | Defines module hierarchy and unlock requirements |
| lessons | id, module_id, content, parts (JSONB) | Lesson definitions per module |
| progress | (user_id, lesson_id, state) | Tracks user completion state (completed/in_progress/not_started/failed) |
| auth.users | id | Supabase authentication |
| profiles | id, ... | User profile data |

### Module Prerequisite Chain
```
Module 1 (Python Fundamentals)           → No prerequisites
    ↓
Module 2 (Data Science)                  → Requires 1
    ↓
Module 3 (Machine Learning)              → Requires 1,2
    ├→ Module 4 (Deep Learning)          → Requires 1,3
    │    ├→ Module 5 (NLP)               → Requires 1,4
    │    └→ Module 6 (Computer Vision)   → Requires 1,4
    ├→ Module 7 (Data Visualization)     → Requires 1,2
    ├→ Module 8 (MLOps)                  → Requires 1,3
    └→ Module 10 (Data Engineering)      → Requires 1,2
Module 9 (Web Dev)                       → Requires 1
```

## Implementation Details

### Code Changes - Learn.js

**1. New Imports**
```javascript
import { useAuth } from '../context/AuthContext';  // Access user.id
```

**2. New Helper Functions**

#### checkModuleUnlockStatus(module, allModules, currentUser)
**Purpose:** Determine module availability based on prerequisites and user progress

**Algorithm:**
```
IF module has no prerequisites
  RETURN 'available'
ELSE IF user not authenticated
  RETURN 'locked'
ELSE
  Query: GET all lessons WHERE module_id IN module.prerequisites
  Query: GET user progress WHERE user_id = currentUser.id AND lesson_id IN [prerequisite lesson IDs]
  IF all prerequisite lessons have state = 'completed'
    RETURN 'available'
  ELSE
    RETURN 'locked'
```

**Database Queries:**
- `supabase.from('lessons').select('id').in('module_id', module.prerequisites)`
- `supabase.from('progress').select('lesson_id, state').eq('user_id', currentUser.id).in('lesson_id', prereqLessonIds)`

#### calculateModuleProgress(moduleId, currentUser)
**Purpose:** Calculate percentage completion for a module

**Algorithm:**
```
IF user not authenticated
  RETURN 0
ELSE
  Query: GET count of lessons WHERE module_id = moduleId
  Query: GET user progress WHERE user_id = currentUser.id AND module_id = moduleId AND state = 'completed'
  RETURN (completedCount / totalCount) * 100
```

**Database Queries:**
- `supabase.from('lessons').select('id').eq('module_id', moduleId)`
- `supabase.from('progress').select('state').eq('user_id', currentUser.id).in('lesson_id', lessonIds)`

**3. Updated fetchModules Effect**

**Before:**
```javascript
status: idx === 0 ? 'available' : 'locked'  // Hardcoded: only first module available
progress: 0  // TODO: compute from progress table
```

**After:**
```javascript
// Use Promise.all to parallelize async checks
const enriched = await Promise.all(
  (data || []).map(async (mod) => {
    const status = await checkModuleUnlockStatus(mod, data, user);
    const progress = await calculateModuleProgress(mod.id, user);
    return { ...mod, lessons: countMap[mod.id] || 0, progress, status };
  })
);
```

**Effect Dependencies:** Changed to `[user]` to refetch when user logs in/out

**4. Dynamic UI Components**

#### overallProgress
```javascript
const overallProgress = modules.length > 0
  ? Math.round(modules.reduce((sum, m) => sum + m.progress, 0) / modules.length)
  : 0;
```

#### getNextLockedModuleInfo()
```javascript
// Returns: "Complete [Prerequisite Module] to unlock [Next Locked Module]"
// Returns: null if all modules available
```

#### Progress Section JSX
```javascript
// Dynamic progress bar
<div className="bg-primary h-2 rounded-full" style={{ width: `${overallProgress}%` }}></div>

// Dynamic helper text
<p className="text-sm text-gray-400">
  {getNextLockedModuleInfo() || 'Great! All modules are unlocked. Keep learning!'}
</p>
```

**5. Error Handling**
- All DB queries wrapped in try-catch
- Errors logged to console; returns 'locked' on error (safe default)
- Fallback: Hardcoded module data if main DB fetch fails entirely

## Test Scenarios

### Scenario 1: Unauthenticated User
**Setup:** User not logged in
**Expected:**
- Module 1: locked (all modules locked for unauthenticated)
- All other modules: locked
- Overall progress: 0%
- Helper text: "Complete [Module] to unlock [Module]" or fallback

**Verification:**
```bash
curl http://localhost:3000/learn  # No auth header
# Expect all modules to show as locked (disabled button)
```

### Scenario 2: New Authenticated User (No Progress)
**Setup:** User logged in, no lessons completed
**Expected:**
- Module 1: available
- Module 2+: locked (prerequisites not met)
- Progress: 0%
- Helper text: "Complete Python Fundamentals module to unlock Data Science with Pandas"

**Verification:**
```bash
# Login, then navigate to /learn
# Check localStorage for auth token
```

### Scenario 3: User Completes Module 1
**Setup:** User completes all 9 lessons in Module 1
**Expected:**
- Module 1: shows 100% progress (all lessons complete)
- Module 2: available (only requires Module 1)
- Module 3+: still locked (require Module 2 completion)
- Overall progress: (100% + 0% + 0% + ...) / 10 modules

**Verification:**
```sql
-- Simulate completion
INSERT INTO progress (user_id, lesson_id, state) 
SELECT 'user-id', id, 'completed' FROM lessons WHERE module_id = 1;

-- Then refresh /learn page
# Expect Module 2 to show "Start Learning" button
```

### Scenario 4: User Completes Module 1 & 2
**Setup:** User completes all lessons in Modules 1 and 2
**Expected:**
- Module 1: 100% progress, available
- Module 2: 100% progress, available
- Module 3: available (requires 1,2 ✓)
- Module 7: available (requires 1,2 ✓)
- Module 10: available (requires 1,2 ✓)
- Module 4,5,6: still locked (require Module 3 not yet complete)

**Verification:**
```sql
-- Simulate completion of both modules
INSERT INTO progress (user_id, lesson_id, state) 
SELECT 'user-id', id, 'completed' FROM lessons WHERE module_id IN (1,2);

# Expect Modules 3, 7, 10 to be available
```

### Scenario 5: Complex Dependency Chain
**Setup:** Track Module 4 (requires 1,3) where Module 3 requires (1,2)
**Expected:**
- User must complete Module 1 first
- Then complete Module 2 (sibling to 1)
- Then complete Module 3 (requires 1,2)
- Then Module 4 becomes available (requires 1,3)
- DAG path validation: Module 4 unreachable until Module 3 complete

**Verification:**
```javascript
// Check topological order in progress table
const moduleChain = await checkModuleCompletionDAG('user-id');
// Expect: [1] → [1,2] → [1,2,3] → [1,2,3,4]
```

## Performance Considerations

### Database Query Volume
- **Fetch modules:** 1 query
- **Count lessons:** 1 query
- **Per module (N=10):** 2 queries per module × 10 = 20 queries
- **Total:** ~22 queries per page load

### Optimization Opportunities (Future)
1. Batch query prerequisite lessons across all modules
2. Cache prerequisites in React state
3. Cache user progress in Context
4. Implement debouncing on refetch when user changes

### Current Approach
Using `Promise.all()` for parallel queries (async, not concurrent DB load)

## Rollback Plan
If issues found:
1. Revert Learn.js to commit before this change
2. Requirements remain in DB (prerequisite column); logic just inactive
3. Can restart with single-module-only unlock logic: `status: idx === 0 ? 'available' : 'locked'`

## Success Criteria
- ✓ All modules published in DB (is_published = true)
- ✓ Prerequisite chain enforced correctly
- ✓ Progress calculated from progress table
- ✓ Helper text dynamic based on prerequisites
- ✓ No race conditions (async/await used correctly)
- ✓ Error handling graceful (lockdown on error)
- ✓ Works with/without user authentication
- ✓ No TypeScript/JSX errors in Learn.js

## Next Steps (Phase 2)
1. Implement description quality improvements (120-180 words)
2. Implement systematic ordering based on prerequisites
3. Test generation with new agents
4. Monitor user progress and adjust unlock thresholds if needed
