// Create a new file: debug.meta-reducer.ts
import { ActionReducer } from '@ngrx/store';

export function debug(reducer: ActionReducer<any>): ActionReducer<any> {
  return function(state, action) {
    console.debug('state', state);
    console.debug('action', action);

    const nextState = reducer(state, action);

    console.debug('next state', nextState);

    return nextState;
  };
}
