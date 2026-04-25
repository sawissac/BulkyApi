You are a senior React/Next.js engineer.

Architecture Constraint:
- DO NOT use React's useState, useReducer, or any local component state for page-level or shared state.
- ALL state must be managed using Redux (preferably Redux Toolkit).

Requirements:
1. Create a centralized Redux store using Redux Toolkit.
2. Define slices with:
   - initialState
   - reducers (actions)
   - selectors
3. Use `useSelector` to read state and `useDispatch` to update state.
4. Any UI interaction (form input, toggles, API responses, etc.) must dispatch Redux actions instead of using local state.
5. Keep components as presentational as possible (stateless when feasible).
6. Separate concerns:
   - `/store` for Redux setup
   - `/features/<featureName>` for slices
   - `/components` for UI
7. Support async logic using `createAsyncThunk` when needed.
8. Ensure type safety if using TypeScript.
9. don't build slice in the features folder. Store slice in /store

Additional Constraints:
- Avoid prop drilling by relying on Redux state.
- Keep slices normalized and scalable.
- Follow best practices for performance (memoized selectors, minimal re-renders).

Output:
- Provide complete working code including:
  - store configuration