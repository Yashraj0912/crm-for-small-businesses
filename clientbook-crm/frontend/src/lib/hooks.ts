import { useEffect, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { qs } from './utils';
import type { Page, User } from './types';
import { useToast } from '../components/ui';

export function useDebounce<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export const useList = <T,>(resource: string, params: Record<string, unknown> = {}) =>
  useQuery({ queryKey: [resource, params], queryFn: () => api.get<Page<T>>(`/${resource}${qs(params)}`), placeholderData: keepPreviousData });

export const useUsers = () => useQuery({ queryKey: ['users'], queryFn: () => api.get<User[]>('/users'), staleTime: 5 * 60_000 });

export const useLookup = (kind: 'customers' | 'deals') =>
  useQuery({ queryKey: ['lookup', kind], queryFn: () => api.get<{ id: number; name: string }[]>(`/lookup/${kind}`), staleTime: 60_000 });

export const userOptions = (users?: User[]) => (users || []).filter((u) => u.is_active).map((u) => ({ value: u.id, label: u.name }));
export const lookupOptions = (rows?: { id: number; name: string }[]) => (rows || []).map((r) => ({ value: r.id, label: r.name }));

export function useSave(resource: string) {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ id, data }: { id?: number; data: unknown }) => (id ? api.put(`/${resource}/${id}`, data) : api.post(`/${resource}`, data)),
    onSuccess: (_r, v) => {
      qc.invalidateQueries();
      toast(v.id ? 'Changes saved' : 'Created');
    },
  });
}

export function useRemove(resource: string) {
  const qc = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (id: number) => api.del(`/${resource}/${id}`),
    onSuccess: () => {
      qc.invalidateQueries();
      toast('Deleted');
    },
  });
}
