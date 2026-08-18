import { useCallback, useEffect, useMemo, useState } from 'react';
import { hospitalApi } from '../api/hospitalApi';
import { canAccessMenu, canAccessQueue, canDoAction, canViewData } from './permissions';
import { useToast } from './ToastContext';
import Header from '../components/layout/Header';
import Sidebar from '../components/layout/Sidebar';
import SubscriptionGate from '../components/subscription/SubscriptionGate';
import {
  appointmentModuleData,
  billingModuleData,
  dashboardData,
  departmentModuleData,
  dutyRosterModuleData,
  hospitalManagementData,
  manualModuleData,
  navigationModules,
  patientModuleData,
  pricingModuleData,
  userModuleData,
  visitFlowModuleData,
} from '../data/hospitalData';
import AppointmentsPage from '../pages/AppointmentsPage';
import BillingPage from '../pages/BillingPage';
import DashboardPage from '../pages/DashboardPage';
import DepartmentsPage from '../pages/DepartmentsPage';
import DutyRosterPage from '../pages/DutyRosterPage';
import HospitalManagementPage from '../pages/HospitalManagementPage';
import ManualPage from '../pages/ManualPage';
import PatientsPage from '../pages/PatientsPage';
import ReceiptsPage from '../pages/ReceiptsPage';
import CatalogPage from '../pages/CatalogPage';
import SettingsPage from '../pages/SettingsPage';
import UsersPage from '../pages/UsersPage';
import VisitsPage from '../pages/VisitsPage';

const defaultModuleData = {
  dashboard: dashboardData,
  hospital_management: hospitalManagementData,
  patients: patientModuleData,
  visits: visitFlowModuleData,
  appointments: appointmentModuleData,
  departments: departmentModuleData,
  settings_config: departmentModuleData,
  pharmacy_medications: pricingModuleData,
  services_conditions: pricingModuleData,
  services_diagnoses: pricingModuleData,
  services_lab: pricingModuleData,
  services_administrative: pricingModuleData,
  finance_billing: billingModuleData,
  finance_pricing: pricingModuleData,
  finance_receipts: billingModuleData,
  duty: dutyRosterModuleData,
  manual: manualModuleData,
  users: userModuleData,
};

const pageComponents = {
  dashboard: DashboardPage,
  hospital_management: HospitalManagementPage,
  patients: PatientsPage,
  visits: VisitsPage,
  appointments: AppointmentsPage,
  departments: DepartmentsPage,
  settings_config: SettingsPage,
  pharmacy_medications: CatalogPage,
  services_conditions: CatalogPage,
  services_diagnoses: CatalogPage,
  services_lab: CatalogPage,
  services_administrative: CatalogPage,
  finance_billing: BillingPage,
  finance_pricing: CatalogPage,
  finance_receipts: ReceiptsPage,
  duty: DutyRosterPage,
  manual: ManualPage,
  users: UsersPage,
};

const workflowQueueKeys = ['cashier', 'doctor', 'lab', 'pharmacy'];
const completedAppointmentStatuses = ['Completed', 'Cancelled'];

function filterVisibleModules(modules, currentUser) {
  return modules.reduce((accumulator, module) => {
    if (module.children?.length) {
      const children = filterVisibleModules(module.children, currentUser);
      if (children.length) {
        accumulator.push({
          ...module,
          children,
        });
      }
      return accumulator;
    }

    if (canAccessMenu(currentUser, module.id)) {
      accumulator.push(module);
    }

    return accumulator;
  }, []);
}

function flattenModules(modules) {
  return modules.flatMap((module) => (module.children?.length ? flattenModules(module.children) : [module]));
}

function applyModuleBadges(modules, badgeCounts) {
  return modules.map((module) => ({
    ...module,
    badgeCount: badgeCounts[module.id] || 0,
    children: module.children?.length ? applyModuleBadges(module.children, badgeCounts) : module.children,
  }));
}

function getPreferredModuleId(currentUser) {
  const hasExplicitNoQueueAccess =
    !currentUser?.isSuperAdmin &&
    Array.isArray(currentUser?.queuePermissions) &&
    currentUser.queuePermissions.length === 0;

  switch (currentUser?.role) {
    case 'Cashier':
    case 'Doctor':
    case 'Clinician':
    case 'Lab Scientist':
    case 'Pharmacist':
      return hasExplicitNoQueueAccess ? 'dashboard' : 'departments';
    case 'Receptionist':
    case 'Nurse':
      return 'visits';
    case 'Admin':
    case 'Super Admin':
    default:
      return 'dashboard';
  }
}

