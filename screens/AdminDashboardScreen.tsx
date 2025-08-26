import React from 'react';
import { useData } from '../hooks/useMockData';
import CompanyInfoCard from '../components/CompanyInfoCard';

interface AdminDashboardScreenProps {
    onCompanySelect: (companyId: string) => void;
}

const AdminDashboardScreen: React.FC<AdminDashboardScreenProps> = ({ onCompanySelect }) => {
    const { companies, vehicles } = useData();

    return (
        <div className="animate-fade-in">
            <h1 className="text-3xl font-bold text-dark-text mb-6">Dashboard de Empresas</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {companies.map(company => {
                    const companyVehicles = vehicles.filter(v => v.companyId === company.id && v.status === 'available').length;
                    return (
                        <CompanyInfoCard
                            key={company.id}
                            company={company}
                            vehicleCount={companyVehicles}
                            onClick={() => onCompanySelect(company.id)}
                        />
                    );
                })}
            </div>
        </div>
    );
};

export default AdminDashboardScreen;
