import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivePage, Module } from './DashboardTypes';

// Handle module press
interface HandleModulePressParams {
  moduleName: string;
  moduleUniqueName?: string;
  modules: any[];
  saveLastOpenedModule: (module: any) => Promise<void>;
  setActivePage: (page: ActivePage) => void;
  isWeb: boolean;
  setAttendanceKey: React.Dispatch<React.SetStateAction<number>>;
  setShowAttendance: (show: boolean) => void;
  setShowHR: (show: boolean) => void;
  setShowCab: (show: boolean) => void;
  setShowDriver: (show: boolean) => void;
  setShowBDT: (show: boolean) => void;
  setShowMedical: (show: boolean) => void;
  setShowScoutBoy: (show: boolean) => void;
  setShowReminder: (show: boolean) => void;
  setShowBUP: (show: boolean) => void;
  setShowSiteManager: (show: boolean) => void;
  setShowEmployeeManagement: (show: boolean) => void;
  setShowHREmployeeManagement: (show: boolean) => void;
  setShowDriverManager: (show: boolean) => void;
  setShowHrManager: (show: boolean) => void;
  setShowAsset: (show: boolean) => void;
  setShowOffice: (show: boolean) => void;
  setShowAccess: (show: boolean) => void;


  Alert: any;
}

export const handleModulePress = ({
  moduleName,
  moduleUniqueName,
  modules,
  saveLastOpenedModule,
  setActivePage,
  isWeb,
  setAttendanceKey,
  setShowAttendance,
  setShowHR,
  setShowCab,
  setShowDriver,
  setShowBDT,
  setShowMedical,
  setShowScoutBoy,
  setShowReminder,
  setShowBUP,
  setShowSiteManager,
  setShowEmployeeManagement,
  setShowHREmployeeManagement,
  setShowDriverManager,
  setShowHrManager,
  setShowAsset,
  setShowOffice,
  setShowAccess,
  Alert
}: HandleModulePressParams) => {
  const key = moduleUniqueName?.toLowerCase() || moduleName.toLowerCase();
  let moduleData = null;

  if (modules.length > 0) {
    const backendModule = modules.find(
      m => m.module_unique_name === moduleUniqueName ||
        m.module_name?.toLowerCase().replace('_', ' ') === moduleName.toLowerCase()
    );
    if (backendModule) {
      moduleData = {
        title: backendModule.module_name.charAt(0).toUpperCase() +
          backendModule.module_name.slice(1).replace('_', ' '),
        iconUrl: backendModule.module_icon,
        module_unique_name: backendModule.module_unique_name
      };
    }
  }

  if (!moduleData) {
    moduleData = {
      title: moduleName,
      iconUrl: `https://cdn-icons-png.flaticon.com/512/3135/3135715.png`,
      module_unique_name: moduleUniqueName || moduleName.toLowerCase()
    };
  }

  saveLastOpenedModule(moduleData);

  // Handle web vs mobile navigation
  if (isWeb) {
    // For web, load in middle section
    const pageMap: Record<string, ActivePage> = {
      'attendance': 'attendance',
      'hr': 'hr',
      'cab': 'cab',
      'driver': 'driver',
      'bdt': 'bdt',
      'mediclaim': 'medical',
      'medical': 'medical',
      'scout': 'scoutBoy',
      'reminder': 'reminder',
      'bup': 'bup',
      'business update': 'bup',
      'site_manager': 'siteManager',
      'site manager': 'siteManager',
      'employee_management': 'employeeManagement',
      'hr_employee_management': 'hrEmployeeManager',
      'driver_manager': 'driverManager',
      'driver manager': 'driverManager',
      'hr_manager': 'hrManager',
      'hr manager': 'hrManager',
      'asset': 'asset',
      'assets': 'asset',
      'office': 'office',
      'offices': 'office',
      'access': 'access',


    };

    const targetPage = pageMap[key] || pageMap[moduleName.toLowerCase()];
    if (targetPage) {
      setActivePage(targetPage);
    } else {
      Alert.alert('Coming Soon', `${moduleName} module will be available soon!`);
    }
  } else {
    // Mobile - existing full screen behavior
    const mobileHandlers: Record<string, () => void> = {
      'attendance': () => {
        setAttendanceKey(prev => prev + 1);
        setShowAttendance(true);
      },
      'hr': () => setShowHR(true),
      'cab': () => setShowCab(true),
      'driver': () => setShowDriver(true),
      'bdt': () => setShowBDT(true),
      'mediclaim': () => setShowMedical(true),
      'medical': () => setShowMedical(true),
      'scout': () => setShowScoutBoy(true),
      'reminder': () => setShowReminder(true),
      'bup': () => setShowBUP(true),
      'business update': () => setShowBUP(true),
      'site_manager': () => setShowSiteManager(true),
      'site manager': () => setShowSiteManager(true),
      'employee_management': () => setShowEmployeeManagement(true),
      'hr_employee_management': () => setShowHREmployeeManagement(true),
      'driver_manager': () => setShowDriverManager(true),
      'driver manager': () => setShowDriverManager(true),
      'hr_manager': () => setShowHrManager(true),
      'hr manager': () => setShowHrManager(true),
      'asset': () => setShowAsset(true),
      'assets': () => setShowAsset(true),
      'office': () => setShowOffice(true),
      'offices': () => setShowOffice(true),
      'access': () => setShowAccess(true),
    };

    const handler = mobileHandlers[key] || mobileHandlers[moduleName.toLowerCase()];
    if (handler) {
      handler();
    } else {
      Alert.alert('Coming Soon', `${moduleName} module will be available soon!`);
    }
  }
};

