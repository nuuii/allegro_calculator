import React, { useState } from 'react';

const SettingsCard = ({ title, children }) => (
  <div style={{ background: "#121218", border: "1px solid #1e1e26", borderRadius: "12px", padding: "1.5rem" }}>
    <h3 style={{ margin: '0 0 1.5rem 0', fontFamily: "'Syne', sans-serif", color: '#f5a623', fontSize: '1.1rem', borderBottom: '1px solid #1e1e26', paddingBottom: '0.75rem' }}>
      {title}
    </h3>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {children}
    </div>
  </div>
);

const InputField = ({ label, type, value, onChange }) => (
  <div>
    <label style={{ fontSize: "0.68rem", letterSpacing: "0.08em", color: "#6a6a82", display: "block", marginBottom: "0.3rem", fontWeight: 500 }}>
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        width: "100%", background: "#1e1e28", border: "1px solid #2d2d3d", borderRadius: "6px",
        color: "#e8e4d9", fontSize: "0.95rem", fontFamily: "inherit", padding: "0.5rem 0.75rem",
      }}
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
    <div style={{ background: isActive ? '#1a3a22' : '#161622', border: `1px solid ${isActive ? '#4ecb71' : '#2d2d3d'}`, borderRadius: '8px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontWeight: 700, color: isActive ? '#4ecb71' : '#e8e4d9' }}>👤 {profile.name}</span>
        {isActive && <span style={{ fontSize: '0.7rem', background: '#4ecb71', color: '#0d0d11', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 600 }}>AKTYWNY</span>}
      </div>
      {isSwitching && !isActive && (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="password"
            placeholder="PIN"
            value={pin}
            onChange={e => setPin(e.target.value)}
            style={{ flex: 1, background: "#1e1e28", border: "1px solid #f5a623", borderRadius: "6px", color: "#e8e4d9", padding: "0.4rem", textAlign: 'center' }}
          />
          <button onClick={handleSwitchClick} style={{ background: '#f5a623', color: '#0d0d11', border: 'none', borderRadius: '6px', padding: '0 0.8rem', fontWeight: 600 }}>Zatwierdź</button>
        </div>
      )}
      {!isActive && (
        <button onClick={handleSwitchClick} style={{ background: '#22222e', color: '#8a8a9e', border: '1px solid #2d2d3d', borderRadius: '6px', padding: '0.5rem', cursor: 'pointer', width: '100%' }}>
          {isSwitching ? 'Anuluj' : 'Przełącz na ten profil'}
        </button>
      )}
    </div>
  );
};

export default function SettingsPage({ profiles, activeProfile, edgeConfig, onApplyChangePin, onSwitchProfile, onLogout }) {
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');

  const handleChangePin = async () => {
    const success = await onApplyChangePin(currentPin, newPin, confirmPin);
    if (success) {
      setCurrentPin('');
      setNewPin('');
      setConfirmPin('');
    }
  };

  return (
    <div style={{ width: '100%', maxWidth: '1140px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ paddingBottom: '0.75rem', borderBottom: '1px solid #1e1e26' }}>
        <h2 style={{ margin: 0, fontFamily: "'Syne', sans-serif", color: '#e8e4d9', fontWeight: 700 }}>⚙️ Ustawienia Systemowe</h2>
        <p style={{ margin: '0.25rem 0 0', color: '#8a8a9e', fontSize: '0.9rem', lineHeight: 1.5 }}>
          Zarządzaj profilem, bezpieczeństwem oraz konfiguracją aplikacji.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <SettingsCard title="Zarządzanie Profilem i Bezpieczeństwem">
            <div style={{ fontSize: '0.9rem' }}>
              <span style={{ color: '#8a8a9e' }}>Aktywny profil: </span>
              <strong style={{ color: '#f5a623' }}>{activeProfile?.name || 'Brak'}</strong>
            </div>
            <InputField label="BIEŻĄCY PIN" type="password" value={currentPin} onChange={setCurrentPin} />
            <InputField label="NOWY PIN" type="password" value={newPin} onChange={setNewPin} />
            <InputField label="POWTÓRZ NOWY PIN" type="password" value={confirmPin} onChange={setConfirmPin} />
            <button
              onClick={handleChangePin}
              style={{ background: 'linear-gradient(135deg, #f5a623, #f0623a)', color: '#0d0d11', border: 'none', borderRadius: '6px', padding: '0.7rem', fontWeight: 600, cursor: 'pointer' }}
            >
              Zmień PIN
            </button>
            <button
              onClick={onLogout}
              style={{ background: '#3a1a1a', color: '#e05555', border: '1px solid #e05555', borderRadius: '6px', padding: '0.7rem', fontWeight: 600, cursor: 'pointer', marginTop: '1rem' }}
            >
              Wyloguj i zablokuj aplikację
            </button>
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
            <p style={{ fontSize: '0.75rem', color: '#4a4a5e', margin: '0.5rem 0 0', borderTop: '1px solid #1e1e26', paddingTop: '1rem' }}>
              Powyższe wartości są zarządzane centralnie z panelu Vercel Edge Config i są wspólne dla wszystkich użytkowników.
            </p>
          </SettingsCard>
        </div>

        <SettingsCard title="Przełączanie Profili">
          <p style={{ fontSize: '0.8rem', color: '#6a6a82', margin: '-1rem 0 0' }}>
            Kliknij na profil, aby się na niego przełączyć. Wymagane będzie podanie kodu PIN.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.75rem' }}>
            {profiles.map(profile => (
              <ProfileSwitchCard
                key={profile.id}
                profile={profile}
                isActive={profile.id === activeProfile?.id}
                onSwitch={onSwitchProfile}
              />
            ))}
          </div>
        </SettingsCard>
      </div>
    </div>
  );
}