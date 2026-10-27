import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { MOCK_USERS } from '../../du-lieu-demo/mockUsers';
import { MOCK_REQUESTS } from '../../du-lieu-demo/mockRequests';
import { MOCK_FACILITIES } from '../../du-lieu-demo/mockFacilities';
import { MOCK_REPAIR_PLANS } from '../../du-lieu-demo/mockRepairPlans';
import { MOCK_EXTERNAL_WORKS } from '../../du-lieu-demo/mockExternalWorks';
import { MOCK_NOTIFICATIONS } from '../../du-lieu-demo/mockNotifications';
import { STORAGE_KEYS } from '../../ha-tang/luu-tru/storageKeys';
import { hasStorageKey, readStorage, removeStorage, writeStorage } from '../../ha-tang/luu-tru/localStorageAdapter';
import { authenticateUser, findUserById } from '../../tinh-nang/xac-thuc/dich-vu/authService';
import { addRequestToList, updateRequestInList } from '../../tinh-nang/yeu-cau-sua-chua/dich-vu/requestService';
import { addFacilityToList, updateFacilityInList } from '../../tinh-nang/co-so-vat-chat/dich-vu/facilityService';
import { addRepairPlanToList, updateRepairPlanInList } from '../../tinh-nang/phuong-an-sua-chua/dich-vu/repairPlanService';
import { addExternalWorkToList, updateExternalWorkInList } from '../../tinh-nang/thue-ngoai/dich-vu/externalWorkService';

const AppContext = createContext(null);

function getInitialCollection(key, fallback) {
  return hasStorageKey(STORAGE_KEYS.INITIALIZED) ? readStorage(key, fallback) : fallback;
}

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => readStorage(STORAGE_KEYS.CURRENT_USER, null));
  const [requests, setRequests] = useState(() => getInitialCollection(STORAGE_KEYS.REQUESTS, MOCK_REQUESTS));
  const [facilities, setFacilities] = useState(() => getInitialCollection(STORAGE_KEYS.FACILITIES, MOCK_FACILITIES));
  const [repairPlans, setRepairPlans] = useState(() => getInitialCollection(STORAGE_KEYS.REPAIR_PLANS, MOCK_REPAIR_PLANS));
  const [externalWorks, setExternalWorks] = useState(() => getInitialCollection(STORAGE_KEYS.EXTERNAL_WORKS, MOCK_EXTERNAL_WORKS));
  const [notifications, setNotifications] = useState(() => readStorage(STORAGE_KEYS.NOTIFICATIONS, MOCK_NOTIFICATIONS));
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  useEffect(() => {
    if (!hasStorageKey(STORAGE_KEYS.INITIALIZED)) {
      writeStorage(STORAGE_KEYS.REQUESTS, MOCK_REQUESTS);
      writeStorage(STORAGE_KEYS.FACILITIES, MOCK_FACILITIES);
      writeStorage(STORAGE_KEYS.REPAIR_PLANS, MOCK_REPAIR_PLANS);
      writeStorage(STORAGE_KEYS.EXTERNAL_WORKS, MOCK_EXTERNAL_WORKS);
      writeStorage(STORAGE_KEYS.NOTIFICATIONS, MOCK_NOTIFICATIONS);
      writeStorage(STORAGE_KEYS.INITIALIZED, true);
    }
  }, []);

  useEffect(() => writeStorage(STORAGE_KEYS.REQUESTS, requests), [requests]);
  useEffect(() => writeStorage(STORAGE_KEYS.FACILITIES, facilities), [facilities]);
  useEffect(() => writeStorage(STORAGE_KEYS.REPAIR_PLANS, repairPlans), [repairPlans]);
  useEffect(() => writeStorage(STORAGE_KEYS.EXTERNAL_WORKS, externalWorks), [externalWorks]);
  useEffect(() => { if (currentUser) writeStorage(STORAGE_KEYS.CURRENT_USER, currentUser); }, [currentUser]);

  const addToast = useCallback((message, type = 'success') => {
    const id = ++toastIdRef.current;
    setToasts((previous) => [...previous, { id, message, type }]);
    setTimeout(() => setToasts((previous) => previous.filter((toast) => toast.id !== id)), 3500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
  }, []);

  const login = useCallback((username, password) => {
    const result = authenticateUser(MOCK_USERS, username, password);
    if (result.success) {
      setCurrentUser(result.user);
      writeStorage(STORAGE_KEYS.CURRENT_USER, result.user);
    }
    return result;
  }, []);

  const switchUser = useCallback((userId) => {
    const user = findUserById(MOCK_USERS, userId);
    if (user) {
      setCurrentUser(user);
      writeStorage(STORAGE_KEYS.CURRENT_USER, user);
    }
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    removeStorage(STORAGE_KEYS.CURRENT_USER);
  }, []);

  const updateRequest = useCallback((id, updates) => {
    setRequests((previous) => updateRequestInList(previous, id, updates));
  }, []);
  const addRequest = useCallback((request) => setRequests((previous) => addRequestToList(previous, request)), []);
  const updateFacility = useCallback((id, updates) => {
    setFacilities((previous) => updateFacilityInList(previous, id, updates));
  }, []);
  const addFacility = useCallback((facility) => setFacilities((previous) => addFacilityToList(previous, facility)), []);
  const updateRepairPlan = useCallback((id, updates) => {
    setRepairPlans((previous) => updateRepairPlanInList(previous, id, updates));
  }, []);
  const addRepairPlan = useCallback((plan) => setRepairPlans((previous) => addRepairPlanToList(previous, plan)), []);
  const updateExternalWork = useCallback((id, updates) => {
    setExternalWorks((previous) => updateExternalWorkInList(previous, id, updates));
  }, []);
  const addExternalWork = useCallback((work) => setExternalWorks((previous) => addExternalWorkToList(previous, work)), []);

  const resetDemoData = useCallback(() => {
    setRequests(MOCK_REQUESTS);
    setFacilities(MOCK_FACILITIES);
    setRepairPlans(MOCK_REPAIR_PLANS);
    setExternalWorks(MOCK_EXTERNAL_WORKS);
    setNotifications(MOCK_NOTIFICATIONS);
    writeStorage(STORAGE_KEYS.REQUESTS, MOCK_REQUESTS);
    writeStorage(STORAGE_KEYS.FACILITIES, MOCK_FACILITIES);
    writeStorage(STORAGE_KEYS.REPAIR_PLANS, MOCK_REPAIR_PLANS);
    writeStorage(STORAGE_KEYS.EXTERNAL_WORKS, MOCK_EXTERNAL_WORKS);
    writeStorage(STORAGE_KEYS.NOTIFICATIONS, MOCK_NOTIFICATIONS);
    addToast('Đã khôi phục dữ liệu demo thành công', 'success');
  }, [addToast]);

  const value = {
    currentUser, login, switchUser, logout,
    requests, facilities, repairPlans, externalWorks, notifications, setNotifications,
    updateRequest, addRequest, updateFacility, addFacility,
    updateRepairPlan, addRepairPlan, updateExternalWork, addExternalWork,
    resetDemoData, toasts, addToast, removeToast, users: MOCK_USERS,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
}
