import { createSlice } from '@reduxjs/toolkit';

type Theme = 'light' | 'dark';
type Density = 'confortavel' | 'compacto';

interface PreferencesState {
  theme: Theme;
  density: Density;
}

const initialState: PreferencesState = {
  theme: 'dark',
  density: 'confortavel'
};

const preferencesSlice = createSlice({
  name: 'preferences',
  initialState,
  reducers: {
    toggleTheme(state) {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
    },
    setDensity(state, action: { payload: Density }) {
      state.density = action.payload;
    }
  }
});

export const { toggleTheme, setDensity } = preferencesSlice.actions;
export default preferencesSlice.reducer;
