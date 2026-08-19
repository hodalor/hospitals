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
          <div className="login-brand-mark" aria-hidden="true">
            <div className="login-brand-cross">
              <span />
              <span />
            </div>
            <div className="login-brand-stethoscope">
              <span className="login-stethoscope-tube" />
              <span className="login-stethoscope-ear login-stethoscope-ear-left" />
              <span className="login-stethoscope-ear login-stethoscope-ear-right" />
              <span className="login-stethoscope-chest" />
            </div>
          </div>
          <div>
            <h1>HealthNova HMS</h1>
          </div>
        </div>

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
