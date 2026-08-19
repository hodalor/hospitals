import { useEffect, useMemo, useRef, useState } from 'react';

function Header({
  currentUser,
  branding,
  branchOptions,
  onBranchChange,
  onExtendSubscription,
  onLogout,
}) {
  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  const subscriptionExpiry = currentUser?.subscriptionExpiresAt
    ? new Date(currentUser.subscriptionExpiresAt)
    : null;
  const msLeft = subscriptionExpiry ? subscriptionExpiry.getTime() - Date.now() : 0;
  const daysLeft = subscriptionExpiry ? Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24))) : 0;
  const hasSelectedBranchName = Object.prototype.hasOwnProperty.call(currentUser || {}, 'selectedBranchName');
  const selectedBranchName = hasSelectedBranchName
    ? currentUser?.selectedBranchName ?? ''
    : currentUser?.branchName || '';
  const branchValue = currentUser?.canAccessAllBranches ? selectedBranchName : currentUser?.branchName || '';
  const showExtendButton =
    !currentUser?.isMasterTenant &&
    ['Admin', 'Super Admin'].includes(currentUser?.role);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef(null);
  const hospitalDisplayName = (branding?.hospitalName || currentUser?.hospitalName || 'HealthNova Hospital').toUpperCase();
  const profileInitials = useMemo(() => {
    const source = String(currentUser?.fullName || currentUser?.username || 'U')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    return source
      .slice(0, 2)
      .map((item) => item[0])
      .join('')
      .toUpperCase();
  }, [currentUser?.fullName, currentUser?.username]);
  const hospitalNameClassName =
    hospitalDisplayName.length > 34
      ? 'topbar-hospital-name topbar-hospital-name-compact'
      : hospitalDisplayName.length > 24
        ? 'topbar-hospital-name topbar-hospital-name-tight'
        : 'topbar-hospital-name';

  useEffect(() => {
    function handleOutsideClick(event) {
      if (!profileMenuRef.current?.contains(event.target)) {
        setIsProfileMenuOpen(false);
      }
    }

    if (isProfileMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isProfileMenuOpen]);

  return (
    <header className="topbar">
      <div className="topbar-branding">
        {branding?.logoDataUrl ? (
          <img src={branding.logoDataUrl} alt={branding.hospitalName || 'Hospital logo'} className="topbar-logo" />
        ) : (
          <div className="brand-badge topbar-logo-fallback">
            {(branding?.hospitalName || currentUser?.hospitalName || 'HN').slice(0, 2).toUpperCase()}
          </div>
        )}
        <h1 className={hospitalNameClassName}>{hospitalDisplayName}</h1>
      </div>

      <div className="topbar-actions">
        <div className="active-user-box">
          <span className="topbar-user-label">Branch</span>
          <select
            className="topbar-user-select"
            value={branchValue}
            onChange={(event) => onBranchChange?.(event.target.value)}
            disabled={!currentUser?.canAccessAllBranches}
          >
            {currentUser?.canAccessAllBranches ? <option value="">All Branches</option> : null}
            {(branchOptions || []).map((branch) => (
              <option key={branch.id || branch.name} value={branch.name}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>
        {!currentUser?.isMasterTenant ? (
          <div className="topbar-subscription-chip">
            <strong>{daysLeft} day(s) left</strong>
          </div>
        ) : null}
        {showExtendButton ? (
          <button type="button" className="secondary-button" onClick={onExtendSubscription}>
            Extend Days
          </button>
        ) : null}
        <span className="topbar-date">{today}</span>
        <div className="profile-menu" ref={profileMenuRef}>
          <button
            type="button"
            className="profile-menu-trigger"
            onClick={() => setIsProfileMenuOpen((current) => !current)}
            aria-expanded={isProfileMenuOpen ? 'true' : 'false'}
          >
            <span className="profile-menu-avatar">{profileInitials || 'U'}</span>
          </button>
          {isProfileMenuOpen ? (
            <div className="profile-menu-dropdown">
              <div className="profile-menu-user">
                <strong>{currentUser ? currentUser.fullName : 'Not signed in'}</strong>
                <span>{currentUser ? currentUser.role : ''}</span>
              </div>
              <button type="button" className="secondary-button profile-menu-logout" onClick={onLogout}>
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export default Header;
