import React, { createContext, useContext, useMemo, useReducer } from 'react'

const QueryContext = createContext(null)

const initialState = {
  history: [],
  recentSql: '',
  lastQuery: '',
  lastDuration: null,
}

const reducer = (state, action) => {
  switch (action.type) {
    case 'ADD_HISTORY': {
      const updatedHistory = [action.payload, ...state.history].slice(0, 20)
      return { ...state, history: updatedHistory }
    }
    case 'SET_RECENT_SQL':
      return { ...state, recentSql: action.payload }
    case 'SET_LAST_QUERY':
      return { ...state, lastQuery: action.payload }
    case 'SET_LAST_DURATION':
      return { ...state, lastDuration: action.payload }
    default:
      return state
  }
}

export const QueryProvider = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState)

  const value = useMemo(
    () => ({
      history: state.history,
      recentSql: state.recentSql,
      lastQuery: state.lastQuery,
      lastDuration: state.lastDuration,
      addHistoryEntry: (entry) => dispatch({ type: 'ADD_HISTORY', payload: entry }),
      setRecentSql: (sql) => dispatch({ type: 'SET_RECENT_SQL', payload: sql }),
      setLastQuery: (query) => dispatch({ type: 'SET_LAST_QUERY', payload: query }),
      setLastDuration: (duration) => dispatch({ type: 'SET_LAST_DURATION', payload: duration }),
    }),
    [state.history, state.lastDuration, state.lastQuery, state.recentSql],
  )

  return <QueryContext.Provider value={value}>{children}</QueryContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useQueryContext = () => {
  const context = useContext(QueryContext)
  if (!context) {
    throw new Error('useQueryContext must be used within QueryProvider')
  }
  return context
}
