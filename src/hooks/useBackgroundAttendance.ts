import { useEffect, useState } from 'react';
import * as BackgroundFetch from 'expo-background-fetch';
import { BackgroundAttendanceService } from '../services/backgroundAttendance';

export const useBackgroundAttendance = () => {
  const [isBackgroundTaskRegistered, setIsBackgroundTaskRegistered] = useState(false);
  const [backgroundFetchStatus, setBackgroundFetchStatus] = useState<BackgroundFetch.BackgroundFetchStatus | null>(null);

  useEffect(() => {
    initializeBackgroundTask();
  }, []);

  const initializeBackgroundTask = async () => {
    try {
      // Check if user is authenticated first
      const isAuthenticated = await BackgroundAttendanceService.isUserAuthenticated();
      if (!isAuthenticated) {
        console.log('User not authenticated, skipping background task initialization');
        return;
      }

      // Check current background fetch status
      const status = await BackgroundAttendanceService.getBackgroundFetchStatus();
      setBackgroundFetchStatus(status);

      // Register the background task if background fetch is available
      if (status === BackgroundFetch.BackgroundFetchStatus.Available) {
        const registered = await BackgroundAttendanceService.registerBackgroundTask();
        setIsBackgroundTaskRegistered(registered);
      } else {
        console.warn('Background fetch is not available:', status);
      }
    } catch (error) {
      console.error('Failed to initialize background task:', error);
    }
  };

  const startBackgroundAttendance = async () => {
    const registered = await BackgroundAttendanceService.registerBackgroundTask();
    setIsBackgroundTaskRegistered(registered);
    return registered;
  };

  const stopBackgroundAttendance = async () => {
    const unregistered = await BackgroundAttendanceService.unregisterBackgroundTask();
    setIsBackgroundTaskRegistered(!unregistered);
    return unregistered;
  };

  const testAttendanceCheck = async () => {
    return await BackgroundAttendanceService.manualAttendanceCheck();
  };

  const getStatusText = () => {
    switch (backgroundFetchStatus) {
      case BackgroundFetch.BackgroundFetchStatus.Available:
        return 'Available';
      case BackgroundFetch.BackgroundFetchStatus.Denied:
        return 'Denied by user';
      case BackgroundFetch.BackgroundFetchStatus.Restricted:
        return 'Restricted by system';
      default:
        return 'Unknown';
    }
  };

  return {
    isBackgroundTaskRegistered,
    backgroundFetchStatus,
    statusText: getStatusText(),
    startBackgroundAttendance,
    stopBackgroundAttendance,
    testAttendanceCheck,
    initializeBackgroundTask,
  };
};