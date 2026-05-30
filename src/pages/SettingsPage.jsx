import { useState } from 'react';
import { useAuth } from '../AuthContext.jsx';

const SettingsCard = ({ title, children }) => (
  <div className="settings-card">
    <h3>{title}</h3>
    <div className="settings-card__body">{children}</div>
  </div>
);

const InputField = ({ label, type, value, onChange }) => (
  <div>
    <label className="form-label" style={{ marginBottom: "0.35rem" }}>
      {label}
    </label>
    <input
      className="form-input"
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
    />
  </div>
);

const ProfileSwitchCard = ({ profile, isActive, onSwitch }) => {
  const [pin, setPin] = useState('');
  const [isSwitching, setIsSwitching] = useState(false);

  const handleSwitchClick = () => {
    if (isActive) return;
    if (!isSwitching) {
      setIsSwitching(true);
    } else {
      onSwitch(profile.id, pin);
    }
  };

  return (
    <div className={`profile-switch-card ${isActive ? 'is-active' : ''}`}>
      <div className="profile-switch-card__header">
        <span>{profile.name}</span>
        {isActive && <strong>AKTYWNY</strong>}
      </div>
      {isSwitching && !isActive && (
        <div className="profile-switch-card__pin">
          <input
            className="form-input"
            type="password"
            placeholder="PIN"
            value={pin}
            onChange={e => setPin(e.target.value)}
          />
          <button className="table-action" onClick={handleSwitchClick}>Zatwierdź</button>
        </div>
      )}
      {!isActive && (
        <button className="secondary-action" onClick={handleSwitchClick}>
          {isSwitching ? 'Anuluj' : 'Przełącz na ten profil'}
        </button>
      )}
    </div>
  );
};

