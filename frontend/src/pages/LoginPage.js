import { useState } from 'react';

function LoginPage({ onLogin, isLoading }) {
  const [hospitalId, setHospitalId] = useState('master');
  const [username, setUsername] = useState('superadmin');
  const [pin, setPin] = useState('1234');

  const handleSubmit = (event) => {
    event.preventDefault();
    onLogin({ hospitalId, username, pin });
  };

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-badge">HN</div>
          <div>
            <p className="eyebrow">HealthNova HMS</p>
            <h1>Sign in to continue</h1>
          </div>
        </div>

        <p className="login-copy">
          Sign in with your hospital ID, username, and PIN to access the menus, data, and actions
          assigned to your tenant account.
        </p>

        <form className="entity-form" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Hospital ID</span>
            <input value={hospitalId} onChange={(event) => setHospitalId(event.target.value)} required />
          </label>

          <label className="form-field">
            <span>Username</span>
            <input value={username} onChange={(event) => setUsername(event.target.value)} required />
          </label>

          <label className="form-field">
            <span>PIN</span>
            <input
              type="password"
              value={pin}
              onChange={(event) => setPin(event.target.value)}
              inputMode="numeric"
              pattern="[0-9]{4,6}"
              required
            />
          </label>

          <button type="submit" className="primary-button login-button" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;
