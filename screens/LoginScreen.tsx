import React, { useState, FormEvent } from 'react';
import Spline from '@splinetool/react-spline';
import type { UserRole, Company, TeamMember, AdminUser } from '../types';
import { useData } from '../hooks/useMockData';
import { TriadLogo } from '../components/icons/TriadLogo';
import { UploadIcon } from '../components/icons/UploadIcon';
import InfoModal from '../components/InfoModal';
import { EyeIcon } from '../components/icons/EyeIcon';
import { EyeOffIcon } from '../components/icons/EyeOffIcon';
import { supabase } from '../utils/supabase';

interface LoginScreenProps {
  onLogin: (role: UserRole, user?: TeamMember | AdminUser) => void;
}

const LoginForm: React.FC<{ onLogin: (role: UserRole, user?: TeamMember | AdminUser) => void; onSwitchToRegister: () => void; }> = ({ onLogin, onSwitchToRegister }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            // 1. Check if it's an admin user first
            const { data: adminUser, error: adminError } = await supabase
                .from('admin_users')
                .select('*')
                .eq('email', email)
                .single();

            // If an admin user is found and password matches
            // NOTE: This is a temporary plain text password check. 
            // A secure backend should use a hashing algorithm like bcrypt.
            if (adminUser && adminUser.encrypted_password === password) {
                onLogin('admin', adminUser);
                setIsLoading(false);
                return;
            }
            
            // 2. If not an admin, check for team members
            const { data: user, error: userError } = await supabase
                .from('team_members')
                .select(`
                    *,
                    companies (
                        is_active
                    )
                `)
                .eq('email', email)
                .single();
            
            // @ts-ignore
            if (user && user.companies?.is_active && user.encrypted_password === password) {
                // @ts-ignore
                const { companies, ...restOfUser } = user;
                const roleForLogin: UserRole = user.role === 'Gestor de Tráfego' ? 'traffic_manager' : user.role === 'Vendedor' ? 'salesperson' : 'company';
                
                // Map snake_case from DB to camelCase for the app state
                const mappedUser: TeamMember = {
                    id: restOfUser.id,
                    companyId: restOfUser.company_id,
                    name: restOfUser.name,
                    email: restOfUser.email,
                    phone: restOfUser.phone,
                    avatarUrl: restOfUser.avatar_url,
                    monthlySalesGoal: restOfUser.monthly_sales_goal,
                    role: restOfUser.role,
                };
                
                onLogin(roleForLogin, mappedUser);
            } else {
                // @ts-ignore
                if (user && !user.companies?.is_active) {
                     setError('Sua empresa está pendente de aprovação. Contate o suporte.');
                } else {
                     // Generic error for both failed admin and user attempts
                     setError('Credenciais inválidas. Tente novamente.');
                }
            }
        } catch (err) {
            setError('Ocorreu um erro ao tentar fazer login.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <>
            <div className="text-center space-y-4">
                <TriadLogo className="w-20 h-20 mx-auto text-dark-primary" />
                <h2 className="text-3xl font-extrabold text-dark-text">Estoque Inteligente Triad3</h2>
                <p className="mt-2 text-dark-secondary">Acesse seu dashboard de inteligência digital.</p>
            </div>
            <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                <div className="space-y-4">
                    <input id="email-address" name="email" type="email" autoComplete="email" required className="relative block w-full px-4 py-3 border border-dark-border placeholder-dark-secondary text-dark-text bg-dark-background rounded-lg focus:outline-none focus:ring-2 focus:ring-dark-primary sm:text-sm transition-colors" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
                    <div className="relative">
                        <input 
                            id="password" 
                            name="password" 
                            type={showPassword ? 'text' : 'password'} 
                            autoComplete="current-password" 
                            required 
                            className="block w-full px-4 py-3 pr-12 border border-dark-border placeholder-dark-secondary text-dark-text bg-dark-background rounded-lg focus:outline-none focus:ring-2 focus:ring-dark-primary sm:text-sm transition-colors" 
                            placeholder="Senha" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 flex items-center px-4 text-dark-secondary hover:text-dark-primary transition-colors"
                          aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
                        >
                          {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                    </div>
                </div>
                {error && <p className="text-center text-sm text-red-400">{error}</p>}
                <div>
                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-dark-background bg-dark-primary hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-dark-primary transition-all duration-200 disabled:opacity-50"
                    >
                        {isLoading ? 'Entrando...' : 'Entrar'}
                    </button>
                </div>
            </form>
            <p className="text-center text-sm text-dark-secondary">
                Não tem conta?{' '}
                <button onClick={onSwitchToRegister} className="font-medium text-dark-primary hover:underline">
                    Cadastre-se
                </button>
            </p>
        </>
    )
}

const RegisterForm: React.FC<{ onSwitchToLogin: () => void; }> = ({ onSwitchToLogin }) => {
    const { addCompany } = useData();
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [isInfoModalOpen, setInfoModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState<Omit<Company, 'id' | 'isActive' | 'monthlySalesGoal'>>({
        logoUrl: '',
        name: '',
        cnpj: '',
        phone: '',
        email: '',
        ownerEmail: '',
        instagram: '',
        ownerName: '',
        ownerPhone: '',
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setLogoPreview(base64String);
                setFormData(prev => ({ ...prev, logoUrl: base64String }));
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            await addCompany(formData);
            setInfoModalOpen(true);
        } catch (error) {
            console.error("Failed to register company", error);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleCloseModal = () => {
        setInfoModalOpen(false);
        onSwitchToLogin();
    };

    return (
        <>
            <div className="text-center space-y-2">
                <h2 className="text-3xl font-extrabold text-dark-text">Cadastre sua Empresa</h2>
                <p className="text-dark-secondary">Preencha os dados para iniciar a parceria.</p>
            </div>
            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                 <div>
                    <label className="block text-sm font-medium text-dark-secondary mb-2">Logo da Empresa</label>
                    <div className="mt-1 flex items-center gap-4">
                        <div className="w-20 h-20 flex-shrink-0 rounded-full bg-dark-background border-2 border-dashed border-dark-border flex items-center justify-center">
                            {logoPreview ? <img src={logoPreview} alt="Preview" className="w-full h-full object-cover rounded-full" /> : <UploadIcon className="w-8 h-8 text-dark-secondary" />}
                        </div>
                        <label htmlFor="logo-upload" className="cursor-pointer bg-dark-border/50 hover:bg-dark-border text-dark-text font-medium py-2 px-4 rounded-md transition-colors text-sm">
                            <span>Selecionar Imagem</span>
                        </label>
                        <input id="logo-upload" name="logo-upload" type="file" className="sr-only" onChange={handleLogoChange} accept="image/png, image/jpeg" required/>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
                    <input name="name" placeholder="Nome da Empresa" required onChange={handleChange} className="input-field" />
                    <input name="cnpj" placeholder="CNPJ" required onChange={handleChange} className="input-field" />
                    <input name="phone" placeholder="Telefone da Empresa" required onChange={handleChange} className="input-field" />
                    <input name="email" type="email" placeholder="E-mail da Empresa" required onChange={handleChange} className="input-field" />
                    <input name="ownerName" placeholder="Nome do Proprietário" required onChange={handleChange} className="input-field" />
                    <input name="ownerEmail" type="email" placeholder="E-mail do Proprietário (será seu login)" required onChange={handleChange} className="input-field" />
                    <input name="ownerPhone" placeholder="WhatsApp do Proprietário" required onChange={handleChange} className="input-field" />
                    <input name="instagram" placeholder="@instagram" onChange={handleChange} className="input-field" />
                </div>
                
                <div>
                    <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 mt-4 border border-transparent text-sm font-bold rounded-lg text-dark-background bg-dark-primary hover:bg-opacity-90 transition-all duration-200 disabled:opacity-50">
                        {isLoading ? 'Enviando...' : 'Concluir Cadastro'}
                    </button>
                </div>
            </form>
            <p className="text-center text-sm text-dark-secondary">
                Já tem uma conta?{' '}
                <button onClick={onSwitchToLogin} className="font-medium text-dark-primary hover:underline">
                    Faça login
                </button>
            </p>
            <InfoModal 
                isOpen={isInfoModalOpen} 
                onClose={handleCloseModal}
                title="Cadastro Realizado com Sucesso!"
            >
                Sua solicitação foi enviada para análise. Você será notificado no WhatsApp assim que seu acesso for liberado pela nossa equipe.
            </InfoModal>
            <style>{`
                .input-field {
                    position: relative;
                    display: block;
                    width: 100%;
                    padding: 0.75rem 1rem;
                    border: 1px solid #243049;
                    color: #E0E0E0;
                    background-color: #0A0F1E;
                    border-radius: 0.5rem;
                }
                .input-field:focus {
                    outline: none;
                    box-shadow: 0 0 0 2px #00D1FF;
                }
                .input-field::placeholder {
                    color: #8A93A3;
                }
            `}</style>
        </>
    )
}


const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
    const [isRegistering, setIsRegistering] = useState(false);

    return (
        <div className="min-h-screen flex flex-col relative overflow-hidden bg-dark-background">
            <div className="absolute top-0 left-0 w-full h-full z-0">
                <Spline
                    scene="https://prod.spline.design/Cwylo3ZWZkXyY5DK/scene.splinecode" 
                />
            </div>
            <main className="flex-grow flex items-center justify-center px-4 z-10">
                <div className="w-full max-w-xs sm:max-w-lg p-6 sm:p-8 space-y-6 bg-dark-card/80 backdrop-blur-md rounded-3xl shadow-2xl shadow-black/20 border border-dark-border/50 animate-fade-in">
                    {isRegistering 
                        ? <RegisterForm onSwitchToLogin={() => setIsRegistering(false)} /> 
                        : <LoginForm onLogin={onLogin} onSwitchToRegister={() => setIsRegistering(true)} />
                    }
                </div>
            </main>
            <footer className="w-full text-center py-4 text-dark-secondary text-xs border-t border-dark-border/20 z-10 bg-dark-card/20 backdrop-blur-sm">
                Powered by: Triad3 Inteligência Digital - Chega de Imitações!
            </footer>
        </div>
    );
};

export default LoginScreen;