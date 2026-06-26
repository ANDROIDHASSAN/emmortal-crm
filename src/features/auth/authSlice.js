import { createSlice } from '@reduxjs/toolkit';

const authSlice = createSlice({
  name: 'auth',
  initialState: { user: null, ready: false },
  reducers: {
    setUser(state, action) { state.user = action.payload; state.ready = true; },
    clearUser(state) { state.user = null; state.ready = true; },
    setReady(state) { state.ready = true; },
  },
});

export const { setUser, clearUser, setReady } = authSlice.actions;
export const selectUser = (s) => s.auth.user;
export const selectReady = (s) => s.auth.ready;
export default authSlice.reducer;
