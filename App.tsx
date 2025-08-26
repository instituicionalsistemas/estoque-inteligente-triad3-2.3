import React, { useState, useEffect } from 'react';
import LoginScreen from './screens/LoginScreen';
import AdminScreen from './screens/AdminScreen';
import DashboardScreen from './screens/DashboardScreen';
import TrafficManagerDashboardScreen from './screens/TrafficManagerDashboardScreen';
import SalespersonDashboardScreen from './screens/SalespersonDashboardScreen';
import Header from './components/Header';
import { Theme, View, UserRole, TeamMember, AdminUser } from './types';
import { DataProvider, useData } from './hooks/useMockData';
import AdminDashboardScreen from './screens/AdminDashboardScreen';
import AdminSettingsModal from './components/AdminSettingsModal';
import LoadingScreen from './components/LoadingScreen';

interface AppContentProps {
  onLogout: () => void;
}


const AppContent: React.FC<AppContentProps> = ({ onLogout }) => {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loggedInUser, setLoggedInUser] = useState<TeamMember | null>(null);
  const [currentView, setCurrentView] = useState<View>('admin');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  const [isAdminSettingsOpen, setIsAdminSettingsOpen] = useState(false);
  const { teamMembers, logActivity, isLoading: isDataLoading } = useData();
  const [isLoading, setIsLoading] = useState(false); // For login action

  useEffect(() => {
    const storedUserRole = sessionStorage.getItem('userRole') as UserRole | null;
    const storedUserId = sessionStorage.getItem('userId');
    const storedAdminUser = sessionStorage.getItem('adminUser');

    if (storedUserRole === 'admin' && storedAdminUser) {
        setUserRole('admin');
        setCurrentView('admin');
    } else if (storedUserRole && storedUserId) {
      const user = teamMembers.find(tm => tm.id === storedUserId);
      if(user) {
        let role: UserRole = 'company';
        if (user.role === 'Gestor de Tráfego') role = 'traffic_manager';
        else if (user.role === 'Vendedor') role = 'salesperson';
        
        setUserRole(role);
        setLoggedInUser(user);
        setCurrentView('dashboard');
      }
    }
  }, [teamMembers]);

  const handleLogin = (role: UserRole, user?: TeamMember | AdminUser) => {
    setIsLoading(true);
    
    setTimeout(() => {
      if (role === 'admin') {
        setUserRole('admin');
        sessionStorage.setItem('userRole', 'admin');
        if (user) {
            sessionStorage.setItem('adminUser', JSON.stringify(user));
        }
        setCurrentView('admin');
        logActivity('ADMIN_LOGIN_SUCCESS', 'Admin logado com sucesso.');
      } else if (user && 'companyId' in user) { // Type guard to ensure it's a TeamMember
          const teamMember = user as TeamMember;
          let specificRole: UserRole = 'company';
          if (teamMember.role === 'Gestor de Tráfego') {
            specificRole = 'traffic_manager';
          } else if (teamMember.role === 'Vendedor') {
            specificRole = 'salesperson';
          }
          
          setUserRole(specificRole);
          setLoggedInUser(teamMember);
          sessionStorage.setItem('userRole', specificRole);
          sessionStorage.setItem('userId', teamMember.id);
          setCurrentView('dashboard');
          logActivity('USER_LOGIN_SUCCESS', `Usuário ${teamMember.name} logado.`, { companyId: teamMember.companyId, userId: teamMember.id });
      }
      setIsLoading(false);
    }, 1500); // Reduced loading time
  };
  
  const handleLogout = () => {
    setUserRole(null);
    setLoggedInUser(null);
    setSelectedCompanyId(null);
    sessionStorage.removeItem('userRole');
    sessionStorage.removeItem('userId');
    sessionStorage.removeItem('adminUser');
  };
  
  const handleSelectCompany = (id: string) => {
      setSelectedCompanyId(id);
  };

  const handleBackToAdminDashboard = () => {
      setSelectedCompanyId(null);
  };

  if (isDataLoading || isLoading) {
    return <LoadingScreen />;
  }

  if (!userRole) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const renderUserDashboard = () => {
    if (!loggedInUser && userRole !== 'admin') {
        handleLogout();
        return null;
    }

    if (userRole === 'traffic_manager' && loggedInUser) {
      return <TrafficManagerDashboardScreen user={loggedInUser} onLogout={handleLogout} />;
    }
    if (userRole === 'salesperson' && loggedInUser) {
        return <SalespersonDashboardScreen user={loggedInUser} onLogout={handleLogout} />;
    }
    return <DashboardScreen onLogout={handleLogout} companyId={loggedInUser?.companyId} />;
  }
  
  const renderAdminContent = () => {
      if(selectedCompanyId){
          return <DashboardScreen onLogout={handleLogout} companyId={selectedCompanyId} />;
      }
      if(currentView === 'admin') {
          return <AdminScreen />;
      }
      return <AdminDashboardScreen onCompanySelect={handleSelectCompany} />;
  }

  return (
    <div className="min-h-screen bg-dark-background text-dark-text transition-colors duration-300 flex flex-col">
      <div className="flex-grow w-full max-w-screen-2xl mx-auto p-4 sm:p-6 lg:p-8">
          {userRole === 'admin' && (
            <>
              {selectedCompanyId ? (
                 <div className="flex justify-start mb-6">
                   <button 
                    onClick={handleBackToAdminDashboard}
                    className="px-4 py-2 text-sm font-medium rounded-lg text-dark-secondary hover:bg-dark-card/50 transition-colors"
                   >
                     &larr; Voltar para Dashboard de Empresas
                   </button>
                </div>
              ) : (
                 <Header 
                  currentView={currentView} 
                  setCurrentView={setCurrentView} 
                  onOpenSettings={() => setIsAdminSettingsOpen(true)}
                  onLogout={handleLogout}
                />
              )}
            </>
          )}
          <main>
            {userRole === 'admin' 
              ? renderAdminContent()
              : renderUserDashboard()
            }
          </main>
      </div>
       <AdminSettingsModal isOpen={isAdminSettingsOpen} onClose={() => setIsAdminSettingsOpen(false)} />
        <footer className="w-full text-center py-4 text-dark-secondary text-xs border-t border-dark-border/20">
            Powered by: Triad3 Inteligência Digital - Chega de Imitações!
        </footer>
    </div>
  );
}


const App: React.FC = () => {
  const [theme] = useState<Theme>('dark'); // Força o tema escuro

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);


  return (
    <DataProvider>
      <AppContent onLogout={() => { /* Lógica de logout global, se necessário */ }} />
    </DataProvider>
  );
};

export default App;