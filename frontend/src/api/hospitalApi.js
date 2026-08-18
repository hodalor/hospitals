import {
  appointmentModuleData,
  billingModuleData,
  dashboardData,
  departmentModuleData,
  dutyRosterModuleData,
  hospitalManagementData,
  patientModuleData,
  pricingModuleData,
  userModuleData,
  visitFlowModuleData,
} from '../data/hospitalData';

function resolveApiBaseUrl() {
  const configuredBaseUrl = String(process.env.REACT_APP_API_BASE_URL || '').trim();

  if (configuredBaseUrl) {
    return configuredBaseUrl.replace(/\/$/, '');
  }

  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:5000/api';
  }

  // Production builds should use the hosted environment variable instead of a localhost fallback.
  return '/api';
}

const API_BASE_URL = resolveApiBaseUrl();

function getStoredUser() {
  try {
    const rawValue = window.localStorage.getItem('healthnova_user');
    return rawValue ? JSON.parse(rawValue) : null;
  } catch (error) {
    return null;
  }
}

function buildFallbackDepartmentCategories(registry = []) {
  const counts = registry.reduce((accumulator, department) => {
    const categoryName = String(department.category || '').trim();
    if (!categoryName) {
      return accumulator;
    }

    accumulator[categoryName] = (accumulator[categoryName] || 0) + 1;
    return accumulator;
  }, {});

  return Object.keys(counts)
    .sort((left, right) => left.localeCompare(right))
    .map((name) => ({
      id: `fallback-${name.toLowerCase().replace(/\s+/g, '-')}`,
      name,
      description: '',
      isActive: true,
      departmentCount: counts[name],
    }));
}

async function request(path, options = {}) {
  if (process.env.NODE_ENV === 'test') {
    throw new Error('Network requests are disabled during tests.');
  }

  const currentUser = getStoredUser();
  const tenantHeaders = currentUser
    ? {
        'x-hospital-id': currentUser.hospitalId || 'master',
        'x-user-username': currentUser.username || '',
        'x-branch-name': currentUser.selectedBranchName || currentUser.branchName || '',
      }
    : {};

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...tenantHeaders,
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    let message = 'Request failed';

    try {
      const errorPayload = await response.json();
      message = errorPayload.message || message;
    } catch (error) {
      message = response.statusText || message;
    }

    throw new Error(message);
  }

  return response.json();
}

