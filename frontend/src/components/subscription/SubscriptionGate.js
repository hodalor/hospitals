import { useMemo, useState } from 'react';
import { hospitalApi } from '../../api/hospitalApi';

function SubscriptionGate({ currentUser, onResolved, onLogout, showToast }) {
  const [mode, setMode] = useState('activation');
  const [activationCode, setActivationCode] = useState('');
  const [months, setMonths] = useState(1);
  const [email, setEmail] = useState(currentUser?.contactEmail || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalAmount = useMemo(
    () => Number(currentUser?.subscriptionMonthlyAmount || 0) * Number(months || 1),
    [currentUser?.subscriptionMonthlyAmount, months]
  );
  const currencyCode = currentUser?.subscriptionCurrency || 'GHS';

  const clampMonths = (value) => Math.min(24, Math.max(1, Number(value || 1)));

  const handleActivation = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const updatedUser = await hospitalApi.activateSubscriptionCode(activationCode);
      onResolved(updatedUser);
      showToast('Subscription activated successfully.', 'success');
    } catch (error) {
      showToast(error.message || 'Unable to activate subscription code.', 'error');
      setIsSubmitting(false);
    }
  };

  const handlePayment = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const payment = await hospitalApi.initializeSubscriptionPayment({
        months,
        email,
      });
      window.location.href = payment.authorizationUrl;
    } catch (error) {
      showToast(error.message || 'Unable to start subscription payment.', 'error');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-brand">
          <div className="brand-badge">HN</div>
          <div>
            <p className="eyebrow">Subscription Control</p>
            <h1>Subscription expired</h1>
          </div>
        </div>

        <p className="login-copy">
          {currentUser.hospitalName} cannot continue until the subscription is renewed. Choose an
          activation code or make payment for one or more months.
        </p>

        <div className="tabs">
          <button
            type="button"
            className={`tab-button ${mode === 'activation' ? 'active' : ''}`}
            onClick={() => setMode('activation')}
          >
            <span>Activate Code</span>
          </button>
          <button
            type="button"
            className={`tab-button ${mode === 'payment' ? 'active' : ''}`}
            onClick={() => setMode('payment')}
          >
            <span>Make Payment</span>
          </button>
        </div>

        {mode === 'activation' ? (
          <form className="entity-form" onSubmit={handleActivation}>
            <label className="form-field">
              <span>12-digit activation code</span>
              <input
                value={activationCode}
                onChange={(event) => setActivationCode(event.target.value.toUpperCase())}
                maxLength={12}
                required
              />
            </label>

            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={onLogout}>
                Logout
              </button>
              <button type="submit" className="primary-button" disabled={isSubmitting}>
                {isSubmitting ? 'Activating...' : 'Activate Code'}
              </button>
            </div>
          </form>
        ) : (
          <form className="entity-form" onSubmit={handlePayment}>
            <label className="form-field">
              <span>Monthly amount</span>
              <input value={`${currencyCode} ${Number(currentUser.subscriptionMonthlyAmount || 0).toFixed(2)}`} disabled />
            </label>

            <label className="form-field">
              <span>Months to pay</span>
              <input
                type="number"
                min="1"
                max="24"
                value={months}
                onChange={(event) => setMonths(clampMonths(event.target.value))}
                required
              />
            </label>

            <label className="form-field">
              <span>Receipt email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label className="form-field">
              <span>Total amount</span>
              <input value={`${currencyCode} ${totalAmount.toFixed(2)}`} disabled />
            </label>

            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={onLogout}>
                Logout
              </button>
              <button type="submit" className="primary-button" disabled={isSubmitting}>
                {isSubmitting ? 'Redirecting...' : 'Continue to Paystack'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default SubscriptionGate;
