import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Branch, RoleType } from '../types';
import { api } from '../lib/api';

interface AuthContextType {
  user: User | null;
  branches: Branch[];
  activeBranch: Branch | null;
  activeBranchId: string;
  setActiveBranchId: (id: string) => void;
  login: (username: string, password?: string, branchId?: string) => Promise<void>;
  logout: () => void;
  hasPermission: (permissionId: string) => boolean;
  switchUserAccount: (userId: string) => void;
  refreshBranches: () => Promise<void>;
  updateUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<string>('branch-1');
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadBranches = async () => {
    try {
      const data = await api.get('/branches');
      setBranches(data);
    } catch (e) {
      console.error('Failed to load branches', e);
    }
  };

  useEffect(() => {
    // Load branches
    loadBranches();

    // Check stored user and token on load
    const storedUser = localStorage.getItem('pos_user');
    const storedToken = localStorage.getItem('pos_token');
    
    if (storedUser && storedToken) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        setPermissions(parsedUser.permissions || []);
        if (parsedUser.active_branch_id) {
          setActiveBranchId(parsedUser.active_branch_id);
        }
      } catch (e) {
        console.error('Failed to parse stored user', e);
        localStorage.removeItem('pos_user');
        localStorage.removeItem('pos_token');
      }
    }
    setLoading(false);
  }, []);

  const activeBranch = branches.find((b) => b.id === activeBranchId) || branches[0] || null;

  const login = async (username: string, password?: string, branchId?: string) => {
    try {
      const response = await api.post('/auth/login', { username, password, branch_id: branchId });
      if (response && response.token && response.user) {
        localStorage.setItem('pos_token', response.token);
        localStorage.setItem('pos_user', JSON.stringify(response.user));
        setUser(response.user);
        setPermissions(response.user.permissions || []);
        if (response.user.active_branch_id) {
          setActiveBranchId(response.user.active_branch_id);
        }
      } else {
        throw new Error('Response API login tidak valid');
      }
    } catch (e: any) {
      console.error('Login error:', e);
      throw new Error(e.message || 'Username atau password salah');
    }
  };

  const logout = () => {
    localStorage.removeItem('pos_token');
    localStorage.removeItem('pos_user');
    setUser(null);
    setPermissions([]);
  };

  const switchUserAccount = async (userId: string) => {
    try {
      const users = await api.get('/auth/users');
      const target = users.find((u: any) => u.id === userId);
      if (target) {
        // Mock a quick switch for admin convenience
        const dummyToken = `token-${target.id}-${Date.now()}`;
        const role = target.role_id;
        
        // Fetch role permissions
        const rolesRes = await api.get('/auth/roles');
        const rolePermissions = rolesRes.role_permissions
          .filter((rp: any) => rp.role_id === role)
          .map((rp: any) => rp.permission_id);

        const updatedUser = {
          ...target,
          role_name: rolesRes.roles.find((r: any) => r.id === role)?.name || role,
          permissions: rolePermissions,
          active_branch_id: target.branch_ids?.[0] || 'branch-1'
        };

        localStorage.setItem('pos_token', dummyToken);
        localStorage.setItem('pos_user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        setPermissions(rolePermissions);
        if (updatedUser.active_branch_id) {
          setActiveBranchId(updatedUser.active_branch_id);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const hasPermission = (permissionId: string) => {
    if (user?.role_id === 'owner') return true;
    return permissions.includes(permissionId);
  };

  const updateUser = (updatedUser: User | null) => {
    setUser(updatedUser);
    if (updatedUser) {
      setPermissions(updatedUser.permissions || []);
      if (updatedUser.active_branch_id) {
        setActiveBranchId(updatedUser.active_branch_id);
      }
    } else {
      setPermissions([]);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm font-semibold tracking-wider">Memuat Akun...</span>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        branches,
        activeBranch,
        activeBranchId,
        setActiveBranchId,
        login,
        logout,
        hasPermission,
        switchUserAccount,
        refreshBranches: loadBranches,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
