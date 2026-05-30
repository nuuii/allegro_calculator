import React from "react";

export function ProfileAuthScreen({
  profileAuthMode,
  setProfileAuthMode,
  profiles,
  selectedProfileId,
  setSelectedProfileId,
  loginPin,
  setLoginPin,
  handleLoginProfile,
  profileName,
  setProfileName,
  profilePin,
  setProfilePin,
  profilePinConfirm,
  setProfilePinConfirm,
  accessKey,
  setAccessKey,
  handleCreateProfile
}) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d0d11', color: '#e8e4d9', padding: '1.5rem' }}>
      <div style={{ width: 520, maxWidth: '96%', background: '#121218', border: '1px solid #1e1e26', borderRadius: 12, padding: '1.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#f5a623' }}>{profileAuthMode === 'signup' ? 'Utwórz profil' : 'Wybierz profil'}</h2>
        <p style={{ color: '#6a6a82', fontSize: '0.9rem', marginTop: '0.5rem' }}>
          {profiles.length === 0
            ? 'Zacznij od utworzenia profilu. Potrzebny jest ważny klucz dostępu.'
            : profileAuthMode === 'signup'
              ? 'Utwórz nowy profil, podając nazwę, PIN i ważny klucz dostępu.'
              : 'Wybierz profil i wprowadź PIN, aby odblokować aplikację.'}
        </p>

        {profiles.length > 0 && (
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
            <button
              onClick={() => setProfileAuthMode('login')}
              style={{ flex: 1, background: profileAuthMode === 'login' ? '#f5a623' : '#22222e', border: 'none', color: profileAuthMode === 'login' ? '#0d0d11' : '#8a8a9e', borderRadius: 6, padding: '0.65rem', cursor: 'pointer' }}
            >
              Logowanie
            </button>
            <button
              onClick={() => setProfileAuthMode('signup')}
              style={{ flex: 1, background: profileAuthMode === 'signup' ? '#f5a623' : '#22222e', border: 'none', color: profileAuthMode === 'signup' ? '#0d0d11' : '#8a8a9e', borderRadius: 6, padding: '0.65rem', cursor: 'pointer' }}
            >
              Nowy profil
            </button>
          </div>
        )}

        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          {profileAuthMode === 'login' && profiles.length > 0 ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {profiles.map(profile => (
                  <button
                    key={profile.id}
                    onClick={() => setSelectedProfileId(profile.id)}
                    style={{
                      background: selectedProfileId === profile.id ? '#f5a623' : '#1e1e28',
                      color: selectedProfileId === profile.id ? '#0d0d11' : '#e8e4d9',
                      border: '1px solid #2d2d3d',
                      borderRadius: 8,
                      padding: '0.85rem',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '0.9rem'
                    }}
                  >
                    {profile.name}
                    <div style={{ fontSize: '0.75rem', color: selectedProfileId === profile.id ? '#0d0d11' : '#8a8a9e', marginTop: '0.25rem' }}>
                      PIN-protected
                    </div>
                  </button>
                ))}
              </div>

              <label style={{ fontSize: '0.75rem', color: '#6a6a82' }}>PIN</label>
              <input
                type="password"
                inputMode="numeric"
                value={loginPin}
                onChange={e => setLoginPin(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="4-cyfrowy PIN"
                style={{ width: '100%', background: '#1e1e28', border: '1px solid #2d2d3d', borderRadius: 6, color: '#e8e4d9', padding: '0.65rem' }}
              />

              <button
                onClick={handleLoginProfile}
                style={{ width: '100%', background: 'linear-gradient(135deg, #4ecb71, #2a9d47)', border: 'none', borderRadius: 6, color: '#0d0d11', padding: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Zaloguj się
              </button>
            </>
          ) : (
            <>
              <label style={{ fontSize: '0.75rem', color: '#6a6a82' }}>Nazwa profilu</label>
              <input
                type="text"
                value={profileName}
                onChange={e => setProfileName(e.target.value)}
                placeholder="np. Kasia, Magda, Biznes"
                style={{ width: '100%', background: '#1e1e28', border: '1px solid #2d2d3d', borderRadius: 6, color: '#e8e4d9', padding: '0.65rem' }}
              />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#6a6a82' }}>PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    value={profilePin}
                    onChange={e => setProfilePin(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="4-cyfrowy PIN"
                    style={{ width: '100%', background: '#1e1e28', border: '1px solid #2d2d3d', borderRadius: 6, color: '#e8e4d9', padding: '0.65rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#6a6a82' }}>Powtórz PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    value={profilePinConfirm}
                    onChange={e => setProfilePinConfirm(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Powtórz PIN"
                    style={{ width: '100%', background: '#1e1e28', border: '1px solid #2d2d3d', borderRadius: 6, color: '#e8e4d9', padding: '0.65rem' }}
                  />
                </div>
              </div>

              <label style={{ fontSize: '0.75rem', color: '#6a6a82' }}>Klucz dostępu</label>
              <input
                type="text"
                value={accessKey}
                onChange={e => setAccessKey(e.target.value)}
                placeholder="ac_..."
                style={{ width: '100%', background: '#1e1e28', border: '1px solid #2d2d3d', borderRadius: 6, color: '#e8e4d9', padding: '0.65rem' }}
              />

              <div style={{ color: '#6a6a82', fontSize: '0.8rem', marginBottom: '0.65rem' }}>
                Klucz dostępu otrzymasz od administratora. Wpisz go w polu powyżej.
              </div>
              <button
                onClick={handleCreateProfile}
                style={{ width: '100%', background: 'linear-gradient(135deg, #4ecb71, #2a9d47)', border: 'none', borderRadius: 6, color: '#0d0d11', padding: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Utwórz profil
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export function ChangePinModal({
  changeCurrentPin,
  setChangeCurrentPin,
  changeNewPin,
  setChangeNewPin,
  changeConfirmPin,
  setChangeConfirmPin,
  handleApplyChangePin,
  handleCloseChangePin
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', zIndex: 1200 }}>
      <div style={{ width: 480, maxWidth: '96%', background: '#121218', border: '1px solid #1e1e26', borderRadius: 12, padding: '1rem' }}>
        <h3 style={{ margin: 0, color: '#f5a623' }}>Zmień PIN</h3>
        <p style={{ color: '#6a6a82', marginTop: '0.35rem' }}>Podaj obecny PIN, a następnie nowy PIN (min. 4 cyfry).</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.6rem' }}>
          <input type="password" inputMode="numeric" placeholder="Bieżący PIN" value={changeCurrentPin} onChange={e => setChangeCurrentPin(e.target.value.replace(/[^0-9]/g, ''))} style={{ padding: '0.5rem', borderRadius: 6, background: '#1e1e28', border: '1px solid #2d2d3d', color: '#e8e4d9' }} />
          <input type="password" inputMode="numeric" placeholder="Nowy PIN" value={changeNewPin} onChange={e => setChangeNewPin(e.target.value.replace(/[^0-9]/g, ''))} style={{ padding: '0.5rem', borderRadius: 6, background: '#1e1e28', border: '1px solid #2d2d3d', color: '#e8e4d9' }} />
          <input type="password" inputMode="numeric" placeholder="Powtórz nowy PIN" value={changeConfirmPin} onChange={e => setChangeConfirmPin(e.target.value.replace(/[^0-9]/g, ''))} style={{ padding: '0.5rem', borderRadius: 6, background: '#1e1e28', border: '1px solid #2d2d3d', color: '#e8e4d9' }} />
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
          <button onClick={handleApplyChangePin} style={{ flex: 1, background: 'linear-gradient(135deg,#4ecb71,#2a9d47)', border: 'none', padding: '0.6rem', borderRadius: 6, color: '#0d0d11', fontWeight: 700 }}>Zmień PIN</button>
          <button onClick={handleCloseChangePin} style={{ background: '#22222e', border: '1px solid #2d2d3d', padding: '0.6rem', borderRadius: 6, color: '#8a8a9e' }}>Anuluj</button>
        </div>
      </div>
    </div>
  );
}

export function ProfileManagementModal({
  selectedProfileId,
  setSelectedProfileId,
  profiles,
  profileSwitchPin,
  setProfileSwitchPin,
  handleSwitchProfile,
  setShowProfileModal
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', zIndex: 1100 }}>
      <div style={{ width: '90vw', maxWidth: 520, background: '#121218', border: '1px solid #1e1e26', borderRadius: 12, padding: '1.25rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ margin: 0, color: '#f5a623' }}>Profile</h3>
            <div style={{ color: '#6a6a82', fontSize: '0.8rem' }}>Wybierz profil i wpisz jego PIN, aby przełączyć konto.</div>
          </div>
          <button onClick={() => { setShowProfileModal(false); setProfileSwitchPin(''); }} style={{ background: 'transparent', border: 'none', color: '#8a8a9e', fontSize: '1.2rem', cursor: 'pointer', marginLeft: 'auto' }}>✕</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {profiles.length === 0 ? (
            <div style={{ color: '#4a4a5e' }}>Brak dostępnych profili.</div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', color: '#6a6a82' }}>Profil</label>
                <select
                  value={selectedProfileId}
                  onChange={e => setSelectedProfileId(e.target.value)}
                  style={{ width: '100%', background: '#1e1e28', border: '1px solid #2d2d3d', borderRadius: 6, color: '#e8e4d9', padding: '0.65rem' }}
                >
                  {profiles.map(profile => (
                    <option key={profile.id} value={profile.id}>{profile.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <label style={{ fontSize: '0.75rem', color: '#6a6a82' }}>PIN profilu</label>
                <input
                  type="password"
                  inputMode="numeric"
                  value={profileSwitchPin}
                  onChange={e => setProfileSwitchPin(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="4-cyfrowy PIN"
                  style={{ width: '100%', background: '#1e1e28', border: '1px solid #2d2d3d', borderRadius: 6, color: '#e8e4d9', padding: '0.65rem' }}
                />
              </div>
              <button
                onClick={() => handleSwitchProfile(selectedProfileId, profileSwitchPin)}
                style={{ width: '100%', background: 'linear-gradient(135deg, #4ecb71, #2a9d47)', border: 'none', borderRadius: 6, color: '#0d0d11', padding: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
              >
                Przełącz profil
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
