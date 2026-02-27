# Angular 20 and 21 Breaking Changes Analysis

## Environment Verification

### Current Environment
- Node.js: v22.14.0 ✅ (meets Angular 21 requirement: 20.11+ or 22.0+)
- TypeScript: 5.6.3 (needs upgrade to 5.7+ for Angular 21)
- Angular: 19.2.18 (upgrading to 21.x.x)

### Target Requirements
- Node.js: 20.11+ or 22.0+ ✅ Already compliant
- TypeScript: 5.7+ (Angular 21 requirement)
- Angular: 21.x.x

---

## Angular 20 Breaking Changes

### 1. TypeScript and Node.js Requirements
- **TypeScript 5.8+ required** (we have 5.6.3, needs upgrade)
- **Node.js 20+ required** (we have 22.14.0 ✅)
- **Impact**: Medium - TypeScript upgrade needed

### 2. Structural Directives Deprecated
- `*ngIf`, `*ngFor`, `*ngSwitch` officially deprecated
- Replacement: Control flow syntax (`@if`, `@for`, `@switch`)
- **Impact**: Low - Migration schematic available
- **Action**: Run control flow migration during `ng update`

### 3. TestBed.get() Removed
- Deprecated since Angular v9, now removed
- Replacement: `TestBed.inject()`
- **Impact**: Low - Automatic migration available
- **Action**: Migration runs automatically during `ng update`

### 4. Package Changes
- `@angular/platform-browser-dynamic` deprecated → use `@angular/platform-browser`
- `DOCUMENT` token moved from `@angular/common` to `@angular/core`
- **Impact**: Low - Migrations available
- **Action**: Update imports manually or via migration

### 5. HammerJS Integration Deprecated
- HammerJS not updated in 8 years
- **Impact**: Low - Only if using HammerJS gestures
- **Action**: Remove HammerJS if not needed

### 6. ng-reflect-* Attributes Removed
- Debug attributes removed by default in dev mode
- **Impact**: Very Low - Only if relying on these attributes
- **Action**: Use `provideNgReflectAttributes()` if needed

### 7. Signal APIs Stabilized
- `effect()`, `toSignal()`, `toObservable()`, `linkedSignal()` now stable
- `afterRender()` renamed to `afterEveryRender()`
- **Impact**: Low - Mostly improvements
- **Action**: Update `afterRender()` calls if used

### 8. Zoneless Change Detection
- `provideExperimentalZonelessChangeDetection` → `provideZonelessChangeDetection`
- **Impact**: Low - Only if using zoneless
- **Action**: Update provider name if used

### 9. Build System Changes
- Default builder: `@angular/build` instead of `@angular-devkit/build-angular`
- Karma no longer included by default
- **Impact**: Medium - Build configuration changes
- **Action**: Migration updates angular.json automatically

### 10. Testing Changes
- `fixture.autoDetectChanges(false)` throws in zoneless tests
- Errors in event listeners now reported to error handler
- **Impact**: Low - May reveal previously hidden test errors
- **Action**: Fix revealed test errors

---

## Angular 21 Breaking Changes

### 1. TypeScript 5.7+ Required
- Angular 21 requires TypeScript 5.7 or higher
- **Impact**: Medium - Must upgrade TypeScript
- **Action**: Update TypeScript to 5.7+ during Angular 21 migration

### 2. Zoneless Mode Default
- Zoneless change detection becomes default in new projects
- **Impact**: Low - Existing projects not affected
- **Action**: No action needed for existing projects

### 3. HttpClient Automatic
- HttpClient automatically provided in new projects
- **Impact**: Very Low - Existing projects not affected
- **Action**: No action needed

### 4. Karma Removal
- Karma completely removed from new projects
- Vitest or Jest recommended as replacements
- **Impact**: Low - Existing Karma setups still work
- **Action**: Consider migrating to Vitest (optional)

### 5. Style Guide Changes
- File naming convention changes (component.ts → user.ts)
- Class naming changes (UserComponent → User)
- **Impact**: Low - Existing projects not affected
- **Action**: Migration adds config to preserve old naming

---

## Breaking Changes Affecting This Codebase

### High Priority (Must Address)

1. **TypeScript Upgrade**
   - Current: 5.6.3
   - Required: 5.7+ for Angular 21
   - Files affected: All TypeScript files
   - Action: Update package.json and verify compilation

2. **TestBed.get() Removal**
   - Search codebase for `TestBed.get(` usage
   - Replace with `TestBed.inject()`
   - Action: Automatic migration during ng update

