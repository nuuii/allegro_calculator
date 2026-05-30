/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect, useContext } from 'react';
import { useApp } from './AppContext.jsx';

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const LOCAL_STORAGE_KEYS = {
  PROFILES: 'calcallegro_profiles',
  ACTIVE_PROFILE_ID: 'calcallegro_active_profile_id',
};

const BOOTSTRAP_ADMIN_NAME = 'bartek';
const BOOTSTRAP_ADMIN_ACCESS_KEY_HASH = '1e79a2b179a943451f568f2b5c71d800231aed4e92bdeb1b5a56dbc4b91891cd';

const isBootstrapAdminProfile = (profile) => (
  profile?.name?.trim().toLowerCase() === BOOTSTRAP_ADMIN_NAME &&
  (profile?.accessKeyHash === BOOTSTRAP_ADMIN_ACCESS_KEY_HASH || Boolean(profile?.accessKey))
);

const normalizeProfile = (profile) => {
  const bootstrapAdmin = isBootstrapAdminProfile(profile);
  const adminEnabled = bootstrapAdmin || profile?.role === 'admin' || profile?.permissions?.admin === true;

  return {
    ...profile,
    role: adminEnabled ? 'admin' : (profile?.role || 'user'),
    permissions: {
      ...(profile?.permissions || {}),
      admin: adminEnabled,
    },
  };
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
    return saved ? JSON.parse(saved).map(normalizeProfile) : [];
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
  const isAdmin = Boolean(activeProfile?.permissions?.admin || activeProfile?.role === 'admin' || isBootstrapAdminProfile(activeProfile));

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
    const keyValidationResponse = await fetch('/api/access-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessKey: key, profileName: name }),
    });
    const keyValidation = await keyValidationResponse.json().catch(() => ({}));

    if (!keyValidationResponse.ok || !keyValidation.success) {
      setToast({ message: keyValidation.error || 'Nie udało się zweryfikować klucza dostępu', type: 'error', visible: true });
      return false;
    }

    const hash = await hashPin(pin);
    const newProfile = normalizeProfile({
      id: Date.now().toString(),
      name,
      pinHash: hash,
      accessKeyHash: keyValidation.data.accessKeyHash,
      accessKeyUsedAt: keyValidation.data.usedAt,
      createdAt: new Date().toISOString()
    });
    const nextProfiles = [newProfile, ...profiles];
    saveProfiles(nextProfiles);
    setActiveProfileId(newProfile.id);
    setSelectedProfileId(newProfile.id);
    setIsUnlocked(true);
    setProfileAuthMode('login');
    setToast({ message: `Profil ${name} został utworzony`, type: 'success', visible: true });
    return true;
  };

  const handleSetProfileAdmin = (profileId, enabled) => {
    if (!isAdmin) {
      setToast({ message: 'Brak uprawnień administratora.', type: 'error', visible: true });
      return false;
    }

    const targetProfile = profiles.find(profile => profile.id === profileId);
    if (!targetProfile) {
      setToast({ message: 'Nie znaleziono profilu.', type: 'error', visible: true });
      return false;
    }

    if (isBootstrapAdminProfile(targetProfile) && !enabled) {
      setToast({ message: 'Konto głównego administratora nie może utracić uprawnień.', type: 'error', visible: true });
      return false;
    }

    const nextProfiles = profiles.map(profile => {
      if (profile.id !== profileId) return profile;
      return normalizeProfile({
        ...profile,
        role: enabled ? 'admin' : 'user',
        permissions: {
          ...(profile.permissions || {}),
          admin: enabled,
        },
      });
    });

    saveProfiles(nextProfiles);
    setToast({
      message: enabled ? `Nadano uprawnienia administratora profilowi ${targetProfile.name}.` : `Odebrano uprawnienia administratora profilowi ${targetProfile.name}.`,
      type: 'success',
      visible: true
    });
    return true;
  };

  const handleRenameProfile = (profileId, nextName) => {
    if (!isAdmin) {
      setToast({ message: 'Brak uprawnień administratora.', type: 'error', visible: true });
      return false;
    }

    const cleanName = nextName.trim();
    if (!cleanName) {
      setToast({ message: 'Nazwa profilu nie może być pusta.', type: 'error', visible: true });
      return false;
    }

    const targetProfile = profiles.find(profile => profile.id === profileId);
    if (!targetProfile) {
      setToast({ message: 'Nie znaleziono profilu.', type: 'error', visible: true });
      return false;
    }

    if (isBootstrapAdminProfile(targetProfile) && cleanName.toLowerCase() !== BOOTSTRAP_ADMIN_NAME) {
      setToast({ message: 'Nie można zmienić nazwy głównego administratora.', type: 'error', visible: true });
      return false;
    }

    const nextProfiles = profiles.map(profile => (
      profile.id === profileId ? normalizeProfile({ ...profile, name: cleanName }) : profile
    ));

    saveProfiles(nextProfiles);
    setToast({ message: `Zmieniono nazwę profilu na ${cleanName}.`, type: 'success', visible: true });
    return true;
  };

  const handleDeleteProfile = async (profileId) => {
    if (!isAdmin) {
      setToast({ message: 'Brak uprawnień administratora.', type: 'error', visible: true });
      return false;
    }

    const targetProfile = profiles.find(profile => profile.id === profileId);
    if (!targetProfile) {
      setToast({ message: 'Nie znaleziono profilu.', type: 'error', visible: true });
      return false;
    }

    if (isBootstrapAdminProfile(targetProfile)) {
      setToast({ message: 'Nie można usunąć głównego administratora.', type: 'error', visible: true });
      return false;
    }

    if (targetProfile.accessKeyHash || targetProfile.accessKey) {
      const releaseResponse = await fetch('/api/access-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'release',
          accessKeyHash: targetProfile.accessKeyHash,
          accessKey: targetProfile.accessKey,
        }),
      });
      const releaseResult = await releaseResponse.json().catch(() => ({}));

      if (!releaseResponse.ok || !releaseResult.success) {
        setToast({ message: releaseResult.error || 'Nie udało się zwolnić klucza dostępu.', type: 'error', visible: true });
        return false;
      }
    }

    const nextProfiles = profiles.filter(profile => profile.id !== profileId);
    saveProfiles(nextProfiles);

    if (activeProfileId === profileId) {
      setActiveProfileId('');
      setIsUnlocked(false);
    }
    if (selectedProfileId === profileId) {
      setSelectedProfileId(nextProfiles[0]?.id || '');
    }

    setToast({ message: `Usunięto profil ${targetProfile.name}. Klucz wrócił do puli, jeśli był przypisany.`, type: 'success', visible: true });
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
      setToast({ message: 'Nieprawidłowy PIN', type: 'error', visible: true });
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
      setToast({ message: 'Nieprawidłowy PIN profilu', type: 'error', visible: true });
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
    profiles, activeProfile, activeProfileId, isUnlocked, isAdmin, logout,
    profileAuthMode, setProfileAuthMode, selectedProfileId, setSelectedProfileId,
    handleCreateProfile, handleLoginProfile, handleSwitchProfile, handleApplyChangePin,
    handleSetProfileAdmin, handleRenameProfile, handleDeleteProfile, isBootstrapAdminProfile
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