export const hospitalApi = {
  login: async (hospitalId, username, pin) => {
    const response = await request('/users/login', {
      method: 'POST',
      body: JSON.stringify({ hospitalId, username, pin }),
    });
    return response.data;
  },

  getCurrentSession: async () => {
    const response = await request('/users/session');
    return response.data;
  },

  getBranches: async (options = {}) => {
    const query = options.includeInactive ? '?includeInactive=true' : '';
    const response = await request(`/branches${query}`);
    return response.data;
  },

  getHospitals: async () => {
    try {
      const response = await request('/hospitals');
      return {
        ...hospitalManagementData,
        records: response.data,
      };
    } catch (error) {
      return hospitalManagementData;
    }
  },

  createHospital: async (payload) => {
    const response = await request('/hospitals', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  updateHospital: async (id, payload) => {
    const response = await request(`/hospitals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  getCurrentSubscription: async () => {
    const response = await request('/subscriptions/current');
    return response.data;
  },

  activateSubscriptionCode: async (activationCode) => {
    const response = await request('/subscriptions/activate', {
      method: 'POST',
      body: JSON.stringify({ activationCode }),
    });
    return response.data;
  },

  initializeSubscriptionPayment: async (payload) => {
    const response = await request('/subscriptions/paystack/initialize', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  verifySubscriptionPayment: async (reference) => {
    const response = await request(`/subscriptions/paystack/verify?reference=${encodeURIComponent(reference)}`);
    return response.data;
  },

  getDashboardData: async () => {
    try {
      const response = await request('/overview');
      return response.data;
    } catch (error) {
      return dashboardData;
    }
  },

  getPatientModuleData: async () => {
    try {
      const response = await request('/patients');
      return {
        ...patientModuleData,
        records: response.data,
      };
    } catch (error) {
      return patientModuleData;
    }
  },

  getPatientProfile: async (id) => {
    const response = await request(`/patients/${id}/profile`);
    return response.data;
  },

  createPatient: async (payload) => {
    const response = await request('/patients', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  updatePatient: async (id, payload) => {
    const response = await request(`/patients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  searchPatients: async (query) => {
    if (!query.trim()) {
      return [];
    }

    const response = await request(`/patients/search?q=${encodeURIComponent(query)}`);
    return response.data;
  },

  getVisitFlowModuleData: async () => {
    try {
      const response = await request('/visits');
      return {
        ...visitFlowModuleData,
        records: response.data,
      };
    } catch (error) {
      return visitFlowModuleData;
    }
  },

  createVisit: async (payload) => {
    const response = await request('/visits', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  updateVisit: async (id, payload) => {
    const response = await request(`/visits/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  getAppointmentModuleData: async () => {
    try {
      const response = await request('/appointments');
      return {
        ...appointmentModuleData,
        queue: response.data,
      };
    } catch (error) {
      return appointmentModuleData;
    }
  },

  getPricingModuleData: async () => {
    try {
      const response = await request('/pricing?includeInactive=true');
      return {
        ...pricingModuleData,
        records: response.data,
      };
    } catch (error) {
      return pricingModuleData;
    }
  },

  createPricingItem: async (payload) => {
    const response = await request('/pricing', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  updatePricingItem: async (id, payload) => {
    const response = await request(`/pricing/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  getDutyRosterModuleData: async () => {
    try {
      const response = await request('/duty-roster');
      return {
        ...dutyRosterModuleData,
        records: response.data,
      };
    } catch (error) {
      return dutyRosterModuleData;
    }
  },

  createDutyRosterEntry: async (payload) => {
    const response = await request('/duty-roster', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  updateDutyRosterEntry: async (id, payload) => {
    const response = await request(`/duty-roster/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  createAppointment: async (payload) => {
    const response = await request('/appointments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  updateAppointment: async (id, payload) => {
    const response = await request(`/appointments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  getDepartmentModuleData: async () => {
    try {
      const [queueResult, departmentResult, categoryResult, brandingResult] = await Promise.allSettled([
        request('/visits/queues'),
        request('/departments?includeInactive=true'),
        request('/department-categories?includeInactive=true'),
        request('/branding'),
      ]);

      const queueData =
        queueResult.status === 'fulfilled' ? queueResult.value.data : departmentModuleData;
      const registry =
        departmentResult.status === 'fulfilled' ? departmentResult.value.data : departmentModuleData.registry;
      const categories =
        categoryResult.status === 'fulfilled'
          ? categoryResult.value.data
          : buildFallbackDepartmentCategories(registry);
      const branding =
        brandingResult.status === 'fulfilled' ? brandingResult.value.data : departmentModuleData.branding;

      return {
        ...departmentModuleData,
        ...(queueData || {}),
        registry,
        categories,
        branding,
      };
    } catch (error) {
      return departmentModuleData;
    }
  },

  getDepartments: async (options = {}) => {
    const query = options.includeInactive ? '?includeInactive=true' : '';
    const response = await request(`/departments${query}`);
    return response.data;
  },

  createDepartment: async (payload) => {
    const response = await request('/departments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  updateDepartment: async (id, payload) => {
    const response = await request(`/departments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  createDepartmentCategory: async (payload) => {
    const response = await request('/department-categories', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  updateDepartmentCategory: async (id, payload) => {
    const response = await request(`/department-categories/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  getBillingModuleData: async () => {
    try {
      const [billingResponse, brandingResponse] = await Promise.allSettled([
        request('/billing'),
        request('/branding'),
      ]);

      const resolvedBilling =
        billingResponse.status === 'fulfilled' ? billingResponse.value.data : billingModuleData;
      const resolvedBranding =
        brandingResponse.status === 'fulfilled' ? brandingResponse.value.data : billingModuleData.branding;

      return {
        ...billingModuleData,
        transactions: resolvedBilling.transactions || [],
        pharmacyQueue: resolvedBilling.pharmacyQueue || [],
        receipts: resolvedBilling.receipts || [],
        branding: resolvedBranding,
      };
    } catch (error) {
      return billingModuleData;
    }
  },

  getBranding: async () => {
    const response = await request('/branding');
    return response.data;
  },

  updateBranding: async (payload) => {
    const response = await request('/branding', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  createInvoice: async (payload) => {
    const response = await request('/billing/invoices', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  updateInvoice: async (id, payload) => {
    const response = await request(`/billing/invoices/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  getInvoiceDocument: async (id) => {
    const response = await request(`/billing/invoices/${id}`);
    return response.data;
  },

  getReceiptDocument: async (id) => {
    const response = await request(`/billing/receipts/${id}`);
    return response.data;
  },

  createPrescription: async (payload) => {
    const response = await request('/billing/prescriptions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  updatePrescription: async (id, payload) => {
    const response = await request(`/billing/prescriptions/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  getUsers: async () => {
    try {
      const response = await request('/users');
      return response.data;
    } catch (error) {
      return userModuleData.records;
    }
  },

  createUser: async (payload) => {
    const response = await request('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return response.data;
  },

  updateUser: async (id, payload) => {
    const response = await request(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    return response.data;
  },
};
