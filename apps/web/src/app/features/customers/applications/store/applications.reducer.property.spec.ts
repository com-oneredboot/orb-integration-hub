/**
 * Applications Reducer Property Tests
 *
 * Property-based tests for applications reducer using fast-check.
 * Validates universal correctness properties across all valid inputs.
 *
 * @see .kiro/specs/applications-management/design.md
 */

import * as fc from 'fast-check';
import { ApplicationsActions } from './applications.actions';
import { applicationsReducer } from './applications.reducer';
import { initialApplicationsState } from './applications.state';
import * as selectors from './applications.selectors';

describe('Applications Reducer Property Tests', () => {
  describe('Property 10: Store Error Persistence', () => {
    /**
     * Feature: applications-management, Property 10: Store Error Persistence
     * **Validates: Requirements 5.5**
     *
     * For any failed action, the error message SHALL be stored in the state
     * and accessible via the error selector.
     */
    it('loadApplicationsFailure should persist error message (100 iterations)', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 200 }), (errorMessage) => {
          const action = ApplicationsActions.loadApplicationsFailure({
            error: errorMessage,
          });
          const state = applicationsReducer(initialApplicationsState, action);

          // Error should be stored in state
          const storedError = selectors.selectError.projector(state);
          return storedError === errorMessage;
        }),
        { numRuns: 100 }
      );
    });

    it('createDraftApplicationFailure should persist saveError message (100 iterations)', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 200 }), (errorMessage) => {
          const action = ApplicationsActions.createDraftApplicationFailure({
            error: errorMessage,
          });
          const state = applicationsReducer(initialApplicationsState, action);

          // Save error should be stored in state
          const storedError = selectors.selectSaveError.projector(state);
          return storedError === errorMessage;
        }),
        { numRuns: 100 }
      );
    });

    it('createApplicationFailure should persist saveError message (100 iterations)', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 200 }), (errorMessage) => {
          const action = ApplicationsActions.createApplicationFailure({
            error: errorMessage,
          });
          const state = applicationsReducer(initialApplicationsState, action);

          const storedError = selectors.selectSaveError.projector(state);
          return storedError === errorMessage;
        }),
        { numRuns: 100 }
      );
    });

    it('updateApplicationFailure should persist saveError message (100 iterations)', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 200 }), (errorMessage) => {
          const action = ApplicationsActions.updateApplicationFailure({
            error: errorMessage,
          });
          const state = applicationsReducer(initialApplicationsState, action);

          const storedError = selectors.selectSaveError.projector(state);
          return storedError === errorMessage;
        }),
        { numRuns: 100 }
      );
    });

    it('deleteApplicationFailure should persist deleteError message (100 iterations)', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 200 }), (errorMessage) => {
          const action = ApplicationsActions.deleteApplicationFailure({
            error: errorMessage,
          });
          const state = applicationsReducer(initialApplicationsState, action);

          const storedError = selectors.selectDeleteError.projector(state);
          return storedError === errorMessage;
        }),
        { numRuns: 100 }
      );
    });

    it('clearErrors should clear all error types (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          fc.string({ minLength: 1, maxLength: 100 }),
          (error, saveError, deleteError) => {
            // Set up state with errors
            const stateWithErrors = {
              ...initialApplicationsState,
              error,
              saveError,
              deleteError,
            };

            const action = ApplicationsActions.clearErrors();
            const state = applicationsReducer(stateWithErrors, action);

            // All errors should be cleared
            return (
              selectors.selectError.projector(state) === null &&
              selectors.selectSaveError.projector(state) === null &&
              selectors.selectDeleteError.projector(state) === null
            );
          }
        ),
        { numRuns: 100 }
      );
    });

    it('selectHasAnyError should detect any error in state (100 iterations)', () => {
      fc.assert(
        fc.property(
          fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
          fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
          fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: null }),
          (error, saveError, deleteError) => {
            const hasAnyError = selectors.selectHasAnyError.projector(
              error,
              saveError,
              deleteError
            );

            const expected = !!error || !!saveError || !!deleteError;
            return hasAnyError === expected;
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Loading State Consistency', () => {
    it('failure actions should set loading states to false (100 iterations)', () => {
      fc.assert(
        fc.property(fc.string({ minLength: 1, maxLength: 100 }), (errorMessage) => {
          // Start with loading state
          const loadingState = {
            ...initialApplicationsState,
            isLoading: true,
            isSaving: true,
            isDeleting: true,
            isCreatingNew: true,
          };

          // Test loadApplicationsFailure
          const afterLoadFail = applicationsReducer(
            loadingState,
            ApplicationsActions.loadApplicationsFailure({ error: errorMessage })
          );

          // Test createDraftApplicationFailure
          const afterCreateDraftFail = applicationsReducer(
            loadingState,
            ApplicationsActions.createDraftApplicationFailure({ error: errorMessage })
          );

          // Test updateApplicationFailure
          const afterUpdateFail = applicationsReducer(
            loadingState,
            ApplicationsActions.updateApplicationFailure({ error: errorMessage })
          );

          // Test deleteApplicationFailure
          const afterDeleteFail = applicationsReducer(
            loadingState,
            ApplicationsActions.deleteApplicationFailure({ error: errorMessage })
          );

          return (
            afterLoadFail.isLoading === false &&
            afterCreateDraftFail.isCreatingNew === false &&
            afterUpdateFail.isSaving === false &&
            afterDeleteFail.isDeleting === false
          );
        }),
        { numRuns: 100 }
      );
    });
  });
});
