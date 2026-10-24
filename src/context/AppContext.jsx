import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { supabase } from '../services/supabaseClient';
import { useAuth } from './AuthContext';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  const [matches, setMatches] = useState([]);
  const [loadingMatches, setLoadingMatches] = useState(true);
  const [matchesError, setMatchesError] = useState(false);
  const { user } = useAuth();

  const loadGlobalData = useCallback(async () => {
    if (!user) {
      setMatches([]);
      setLoadingMatches(false);
      return;
    }
    try {
      const userMatches = await api.getUserMatches(user.id);
      setMatches(userMatches);
      setMatchesError(false);
    } catch (error) {
      console.error("Failed to load matches", error);
      // Pages show "couldn't load" instead of "no chats yet"; matches already on screen stay.
      setMatchesError(true);
    } finally {
      setLoadingMatches(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadGlobalData();

    if (supabase && user?.id) {
      const channel = supabase
        .channel(`user_matches_realtime_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'matches',
            filter: `user_id=eq.${user.id}`
          },
          () => {
            loadGlobalData();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id, loadGlobalData]);

  // Function to handle a new right swipe
  const addMatch = useCallback(async (animalId, userId) => {
    try {
      const newMatch = await api.submitMatchRequest(animalId, userId);
      setMatches(prev => {
        // Prevent duplicate match in UI state
        if (prev.some(m => m.id === newMatch.id || (m.animalId === animalId && m.user_id === userId))) {
          return prev;
        }
        return [newMatch, ...prev];
      });
      return newMatch;
    } catch (error) {
      console.error("Failed to submit match", error);
      // Callers show the verification prompt instead of a generic "try again"
      if (error?.code === 'NOT_VERIFIED') return { notVerified: true };
      return null;
    }
  }, []);

  const refreshMatches = useCallback(() => {
    return loadGlobalData();
  }, [loadGlobalData]);

  // "Try again" after a failed load: show the loading skeleton while it retries
  const retryMatches = useCallback(() => {
    setLoadingMatches(true);
    return loadGlobalData();
  }, [loadGlobalData]);

  const value = React.useMemo(() => ({
    matches,
    loadingMatches,
    matchesError,
    addMatch,
    refreshMatches,
    retryMatches
  }), [matches, loadingMatches, matchesError, addMatch, refreshMatches, retryMatches]);

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