// Save last opened module
export const saveLastOpenedModule = async (
  module: any,
  modules: any[],
  setLastOpenedModules: React.Dispatch<React.SetStateAction<Module[]>>
) => {
  try {
    const storedModules = await AsyncStorage.getItem('last_opened_modules');
    let modulesArray = storedModules ? JSON.parse(storedModules) : [];

    let moduleData = module;
    if (modules.length > 0) {
      const backendModule = modules.find(
        m => m.module_unique_name === module.module_unique_name ||
          m.module_name?.toLowerCase().replace('_', ' ') === module.title?.toLowerCase()
      );
      if (backendModule) {
        moduleData = {
          title: backendModule.module_name.charAt(0).toUpperCase() +
            backendModule.module_name.slice(1).replace('_', ' '),
          iconUrl: backendModule.module_icon,
          module_unique_name: backendModule.module_unique_name
        };
      } else if (module.module_unique_name) {
        const backendModuleByName = modules.find(
          m => m.module_unique_name === module.module_unique_name
        );
        if (backendModuleByName) {
          moduleData = {
            title: backendModuleByName.module_name.charAt(0).toUpperCase() +
              backendModuleByName.module_name.slice(1).replace('_', ' '),
            iconUrl: backendModuleByName.module_icon,
            module_unique_name: backendModuleByName.module_unique_name
          };
        }
      }
    }

    modulesArray = modulesArray.filter((m: any) =>
      m.module_unique_name !== moduleData.module_unique_name
    );

    modulesArray.unshift(moduleData);

    if (modulesArray.length > 4) {
      modulesArray = modulesArray.slice(0, 4);
    }

    await AsyncStorage.setItem('last_opened_modules', JSON.stringify(modulesArray));
    setLastOpenedModules(modulesArray);
  } catch (error) {
    console.error('Error saving last opened module:', error);
  }
};

// Get display modules
export const getDisplayModules = (modules: any[]) => {
  const defaultLastOpened = [
    { name: 'Attendance', color: '#ffb157', icon: 'book', library: 'fa5', module_unique_name: 'attendance' },
  ];

  if (modules.length > 0) {
    return modules.map(module => ({
      title: module.module_name.charAt(0).toUpperCase() + module.module_name.slice(1).replace('_', ' '),
      iconUrl: module.module_icon,
      module_unique_name: module.module_unique_name,
      is_generic: module.is_generic
    }));
  }

  return defaultLastOpened.map(item => {
    const backendModule = modules.find(m =>
      m.module_unique_name === item.module_unique_name ||
      m.module_name?.toLowerCase().replace('_', ' ') === item.name.toLowerCase()
    );
    return {
      title: item.name,
      iconUrl: backendModule ? backendModule.module_icon : `https://cdn-icons-png.flaticon.com/512/3135/3135715.png`,
      module_unique_name: item.module_unique_name || item.name.toLowerCase(),
      is_generic: true
    };
  });
};