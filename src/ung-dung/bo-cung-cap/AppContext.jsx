import { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { MOCK_USERS } from '../../du-lieu-demo/mockUsers';
import {
  getCurrentUser,
  hasSession,
  signIn,
  signOut,
} from '../../ha-tang/api/apiClient';
import {
  createFacility as createBackendFacility,
  createPendingPlanMap,
  createRequest as createBackendRequest,
  loadBackendData,
  normalizeUser,
  persistNotificationChanges,
  persistRequestUpdate,
  stageExternalWork,
  stageRepairPlan,
  updateFacility as updateBackendFacility,
} from '../../ha-tang/api/backendDataService';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState(MOCK_USERS);
  const [requests, setRequests] = useState([]);
  const [facilities, setFacilities] = useState([]);
  const [repairPlans, setRepairPlans] = useState([]);
  const [externalWorks, setExternalWorks] = useState([]);
  const [notifications, setNotificationsState] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const toastIdRef = useRef(0);
  const activeMutationsRef = useRef(0);
  const queuedToastsRef = useRef([]);
  const failedMutationRef = useRef(false);
  const requestsRef = useRef([]);
  const facilitiesRef = useRef([]);
  const notificationsRef = useRef([]);
  const pendingPlansRef = useRef(createPendingPlanMap());
  const pendingWorksRef = useRef(new Map());

  const addToast = useCallback((message, type = 'success') => {
    if (type !== 'error' && activeMutationsRef.current > 0) {
      queuedToastsRef.current.push({ message, type });
      return;
    }
    const id = ++toastIdRef.current;
    setToasts((previous) => [...previous, { id, message, type }]);
    setTimeout(() => setToasts((previous) => previous.filter((toast) => toast.id !== id)), 3500);
  }, []);

  const beginMutation = useCallback(() => {
    activeMutationsRef.current += 1;
  }, []);

  const finishMutation = useCallback((succeeded) => {
    if (!succeeded) {
      failedMutationRef.current = true;
      queuedToastsRef.current = [];
    }
    activeMutationsRef.current -= 1;
    if (activeMutationsRef.current === 0) {
      const queuedToasts = failedMutationRef.current ? [] : queuedToastsRef.current;
      queuedToastsRef.current = [];
      failedMutationRef.current = false;
      queuedToasts.forEach(({ message, type }) => addToast(message, type));
    }
  }, [addToast]);

  const removeToast = useCallback((id) => {
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
  }, []);

  const applySnapshot = useCallback((snapshot) => {
    requestsRef.current = snapshot.requests;
    facilitiesRef.current = snapshot.facilities;
    notificationsRef.current = snapshot.notifications;
    setUsers(snapshot.users);
    setRequests(snapshot.requests);
    setFacilities(snapshot.facilities);
    setRepairPlans(snapshot.repairPlans);
    setExternalWorks(snapshot.externalWorks);
    setNotificationsState(snapshot.notifications);
  }, []);

  const refreshData = useCallback(async () => {
    const snapshot = await loadBackendData();
    applySnapshot(snapshot);
    return snapshot;
  }, [applySnapshot]);

  useEffect(() => {
    let active = true;
    const restoreSession = async () => {
      const hadSession = hasSession();
      try {
        if (hadSession) {
          const user = await getCurrentUser();
          const snapshot = await loadBackendData();
          if (active) {
            applySnapshot(snapshot);
            setCurrentUser(normalizeUser(user));
          }
        }
      } catch (error) {
        signOut();
        if (hadSession) {
          addToast(
            `Không khôi phục được phiên đăng nhập: ${error instanceof Error ? error.message : 'Lỗi máy chủ.'}`,
            'error'
          );
        }
      } finally {
        if (active) setIsLoading(false);
      }
    };
    restoreSession();
    return () => {
      active = false;
    };
  }, [addToast, applySnapshot]);

  const login = useCallback(async (username, password, rememberMe = true) => {
    try {
      const user = await signIn(username, password, rememberMe);
      const snapshot = await loadBackendData();
      applySnapshot(snapshot);
      const normalizedUser = normalizeUser(user);
      setCurrentUser(normalizedUser);
      return { success: true, user: normalizedUser };
    } catch (error) {
      signOut();
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Không thể kết nối máy chủ.',
      };
    }
  }, [applySnapshot]);

  const switchUser = useCallback((userId) => {
    if (userId !== currentUser?.id) {
      addToast('Không thể đổi vai trò trực tiếp. Vui lòng đăng xuất và đăng nhập lại.', 'error');
    }
  }, [addToast, currentUser]);

  const logout = useCallback(() => {
    signOut();
    setCurrentUser(null);
    requestsRef.current = [];
    facilitiesRef.current = [];
    notificationsRef.current = [];
    pendingPlansRef.current.clear();
    pendingWorksRef.current.clear();
    setRequests([]);
    setFacilities([]);
    setRepairPlans([]);
    setExternalWorks([]);
    setNotificationsState([]);
  }, []);

  const updateRequest = useCallback(async (id, updates) => {
    beginMutation();
    await Promise.resolve();
    let succeeded = false;
    const request = requestsRef.current.find((item) => item.id === id);
    if (!request) {
      addToast(`Không tìm thấy yêu cầu ${id} để lưu.`, 'error');
      finishMutation(false);
      return false;
    }
    try {
      await persistRequestUpdate(
        request,
        updates,
        pendingPlansRef.current,
        pendingWorksRef.current
      );
      await refreshData();
      succeeded = true;
      return true;
    } catch (error) {
      addToast(
        `Không lưu được yêu cầu ${id}: ${error instanceof Error ? error.message : 'Lỗi máy chủ.'}`,
        'error'
      );
      return false;
    } finally {
      finishMutation(succeeded);
    }
  }, [addToast, beginMutation, finishMutation, refreshData]);

  const addRequest = useCallback(async (request) => {
    beginMutation();
    let succeeded = false;
    try {
      const createdRequest = await createBackendRequest(request);
      await refreshData();
      succeeded = true;
      return createdRequest;
    } catch (error) {
      addToast(
        `Không tạo được yêu cầu: ${error instanceof Error ? error.message : 'Lỗi máy chủ.'}`,
        'error'
      );
      return false;
    } finally {
      finishMutation(succeeded);
    }
  }, [addToast, beginMutation, finishMutation, refreshData]);

  const updateFacility = useCallback(async (id, updates) => {
    beginMutation();
    let succeeded = false;
    const currentFacility = facilitiesRef.current.find((item) => item.id === id || item.code === id);
    if (!currentFacility) {
      addToast(`Không tìm thấy cơ sở vật chất ${id} để lưu.`, 'error');
      finishMutation(false);
      return false;
    }
    try {
      await updateBackendFacility({ ...currentFacility, ...updates, id });
      await refreshData();
      succeeded = true;
      return true;
    } catch (error) {
      addToast(
        `Không cập nhật được cơ sở vật chất: ${error instanceof Error ? error.message : 'Lỗi máy chủ.'}`,
        'error'
      );
      return false;
    } finally {
      finishMutation(succeeded);
    }
  }, [addToast, beginMutation, finishMutation, refreshData]);

  const addFacility = useCallback(async (facility) => {
    beginMutation();
    let succeeded = false;
    try {
      await createBackendFacility(facility);
      await refreshData();
      succeeded = true;
      return true;
    } catch (error) {
      addToast(
        `Không thêm được cơ sở vật chất: ${error instanceof Error ? error.message : 'Lỗi máy chủ.'}`,
        'error'
      );
      return false;
    } finally {
      finishMutation(succeeded);
    }
  }, [addToast, beginMutation, finishMutation, refreshData]);

  const updateRepairPlan = useCallback(() => {}, []);
  const addRepairPlan = useCallback((plan) => {
    stageRepairPlan(pendingPlansRef.current, plan.requestId, plan);
  }, []);

  const updateExternalWork = useCallback((id, updates) => {
    const work = externalWorks.find((item) => item.id === id);
    if (!work) {
      addToast(`Không tìm thấy công việc thuê ngoài ${id}.`, 'error');
      return false;
    }
    stageExternalWork(pendingWorksRef.current, work.requestId, { ...work, ...updates });
    return true;
  }, [addToast, externalWorks]);

  const addExternalWork = useCallback((work) => {
    const existing = externalWorks.find((item) => item.requestId === work.requestId);
    if (existing) {
      stageExternalWork(pendingWorksRef.current, work.requestId, { ...existing, ...work });
    }
  }, [externalWorks]);

  const setNotifications = useCallback((updater) => {
    const previous = notificationsRef.current;
    const next = typeof updater === 'function' ? updater(previous) : updater;
    const visibleNext = next.filter((item) => previous.some((old) => old.id === item.id));
    notificationsRef.current = visibleNext;
    setNotificationsState(visibleNext);

    persistNotificationChanges(previous, next)
      .then(() => refreshData())
      .catch((error) => {
        notificationsRef.current = previous;
        setNotificationsState(previous);
        addToast(
          `Không cập nhật được thông báo: ${error instanceof Error ? error.message : 'Lỗi máy chủ.'}`,
          'error'
        );
      });
  }, [addToast, refreshData]);

  const resetDemoData = useCallback(async () => {
    try {
      await refreshData();
      addToast('Đã tải lại dữ liệu mới nhất từ máy chủ.', 'success');
    } catch (error) {
      addToast(
        `Không tải lại được dữ liệu: ${error instanceof Error ? error.message : 'Lỗi máy chủ.'}`,
        'error'
      );
    }
  }, [addToast, refreshData]);

  const value = {
    currentUser, login, switchUser, logout, isLoading,
    requests, facilities, repairPlans, externalWorks, notifications, setNotifications,
    updateRequest, addRequest, updateFacility, addFacility,
    updateRepairPlan, addRepairPlan, updateExternalWork, addExternalWork,
    resetDemoData, toasts, addToast, removeToast, users,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
}
