import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Branch, RoleType } from '../types';
import { api } from '../lib/api';

interface AuthContextType {
  user: User | null;
  branches: Branch[];
  activeBranch: Branch | null;
  activeBranchId: string;
  setActiveBranchId: (id: string) => void;
  setUserRole: (role: RoleType) => void;
  hasPermission: (permissionId: string) => boolean;
  switchUserAccount: (userId: string) => void;
  refreshBranches: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [activeBranchId, setActiveBranchId] = useState<string>('branch-1');
  const [user, setUser] = useState<User>({
    id: 'user-owner',
    username: 'owner',
    full_name: 'Budi Santoso',
    email: 'budi@kopinusantara.id',
    role_id: 'owner',
    role_name: 'Owner / Direksi',
    is_active: true,
    branch_ids: ['branch-1', 'branch-2', 'branch-3'],
  });

  const [permissions, setPermissions] = useState<string[]>([
    'pos.access', 'pos.discount', 'pos.void', 'shift.manage',
    'stock.view', 'stock.opname', 'stock.transfer', 'purchase.create',
    'purchase.approve', 'accounting.view', 'reports.export',
    'kds.food', 'kds.beverage', 'settings.manage'
  ]);

  const loadBranches = async () => {
    try {
      const data = await api.get('/branches');
      setBranches(data);
    } catch (e) {
      console.error('Failed to load branches', e);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  const activeBranch = branches.find((b) => b.id === activeBranchId) || branches[0] || null;

  const setUserRole = (role: RoleType) => {
    const roleNames: Record<RoleType, string> = {
      owner: 'Owner / Direksi',
      manager: 'Manajer Cabang',
      cashier: 'Kasir',
      kitchen_food: 'Dapur Makanan',
      kitchen_beverage: 'Dapur Minuman / Bar',
    };

    let newPermissions: string[] = [];
    if (role === 'owner') {
      newPermissions = [
        'pos.access', 'pos.discount', 'pos.void', 'shift.manage',
        'stock.view', 'stock.opname', 'stock.transfer', 'purchase.create',
        'purchase.approve', 'accounting.view', 'reports.export',
        'kds.food', 'kds.beverage', 'settings.manage'
      ];
    } else if (role === 'manager') {
      newPermissions = [
        'pos.access', 'pos.discount', 'pos.void', 'shift.manage',
        'stock.view', 'stock.opname', 'stock.transfer', 'purchase.create',
        'purchase.approve', 'accounting.view', 'reports.export'
      ];
    } else if (role === 'cashier') {
      newPermissions = ['pos.access', 'shift.manage', 'stock.view'];
    } else if (role === 'kitchen_food') {
      newPermissions = ['kds.food'];
    } else if (role === 'kitchen_beverage') {
      newPermissions = ['kds.beverage'];
    }

    setPermissions(newPermissions);
    setUser((prev) => ({
      ...prev,
      role_id: role,
      role_name: roleNames[role],
    }));
  };

  const switchUserAccount = async (userId: string) => {
    try {
      const users = await api.get('/auth/users');
      const target = users.find((u: any) => u.id === userId);
      if (target) {
        setUser(target);
        setUserRole(target.role_id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const hasPermission = (permissionId: string) => {
    if (user?.role_id === 'owner') return true;
    return permissions.includes(permissionId);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        branches,
        activeBranch,
        activeBranchId,
        setActiveBranchId,
        setUserRole,
        hasPermission,
        switchUserAccount,
        refreshBranches: loadBranches,
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