### Medium Priority (Should Address)

3. **Structural Directives**
   - Search for `*ngIf`, `*ngFor`, `*ngSwitch` usage
   - Migrate to control flow syntax
   - Action: Run control flow migration schematic

4. **Build Configuration**
   - Update angular.json to use @angular/build
   - Action: Automatic migration during ng update

### Low Priority (Optional)

5. **Package Imports**
   - Update `@angular/platform-browser-dynamic` imports
   - Update `DOCUMENT` token imports
   - Action: Manual or via migration

6. **Signal APIs**
   - Update `afterRender()` to `afterEveryRender()` if used
   - Action: Search and replace if used

---

## Migration Strategy

### Phase 1: Angular 19 → 20
1. Run `ng update @angular/core@20 @angular/cli@20`
2. Apply automatic migrations (TestBed.get, DOCUMENT, etc.)
3. Run control flow migration (optional but recommended)
4. Update TypeScript to 5.8 if needed
5. Fix any compilation errors
6. Run tests and fix failures
7. Verify build succeeds

### Phase 2: Angular 20 → 21
1. Run `ng update @angular/core@21 @angular/cli@21`
2. Update TypeScript to 5.7+
3. Apply automatic migrations
4. Fix any compilation errors
5. Run tests and fix failures
6. Verify build succeeds

---

## Potential Issues for This Codebase

### 1. Test Suite
- **Risk**: TestBed.get() usage may exist
- **Mitigation**: Automatic migration available
- **Verification**: Run full test suite after migration

### 2. Structural Directives
- **Risk**: Heavy use of *ngIf, *ngFor, *ngSwitch
- **Mitigation**: Control flow migration available
- **Verification**: Visual testing after migration

### 3. Third-Party Libraries
- **Risk**: @fortawesome/angular-fontawesome@1.0.0 may need update
- **Mitigation**: Check compatibility, update if needed
- **Verification**: Test icon rendering after upgrade

### 4. NgRx Compatibility
- **Risk**: NgRx 19.2.1 needs update to 21.x.x
- **Mitigation**: Update NgRx alongside Angular
- **Verification**: Test all store interactions

### 5. Build Configuration
- **Risk**: Custom angular.json configuration may conflict
- **Mitigation**: Review migration changes carefully
- **Verification**: Test all build configurations (dev, prod)

---

## Recommended Actions

### Before Migration
- [x] Establish baseline (tests, build, dependencies)
- [x] Document current versions
- [ ] Review this breaking changes document
- [ ] Verify Node.js version (✅ 22.14.0)
- [ ] Backup current working state

### During Angular 20 Migration
- [ ] Run ng update with migrations
- [ ] Review and test each migration
- [ ] Update TypeScript if needed
- [ ] Fix compilation errors
- [ ] Fix test failures
- [ ] Verify build succeeds

### During Angular 21 Migration
- [ ] Update TypeScript to 5.7+
- [ ] Run ng update with migrations
- [ ] Fix compilation errors
- [ ] Fix test failures
- [ ] Verify build succeeds

### After Migration
- [ ] Run full test suite
- [ ] Compare bundle sizes to baseline
- [ ] Manual testing of critical features
- [ ] Update documentation
- [ ] Commit changes

---

## References

- [Angular 20 Release Notes](https://blog.ninja-squad.com/2025/05/28/what-is-new-angular-20.0/)
- [Angular 21 Migration Guide](https://www.yeou.dev/articulos/angular21-upgrade)
- [Angular Official Docs](https://angular.dev)
- [TypeScript 5.7 Release Notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-7.html)
- [TypeScript 5.8 Release Notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-8.html)

---

## Conclusion

The upgrade from Angular 19 to 21 is relatively straightforward with good migration support. The main breaking changes are:

1. TypeScript version requirements (5.8 for Angular 20, 5.7+ for Angular 21)
2. TestBed.get() removal (automatic migration)
3. Structural directives deprecation (optional migration)
4. Build system changes (automatic migration)

Our codebase is well-positioned for this upgrade:
- ✅ Node.js 22.14.0 already meets requirements
- ✅ All tests passing (1660/1660)
- ✅ Clean baseline established
- ⚠️ TypeScript needs upgrade (5.6.3 → 5.7+)
- ⚠️ Third-party libraries need compatibility check

Risk Level: **Low to Medium**
- Most changes have automatic migrations
- Incremental upgrade path (19 → 20 → 21) minimizes risk
- Strong test coverage provides safety net