export default function SettingsPage({ profiles, activeProfile, edgeConfig, onLogout }) {
  const {
    handleApplyChangePin, handleSwitchProfile, isAdmin, handleSetProfileAdmin,
    handleRenameProfile, handleDeleteProfile, handleDeleteOwnProfile, isBootstrapAdminProfile
  } = useAuth();
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [profileNames, setProfileNames] = useState(() => (
    Object.fromEntries(profiles.map(profile => [profile.id, profile.name]))
  ));

  const handleChangePin = async () => {
    const success = await handleApplyChangePin(currentPin, newPin, confirmPin);
    if (success) {
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
    }
  };

  const handleDeleteOwnAccount = () => {
    const confirmed = window.confirm(
      'Usunąć aktualny profil? Ten klucz dostępu pozostanie wykorzystany i nie wróci do puli dostępnych kluczy.'
    );
    if (confirmed) handleDeleteOwnProfile();
  };

  const activeProfileIsBootstrapAdmin = isBootstrapAdminProfile(activeProfile);

  return (
    <div className="settings-page">
      <div className="page-heading">
        <h2>Ustawienia systemowe</h2>
        <p>
          Zarządzaj profilem, bezpieczeństwem oraz konfiguracją aplikacji.
        </p>
      </div>

      <div className="settings-grid">
        <div className="settings-stack">
          <SettingsCard title="Zarządzanie Profilem i Bezpieczeństwem">
            <div style={{ fontSize: '0.9rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>Aktywny profil: </span>
              <strong style={{ color: 'var(--accent-strong)' }}>{activeProfile?.name || 'Brak'}</strong>
            </div>
            <InputField label="BIEŻĄCY PIN" type="password" value={currentPin} onChange={setCurrentPin} />
            <InputField label="NOWY PIN" type="password" value={newPin} onChange={setNewPin} />
            <InputField label="POWTÓRZ NOWY PIN" type="password" value={confirmPin} onChange={setConfirmPin} />
            <button
              onClick={handleChangePin}
              className="primary-action"
            >
              Zmień PIN
            </button>
            <button
              onClick={onLogout}
              className="secondary-action secondary-action--danger"
            >
              Wyloguj i zablokuj aplikację
            </button>
            <div className="danger-zone">
              <div>
                <strong>Usuń moje konto</strong>
                <span>Profil zostanie usunięty z tej aplikacji, a użyty klucz pozostanie spalony.</span>
              </div>
              <button
                type="button"
                className="secondary-action secondary-action--danger"
                onClick={handleDeleteOwnAccount}
                disabled={activeProfileIsBootstrapAdmin}
                title={activeProfileIsBootstrapAdmin ? 'Główne konto administratora jest chronione' : undefined}
              >
                Usuń moje konto
              </button>
            </div>
          </SettingsCard>

          <SettingsCard title="Konfiguracja Chmury i Scrapera">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#8a8a9e' }}>Próg "Smart" dla dostawy:</span>
              <span style={{ fontWeight: 700, color: '#e8e4d9', background: '#1e1e28', padding: '0.3rem 0.7rem', borderRadius: '6px' }}>
                {edgeConfig?.smartThreshold ? `${edgeConfig.smartThreshold} zł` : 'Brak danych'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#8a8a9e' }}>Status scrapera EAN:</span>
              {edgeConfig?.isScraperActive ? (
                <span style={{ fontWeight: 600, color: '#4ecb71' }}>Aktywny</span>
              ) : (
                <span style={{ fontWeight: 600, color: '#e05555' }}>Nieaktywny</span>
              )}
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-faint)', margin: '0.5rem 0 0', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
              Powyższe wartości są zarządzane centralnie z panelu Vercel Edge Config i są wspólne dla wszystkich użytkowników.
            </p>
          </SettingsCard>

          {isAdmin && (
            <SettingsCard title="Panel administratora">
              <p className="admin-panel-note">
                Zarządzaj uprawnieniami profili. Panel jest widoczny tylko dla kont z rolą administratora.
              </p>
              <div className="admin-profile-list">
                {profiles.map(profile => {
                  const profileIsAdmin = profile.permissions?.admin || profile.role === 'admin';
                  const isBootstrapAdmin = isBootstrapAdminProfile(profile);
                  const draftName = profileNames[profile.id] ?? profile.name;

                  return (
                    <div className="admin-profile-row" key={profile.id}>
                      <div className="admin-profile-row__main">
                        <label className="form-label" htmlFor={`profile-name-${profile.id}`}>Nazwa profilu</label>
                        <input
                          id={`profile-name-${profile.id}`}
                          className="form-input"
                          value={draftName}
                          disabled={isBootstrapAdmin}
                          onChange={event => setProfileNames(prev => ({ ...prev, [profile.id]: event.target.value }))}
                        />
                        <span>
                          {profileIsAdmin ? 'Administrator' : 'Użytkownik'}
                          {profile.accessKeyHash ? ` · klucz ${profile.accessKeyHash.slice(0, 8)}...` : ' · brak przypisanego klucza'}
                        </span>
                      </div>
                      <div className="admin-profile-row__actions">
                        <button
                          type="button"
                          className="secondary-action"
                          onClick={() => handleRenameProfile(profile.id, draftName)}
                          disabled={isBootstrapAdmin || draftName.trim() === profile.name}
                        >
                          Zapisz nazwę
                        </button>
                        <button
                          type="button"
                          className={profileIsAdmin ? "secondary-action secondary-action--danger" : "primary-action primary-action--compact"}
                          onClick={() => handleSetProfileAdmin(profile.id, !profileIsAdmin)}
                          disabled={isBootstrapAdmin}
                          title={isBootstrapAdmin ? 'Główne konto administratora jest chronione' : undefined}
                        >
                          {profileIsAdmin ? 'Odbierz admina' : 'Nadaj admina'}
                        </button>
                        <button
                          type="button"
                          className="secondary-action secondary-action--danger"
                          onClick={() => handleDeleteProfile(profile.id)}
                          disabled={isBootstrapAdmin}
                        >
                          Usuń profil
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SettingsCard>
          )}
        </div>

        <SettingsCard title="Przełączanie Profili">
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '-1rem 0 0' }}>
            Kliknij na profil, aby się na niego przełączyć. Wymagane będzie podanie kodu PIN.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
            {profiles.map(profile => (
              <ProfileSwitchCard
                key={profile.id}
                profile={profile}
                isActive={profile.id === activeProfile?.id}
                onSwitch={handleSwitchProfile}
              />
            ))}
          </div>
        </SettingsCard>
      </div>
    </div>
  );
}
