import React, { createContext, useState, useEffect, useContext } from 'react';
import { useApp } from './AppContext.jsx';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const LOCAL_STORAGE_KEYS = {
  PROFILES: 'calcallegro_profiles',
  ACTIVE_PROFILE_ID: 'calcallegro_active_profile_id',
};

const hashPin = async (pin) => {
  const enc = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', enc.encode(pin));
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
};

export const AuthProvider = ({ children }) => {
  const { setToast } = useApp();

  const [profiles, setProfiles] = useState(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.PROFILES);
    return saved ? JSON.parse(saved) : [];
  });
  const [activeProfileId, setActiveProfileId] = useState(() => localStorage.getItem(LOCAL_STORAGE_KEYS.ACTIVE_PROFILE_ID) || '');
  const [isUnlocked, setIsUnlocked] = useState(false);

  const [profileAuthMode, setProfileAuthMode] = useState(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.PROFILES);
    return saved && JSON.parse(saved).length ? 'login' : 'signup';
  });
  const [selectedProfileId, setSelectedProfileId] = useState(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEYS.ACTIVE_PROFILE_ID);
    if (saved) return saved;
    const profilesSaved = localStorage.getItem(LOCAL_STORAGE_KEYS.PROFILES);
    const parsed = profilesSaved ? JSON.parse(profilesSaved) : [];
    return parsed[0]?.id || '';
  });

  const activeProfile = profiles.find(profile => profile.id === activeProfileId) || null;

  const saveProfiles = (nextProfiles) => {
    setProfiles(nextProfiles);
    localStorage.setItem(LOCAL_STORAGE_KEYS.PROFILES, JSON.stringify(nextProfiles));
  };

  useEffect(() => {
    if (activeProfileId) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.ACTIVE_PROFILE_ID, activeProfileId);
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.ACTIVE_PROFILE_ID);
    }
  }, [activeProfileId]);

  useEffect(() => {
    if (!selectedProfileId && profiles.length > 0) {
      setSelectedProfileId(profiles[0].id);
    }
  }, [profiles, selectedProfileId]);

  const handleCreateProfile = async (name, pin, pinConfirm, key) => {
    if (!name) {
      setToast({ message: 'Podaj nazwę profilu', type: 'error', visible: true }); return false;
    }
    if (!pin || pin.length < 4) {
      setToast({ message: 'PIN musi mieć co najmniej 4 cyfry', type: 'error', visible: true }); return false;
    }
    if (pin !== pinConfirm) {
      setToast({ message: 'PINy nie są zgodne', type: 'error', visible: true }); return false;
    }
    // TODO: Key validation should be done on the server side.
    const hash = await hashPin(pin);
    const newProfile = { id: Date.now().toString(), name, pinHash: hash, accessKey: key, createdAt: new Date().toISOString() };
    const nextProfiles = [newProfile, ...profiles];
    saveProfiles(nextProfiles);
    setActiveProfileId(newProfile.id);
    setSelectedProfileId(newProfile.id);
    setIsUnlocked(true);
    setProfileAuthMode('login');
    setToast({ message: `Profil ${name} został utworzony`, type: 'success', visible: true });
    return true;
  };

  const handleLoginProfile = async (profileId, pin) => {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) {
      setToast({ message: 'Wybierz profil do zalogowania', type: 'error', visible: true }); return;
    }
    if (!pin || pin.length < 4) {
      setToast({ message: 'Podaj prawidłowy PIN do profilu', type: 'error', visible: true }); return;
    }
    const hash = await hashPin(pin);
    if (hash === profile.pinHash) {
      setActiveProfileId(profile.id);
      setIsUnlocked(true);
      setToast({ message: `Zalogowano jako ${profile.name}`, type: 'success', visible: true });
    } else {
      alert('Nieprawidłowy PIN');
    }
  };

  const handleSwitchProfile = async (profileId, pin) => {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) {
      setToast({ message: 'Nie znaleziono wybranego profilu', type: 'error', visible: true }); return false;
    }
    if (!pin || pin.length < 4) {
      setToast({ message: 'Podaj PIN do profilu, na który chcesz się przełączyć', type: 'error', visible: true }); return false;
    }
    const hash = await hashPin(pin);
    if (hash === profile.pinHash) {
      setActiveProfileId(profile.id);
      setIsUnlocked(true);
      setToast({ message: `Przełączono na profil ${profile.name}`, type: 'success', visible: true });
      return true;
    } else {
      alert('Nieprawidłowy PIN profilu');
      return false;
    }
  };

  const handleApplyChangePin = async (currentPin, newPin, confirmPin) => {
    if (!currentPin || !newPin) {
      setToast({ message: 'Wypełnij wszystkie pola PIN', type: 'error', visible: true }); return false;
    }
    if (newPin.length < 4) {
      setToast({ message: 'Nowy PIN musi mieć co najmniej 4 cyfry', type: 'error', visible: true }); return false;
    }
    if (newPin !== confirmPin) {
      setToast({ message: 'Nowe PINy nie są zgodne', type: 'error', visible: true }); return false;
    }
    if (!activeProfile) {
      setToast({ message: 'Brak aktywnego profilu do zmiany PINu', type: 'error', visible: true }); return false;
    }

    const currentHash = await hashPin(currentPin);
    if (currentHash !== activeProfile.pinHash) {
      setToast({ message: 'Błędny bieżący PIN', type: 'error', visible: true }); return false;
    }

    const newHash = await hashPin(newPin);
    const nextProfiles = profiles.map(p => p.id === activeProfile.id ? { ...p, pinHash: newHash } : p);
    saveProfiles(nextProfiles);

    setToast({ message: 'PIN został pomyślnie zmieniony', type: 'success', visible: true });
    return true;
  };

  const logout = () => {
    setIsUnlocked(false);
  };

  const value = {
    profiles, activeProfile, activeProfileId, isUnlocked, logout,
    profileAuthMode, setProfileAuthMode, selectedProfileId, setSelectedProfileId,
    handleCreateProfile, handleLoginProfile, handleSwitchProfile, handleApplyChangePin
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};