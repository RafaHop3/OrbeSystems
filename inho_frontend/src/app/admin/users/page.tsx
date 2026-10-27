"use client";

import React, { useEffect, useState, useMemo } from 'react';
import { adminApi } from '@/lib/api';
import { 
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState
} from '@tanstack/react-table';
import { Shield, ShieldAlert, ShieldCheck, UserCheck, UserX, ArrowUpDown } from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

export default function AdminUsersPage() {
  const [data, setData] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [sorting, setSorting] = useState<SortingState>([]);

  const loadData = async () => {
    try {
      const users = await adminApi.getUsers(0, 100);
      setData(users);
    } catch (error) {
      console.error("Erro ao carregar usuarios", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await adminApi.updateUserStatus(id, !currentStatus);
      loadData();
    } catch (e) {
      console.error(e);
      alert("Erro ao mudar status. Você não pode desativar a si mesmo se for o único admin.");
    }
  };

  const promoteToAdmin = async (id: string, role: string) => {
    if(role === 'SUPER_ADMIN') return;
    const newRole = role === 'ADMIN' ? 'CLIENT' : 'ADMIN';
    try {
      await adminApi.updateUserRole(id, newRole);
      loadData();
    } catch (e) {
      console.error(e);
      alert("Erro ao mudar cargo.");
    }
  };

  const columnHelper = createColumnHelper<UserData>();

  const columns = useMemo(() => [
    columnHelper.accessor('full_name', {
      header: ({ column }) => (
        <button className="flex items-center gap-1 font-semibold hover:text-[#0F172A]" onClick={() => column.toggleSorting()}>
          Nome <ArrowUpDown className="w-4 h-4" />
        </button>
      ),
      cell: info => <span className="font-medium text-[#0F172A]">{info.getValue()}</span>,
    }),
    columnHelper.accessor('email', {
      header: 'Email',
      cell: info => <span className="text-[#64748B]">{info.getValue()}</span>,
    }),
    columnHelper.accessor('role', {
      header: 'Privilégio',
      cell: info => {
        const role = info.getValue();
        const colors: any = {
          SUPER_ADMIN: 'bg-red-500/10 text-red-700 border-red-500/20',
          ADMIN: 'bg-purple-500/10 text-purple-700 border-purple-500/20',
          OPERATOR: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
          CLIENT: 'bg-gray-500/10 text-[#64748B] border-gray-500/20',
        };
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium border ${colors[role] || colors.CLIENT}`}>
            {role}
          </span>
        );
      },
    }),
    columnHelper.accessor('is_active', {
      header: 'Status',
      cell: info => (
        info.getValue() ? 
          <span className="flex items-center gap-1 text-emerald-700 text-sm"><UserCheck className="w-4 h-4"/> Ativo</span> :
          <span className="flex items-center gap-1 text-red-700 text-sm"><UserX className="w-4 h-4"/> Bloqueado</span>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Ações de Segurança',
      cell: (info) => (
        <div className="flex gap-2">
          <button 
            onClick={() => toggleStatus(info.row.original.id, info.row.original.is_active)}
            className={`p-2 rounded-lg transition-colors ${info.row.original.is_active ? 'bg-red-500/10 text-red-700 hover:bg-red-500/20' : 'bg-green-500/10 text-emerald-700 hover:bg-green-500/20'}`}
            title={info.row.original.is_active ? "Bloquear Conta" : "Desbloquear Conta"}
          >
            {info.row.original.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
          </button>
          
          {info.row.original.role !== 'SUPER_ADMIN' && (
            <button 
              onClick={() => promoteToAdmin(info.row.original.id, info.row.original.role)}
              className="p-2 bg-purple-500/10 text-purple-700 hover:bg-purple-500/20 rounded-lg transition-colors"
              title={info.row.original.role === 'ADMIN' ? "Rebaixar para Cliente" : "Promover a Admin"}
            >
              {info.row.original.role === 'ADMIN' ? <Shield className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
            </button>
          )}
        </div>
      ),
    })
  ], []);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="animate-fade-in">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#0F172A] mb-2 flex items-center gap-2">
            <ShieldAlert className="text-purple-700" /> Controle de Acesso
          </h1>
          <p className="text-[#64748B]">Gerencie contas, bloqueie acessos e distribua privilégios administrativos.</p>
        </div>
      </header>

      {loading ? (
        <div className="text-[#64748B]">Carregando usuários...</div>
      ) : (
        <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id} className="border-b border-[#E2E8F0] bg-white">
                    {headerGroup.headers.map(header => (
                      <th key={header.id} className="px-6 py-4 text-sm font-medium text-[#64748B] whitespace-nowrap">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="divide-y divide-gray-800">
                {table.getRowModel().rows.map(row => (
                  <tr key={row.id} className="hover:bg-white transition-colors">
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-6 py-4">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {data.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              Nenhum usuário encontrado na base de dados.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
