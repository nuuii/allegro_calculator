import { useState } from "react";
import { useAuth } from "../AuthContext.jsx";

export function ProfileAuthScreen() {
  const {
    profileAuthMode, setProfileAuthMode, profiles,
    selectedProfileId, setSelectedProfileId,
    handleLoginProfile, handleCreateProfile
  } = useAuth();

  const [profileName, setProfileName] = useState("");
  const [profilePin, setProfilePin] = useState("");
  const [profilePinConfirm, setProfilePinConfirm] = useState("");
  const [accessKey, setAccessKey] = useState("");
  const [loginPin, setLoginPin] = useState("");

  return (
    <div className="auth-screen">
      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="auth-brand">
          <span className="app-brand__mark">PD</span>
          <div>
            <strong>ProfitDesk</strong>
            <small>Allegro margin operations</small>
          </div>
        </div>

        <div className="auth-header">
          <h1 id="auth-title">{profileAuthMode === 'signup' ? 'Utwórz profil' : 'Wybierz profil'}</h1>
          <p>
            {profiles.length === 0
              ? 'Skonfiguruj pierwszy profil, aby rozpocząć pracę w kalkulatorze marż.'
              : profileAuthMode === 'signup'
                ? 'Dodaj nowy profil użytkownika z prywatnym PIN-em dostępu.'
                : 'Wybierz profil i podaj PIN, aby odblokować panel operacyjny.'}
          </p>
        </div>

        {profiles.length > 0 && (
          <div className="segmented-control">
            <button
              type="button"
              onClick={() => setProfileAuthMode('login')}
              className={profileAuthMode === 'login' ? 'is-active' : ''}
            >
              Logowanie
            </button>
            <button
              type="button"
              onClick={() => setProfileAuthMode('signup')}
              className={profileAuthMode === 'signup' ? 'is-active' : ''}
            >
              Nowy profil
            </button>
          </div>
        )}

        <div className="auth-form">
          {profileAuthMode === 'login' && profiles.length > 0 ? (
            <>
              <div className="profile-grid">
                {profiles.map(profile => (
                  <button
                    type="button"
                    key={profile.id}
                    onClick={() => setSelectedProfileId(profile.id)}
                    className={`profile-select-card ${selectedProfileId === profile.id ? 'is-active' : ''}`}
                  >
                    <strong>{profile.name}</strong>
                    <span>PIN protected</span>
                  </button>
                ))}
              </div>

              <label className="form-label" htmlFor="login-pin">PIN</label>
              <input
                id="login-pin"
                className="form-input"
                type="password"
                inputMode="numeric"
                value={loginPin}
                onChange={e => setLoginPin(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="4-cyfrowy PIN"
              />

              <button type="button" onClick={() => handleLoginProfile(selectedProfileId, loginPin)} className="primary-action">
                Zaloguj się
              </button>
            </>
          ) : (
            <>
              <label className="form-label" htmlFor="profile-name">Nazwa profilu</label>
              <input
                id="profile-name"
                className="form-input"
                type="text"
                value={profileName}
                onChange={e => setProfileName(e.target.value)}
                placeholder="np. Kasia, Magda, Biznes"
              />

              <div className="form-grid-2">
                <div>
                  <label className="form-label" htmlFor="profile-pin">PIN</label>
                  <input
                    id="profile-pin"
                    className="form-input"
                    type="password"
                    inputMode="numeric"
                    value={profilePin}
                    onChange={e => setProfilePin(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="4-cyfrowy PIN"
                  />
                </div>
                <div>
                  <label className="form-label" htmlFor="profile-pin-confirm">Powtórz PIN</label>
                  <input
                    id="profile-pin-confirm"
                    className="form-input"
                    type="password"
                    inputMode="numeric"
                    value={profilePinConfirm}
                    onChange={e => setProfilePinConfirm(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Powtórz PIN"
                  />
                </div>
              </div>

              <label className="form-label" htmlFor="access-key">Klucz dostępu</label>
              <input
                id="access-key"
                className="form-input"
                type="text"
                value={accessKey}
                onChange={e => setAccessKey(e.target.value)}
                placeholder="ac_..."
              />

              <p className="form-help">Klucz dostępu otrzymasz od administratora wdrożenia.</p>
              <button
                type="button"
                onClick={async () => {
                  const success = await handleCreateProfile(profileName, profilePin, profilePinConfirm, accessKey);
                  if (success) {
                    setProfileName('');
                    setProfilePin('');
                    setProfilePinConfirm('');
                    setAccessKey('');
                  }
                }}
                className="primary-action"
              >
                Utwórz profil
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

export function ChangePinModal({ onClose }) {
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const { handleApplyChangePin } = useAuth();

  const handleSubmit = async () => {
    const success = await handleApplyChangePin(currentPin, newPin, confirmPin);
    if (success) onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="save-offer-modal save-offer-modal--compact">
        <div className="save-offer-modal__header">
          <div>
            <h3>Zmień PIN</h3>
            <p>Podaj obecny PIN, a następnie nowy kod dostępu do profilu.</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="auth-form">
          <input className="form-input" type="password" inputMode="numeric" placeholder="Bieżący PIN" value={currentPin} onChange={e => setCurrentPin(e.target.value.replace(/[^0-9]/g, ''))} />
          <input className="form-input" type="password" inputMode="numeric" placeholder="Nowy PIN" value={newPin} onChange={e => setNewPin(e.target.value.replace(/[^0-9]/g, ''))} />
          <input className="form-input" type="password" inputMode="numeric" placeholder="Powtórz nowy PIN" value={confirmPin} onChange={e => setConfirmPin(e.target.value.replace(/[^0-9]/g, ''))} />
        </div>
        <div className="modal-actions">
          <button type="button" className="secondary-action" onClick={onClose}>Anuluj</button>
          <button type="button" className="primary-action primary-action--compact" onClick={handleSubmit}>Zmień PIN</button>
        </div>
      </div>
    </div>
  );
}

export function ProfileManagementModal({ onClose }) {
  const { profiles, selectedProfileId, setSelectedProfileId, handleSwitchProfile } = useAuth();
  const [pin, setPin] = useState('');

  const handleSubmit = async () => {
    const success = await handleSwitchProfile(selectedProfileId, pin);
    if (success) onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="save-offer-modal save-offer-modal--compact">
        <div className="save-offer-modal__header">
          <div>
            <h3>Profile użytkowników</h3>
            <p>Wybierz profil i wpisz jego PIN, aby przełączyć konto.</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>

        {profiles.length === 0 ? (
          <div className="results-register__empty">Brak dostępnych profili.</div>
        ) : (
          <div className="auth-form">
            <label className="form-label" htmlFor="switch-profile">Profil</label>
            <select id="switch-profile" className="form-input" value={selectedProfileId} onChange={e => setSelectedProfileId(e.target.value)}>
              {profiles.map(profile => (
                <option key={profile.id} value={profile.id}>{profile.name}</option>
              ))}
            </select>
            <label className="form-label" htmlFor="switch-profile-pin">PIN profilu</label>
            <input
              id="switch-profile-pin"
              className="form-input"
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={e => setPin(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="4-cyfrowy PIN"
            />
            <button type="button" onClick={handleSubmit} className="primary-action">Przełącz profil</button>
          </div>
        )}
      </div>
    </div>
  );
}
