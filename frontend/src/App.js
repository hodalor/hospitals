import { useEffect, useState } from 'react';
import { hospitalApi } from './api/hospitalApi';
import AppShell from './app/AppShell';
import { ToastProvider, useToast } from './app/ToastContext';
import SubscriptionGate from './components/subscription/SubscriptionGate';
import LoginPage from './pages/LoginPage';
import './styles/app.css';

function hasOwnSelectedBranch(user) {
  return Object.prototype.hasOwnProperty.call(user || {}, 'selectedBranchName');
}

function AppContent() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(true);
  const { showToast } = useToast();

  const persistUser = (user) => {
    const storedUser = window.localStorage.getItem('healthnova_user');
    let preservedSelectedBranchName;

    if (storedUser) {
      try {
        const parsedStoredUser = JSON.parse(storedUser);
        preservedSelectedBranchName = hasOwnSelectedBranch(parsedStoredUser)
          ? parsedStoredUser.selectedBranchName ?? ''
          : undefined;
      } catch (error) {
        preservedSelectedBranchName = undefined;
      }
    }

    const nextUser = {
      ...user,
      selectedBranchName:
        user?.canAccessAllBranches
          ? hasOwnSelectedBranch(user)
            ? user?.selectedBranchName ?? ''
            : preservedSelectedBranchName !== undefined
              ? preservedSelectedBranchName
              : user?.branchName || ''
          : user?.branchName || '',
    };

    setCurrentUser(nextUser);
    window.localStorage.setItem('healthnova_user', JSON.stringify(nextUser));
  };

  useEffect(() => {
    async function restoreSession() {
      const savedUser = window.localStorage.getItem('healthnova_user');

      if (!savedUser) {
        setIsRestoringSession(false);
        return;
      }

      try {
        const parsedUser = JSON.parse(savedUser);
        setCurrentUser(parsedUser);
        const refreshedUser = await hospitalApi.getCurrentSession();
        persistUser(refreshedUser);
      } catch (error) {
        setCurrentUser(null);
        window.localStorage.removeItem('healthnova_user');
      } finally {
        setIsRestoringSession(false);
      }
    }

    restoreSession();
  }, []);

  useEffect(() => {
    async function handlePaystackCallback() {
      if (!currentUser || currentUser.isMasterTenant) {
        return;
      }

      const url = new URL(window.location.href);
      const paymentMode = url.searchParams.get('subscription_payment');
      const reference = url.searchParams.get('reference');

      if (paymentMode !== 'paystack' || !reference) {
        return;
      }

      try {
        const updatedUser = await hospitalApi.verifySubscriptionPayment(reference);
        persistUser(updatedUser);
        showToast('Subscription payment verified successfully.', 'success');
      } catch (error) {
        showToast(error.message || 'Unable to verify subscription payment.', 'error');
      } finally {
        url.searchParams.delete('subscription_payment');
        url.searchParams.delete('reference');
        window.history.replaceState({}, '', `${url.pathname}${url.search}`);
      }
    }

    handlePaystackCallback();
  }, [currentUser, showToast]);

  useEffect(() => {
    if (currentUser?.subscriptionExpired) {
      showToast('Subscription expired.', 'error');
    }
  }, [currentUser?.subscriptionExpired, showToast]);

  const handleLogin = async ({ hospitalId, username, pin }) => {
    setIsLoggingIn(true);

    try {
      const user = await hospitalApi.login(hospitalId, username, pin);
      persistUser(user);
      showToast('Login successful.', 'success');
    } catch (error) {
      showToast(error.message || 'Login failed.', 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    window.localStorage.removeItem('healthnova_user');
    showToast('Logged out successfully.', 'success');
  };

  if (isRestoringSession) {
    return <LoginPage onLogin={handleLogin} isLoading={true} />;
  }

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} isLoading={isLoggingIn} />;
  }

  if (currentUser.subscriptionExpired) {
    return (
      <SubscriptionGate
        currentUser={currentUser}
        onResolved={persistUser}
        onLogout={handleLogout}
        showToast={showToast}
      />
    );
  }

  return <AppShell currentUser={currentUser} onLogout={handleLogout} onUserChange={persistUser} />;
}

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

export default App;