function AppShell({ currentUser, onLogout, onUserChange }) {
  const [activeModuleId, setActiveModuleId] = useState(() => getPreferredModuleId(currentUser));
  const [moduleData, setModuleData] = useState(defaultModuleData);
  const [users, setUsers] = useState(userModuleData.records);
  const [showSubscriptionExtend, setShowSubscriptionExtend] = useState(false);
  const { showToast } = useToast();

  const loadModuleData = useCallback(async () => {
    const [dashboard, hospitals, patients, visits, appointments, departments, billing, pricing, duty, loadedUsers] =
      await Promise.all([
        hospitalApi.getDashboardData(),
        currentUser?.isMasterTenant && currentUser?.isSuperAdmin
          ? hospitalApi.getHospitals()
          : Promise.resolve(hospitalManagementData),
        hospitalApi.getPatientModuleData(),
        hospitalApi.getVisitFlowModuleData(),
        hospitalApi.getAppointmentModuleData(),
        hospitalApi.getDepartmentModuleData(),
        hospitalApi.getBillingModuleData(),
        hospitalApi.getPricingModuleData(),
        hospitalApi.getDutyRosterModuleData(),
        hospitalApi.getUsers(),
      ]);

    setModuleData({
      dashboard,
      hospital_management: hospitals,
      patients,
      visits,
      appointments,
      departments,
      settings_config: departments,
      pharmacy_medications: pricing,
      services_conditions: pricing,
      services_diagnoses: pricing,
      services_lab: pricing,
      services_administrative: pricing,
      finance_billing: billing,
      finance_pricing: pricing,
      finance_receipts: billing,
      duty,
      users: { records: loadedUsers },
    });
    setUsers(loadedUsers);
  }, [currentUser?.isMasterTenant, currentUser?.isSuperAdmin]);

  useEffect(() => {
    let isMounted = true;

    async function loadWhenMounted() {
      const [dashboard, hospitals, patients, visits, appointments, departments, billing, pricing, duty, loadedUsers] =
        await Promise.all([
          hospitalApi.getDashboardData(),
          currentUser?.isMasterTenant && currentUser?.isSuperAdmin
            ? hospitalApi.getHospitals()
            : Promise.resolve(hospitalManagementData),
          hospitalApi.getPatientModuleData(),
          hospitalApi.getVisitFlowModuleData(),
          hospitalApi.getAppointmentModuleData(),
          hospitalApi.getDepartmentModuleData(),
          hospitalApi.getBillingModuleData(),
          hospitalApi.getPricingModuleData(),
          hospitalApi.getDutyRosterModuleData(),
          hospitalApi.getUsers(),
        ]);

      if (!isMounted) {
        return;
      }

      setModuleData({
        dashboard,
        hospital_management: hospitals,
        patients,
        visits,
        appointments,
        departments,
        settings_config: departments,
        pharmacy_medications: pricing,
        services_conditions: pricing,
        services_diagnoses: pricing,
        services_lab: pricing,
        services_administrative: pricing,
        finance_billing: billing,
        finance_pricing: pricing,
        finance_receipts: billing,
        duty,
        users: { records: loadedUsers },
      });
      setUsers(loadedUsers);
    }

    loadWhenMounted();

    return () => {
      isMounted = false;
    };
  }, [currentUser?.isMasterTenant, currentUser?.isSuperAdmin, currentUser?.selectedBranchName]);

  useEffect(() => {
    let isMounted = true;

    const intervalId = window.setInterval(async () => {
      try {
        const [appointments, departments] = await Promise.all([
          hospitalApi.getAppointmentModuleData(),
          hospitalApi.getDepartmentModuleData(),
        ]);

        if (!isMounted) {
          return;
        }

        setModuleData((current) => ({
          ...current,
          appointments,
          departments,
          settings_config: departments,
        }));
      } catch (error) {
        // Keep current data if the background refresh fails.
      }
    }, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  const moduleBadgeCounts = useMemo(() => {
    const departmentQueues = moduleData.departments?.queues || {};
    const visibleWorkflowCount = workflowQueueKeys
      .filter((queueKey) => canAccessQueue(currentUser, queueKey))
      .reduce((sum, queueKey) => sum + (departmentQueues[queueKey]?.length || 0), 0);

    const activeAppointmentCount = (moduleData.appointments?.queue || []).filter(
      (appointment) => !completedAppointmentStatuses.includes(appointment.status)
    ).length;

    return {
      departments: visibleWorkflowCount,
      appointments: activeAppointmentCount,
    };
  }, [currentUser, moduleData.appointments, moduleData.departments]);

  const visibleModuleTree = useMemo(() => {
    if (!currentUser) {
      return [];
    }

    return applyModuleBadges(filterVisibleModules(navigationModules, currentUser), moduleBadgeCounts);
  }, [currentUser, moduleBadgeCounts]);

  const visibleModules = useMemo(() => flattenModules(visibleModuleTree), [visibleModuleTree]);

  useEffect(() => {
    if (!visibleModules.length) {
      return;
    }

    if (!visibleModules.some((module) => module.id === activeModuleId)) {
      const preferredModuleId = getPreferredModuleId(currentUser);
      setActiveModuleId(
        visibleModules.some((module) => module.id === preferredModuleId)
          ? preferredModuleId
          : visibleModules[0].id
      );
    }
  }, [activeModuleId, currentUser, visibleModules]);

  const activeModule = useMemo(
    () => visibleModules.find((module) => module.id === activeModuleId) || visibleModules[0],
    [activeModuleId, visibleModules]
  );

  const auth = useMemo(
    () => ({
      currentUser,
      canAccessMenu: (menuId) => canAccessMenu(currentUser, menuId),
      canAccessQueue: (queueId) => canAccessQueue(currentUser, queueId),
      canViewData: (dataId) => canViewData(currentUser, dataId),
      canDoAction: (actionId) => canDoAction(currentUser, actionId),
    }),
    [currentUser]
  );

  const ActivePage = activeModule ? pageComponents[activeModule.id] : DashboardPage;
  const branding = moduleData.settings_config?.branding || moduleData.finance_billing?.branding || {};
  const branchOptions = branding.branches?.length
    ? branding.branches.filter((branch) => branch.isActive !== false)
    : currentUser?.branchName
      ? [{ id: 'current-branch', name: currentUser.branchName, isMain: true, isActive: true }]
      : [];

  const handleBranchChange = async (selectedBranchName) => {
    if (!onUserChange) {
      return;
    }

    onUserChange({
      ...currentUser,
      selectedBranchName,
    });
  };

  if (showSubscriptionExtend) {
    return (
      <SubscriptionGate
        currentUser={currentUser}
        onResolved={(updatedUser) => {
          setShowSubscriptionExtend(false);
          onUserChange?.({
            ...updatedUser,
            selectedBranchName: currentUser?.selectedBranchName || updatedUser.branchName || '',
          });
        }}
        onLogout={onLogout}
        showToast={showToast}
      />
    );
  }

  return (
    <div className="app-shell">
      <Header
        currentUser={currentUser}
        branding={branding}
        branchOptions={branchOptions}
        onBranchChange={handleBranchChange}
        onExtendSubscription={() => setShowSubscriptionExtend(true)}
        onLogout={onLogout}
      />

      <div className="dashboard-layout">
        <Sidebar
          modules={visibleModuleTree}
          activeModuleId={activeModule?.id || 'dashboard'}
          onNavigate={setActiveModuleId}
        />

        <main className="main-content">
          <ActivePage
            key={activeModule?.id || 'dashboard'}
            data={moduleData[activeModule?.id || 'dashboard']}
            auth={auth}
            users={users}
            branches={branchOptions}
            departments={moduleData.departments?.registry || []}
            pricingItems={moduleData.finance_pricing?.records || moduleData.pharmacy_medications?.records || []}
            dutyRoster={moduleData.duty?.records || []}
            activeModuleId={activeModule?.id || 'dashboard'}
            pageMeta={activeModule || navigationModules[0]}
            onRefreshData={loadModuleData}
            onUsersChange={(updatedUsers) => {
              setUsers(updatedUsers);
              setModuleData((current) => ({
                ...current,
                users: { records: updatedUsers },
              }));
            }}
          />
        </main>
      </div>
    </div>
  );
}

export default AppShell;
