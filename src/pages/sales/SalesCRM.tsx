import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Download, Mail, RefreshCw, Eye, Plus, IndianRupee, Type, User, Users, TrendingUp, Percent, Briefcase, CheckCircle2, XCircle, MessageSquare, Inbox, FileText, Search, Send, Handshake, BookOpen, Tag, ChevronRight, CalendarDays, FileSignature, FolderOpen } from 'lucide-react';
import styles from '@/pages/crm/ModulePlaceholder.module.css';
import opStyles from './SalesOpportunities.module.css';
import { useToast } from '@/context/ToastContext';
import { useModal } from '@/context/ModalContext';
import { SearchBox, FilterSelect, ToolbarButton, StatusSelect, RowActions, downloadCSV, formatApiError } from '@/components/ui/TableToolbar';
import { get, post, patch, del } from '@/services/api';

interface Deal {
  id: number;
  title: string;
  clientId: number | null;
  clientName: string;
  trainingCategoryId: number | null;
  trainingCategoryName: string;
  description: string;
  expectedValue: string;
  stage: 'Active' | 'Negotiation' | 'Won' | 'Lost';
  followupNotes: string;
  lastContact: string;
  trainingDate: string;
  createdAt: string;
}

const mapDeal = (d: any): Deal => ({
  id: d.id,
  title: d.title,
  clientId: d.client,
  clientName: d.client_name || '',
  trainingCategoryId: d.training_category,
  trainingCategoryName: d.training_category_name || '',
  description: d.description || '',
  expectedValue: d.expected_value || '0',
  stage: d.stage || 'Active',
  followupNotes: d.followup_notes || '',
  lastContact: d.last_contact || '',
  trainingDate: d.training_date || '',
  createdAt: d.created_at || '',
});

type QuoteStatus = 'PENDING' | 'SENT' | 'APPROVED' | 'REJECTED';

interface Quotation {
  id: number;
  quoteNo: string;
  clientId: number;
  clientName: string;
  clientEmail: string;
  trainingCost: number;
  gst: number;
  netAmount: number;
  status: QuoteStatus;
  sentAt: string | null;
  viewedAt: string | null;
  respondedAt: string | null;
  createdAt: string;
}

interface ClientOption {
  id: number | string;
  name: string;
  email: string;
}

interface TrainingCategoryOption {
  id: number;
  name: string;
  color: string;
}

interface ClientRecord {
  id: number;
  name: string;
  email: string;
  status: string;
  relationshipScore: number;
  createdAt: string;
}

const DEFAULT_BUSINESS_CATEGORIES: TrainingCategoryOption[] = [
  { id: 1, name: 'Consulting & Audit' },
  { id: 2, name: 'Corporate Training' },
  { id: 3, name: 'Executive Coaching' },
  { id: 4, name: 'Technical Certification' },
  { id: 5, name: 'Software Development & IT' },
  { id: 6, name: 'Cloud & Infrastructure' },
  { id: 7, name: 'AI & Data Science' },
];

const mapQuotation = (q: any): Quotation => ({
  id: q.id,
  quoteNo: q.quote_no || '',
  clientId: q.client,
  clientName: q.client_details?.name || '',
  clientEmail: q.client_details?.email || '',
  trainingCost: parseFloat(q.training_cost || 0),
  gst: parseFloat(q.gst || 0),
  netAmount: parseFloat(q.net_amount || 0),
  status: q.status || 'PENDING',
  sentAt: q.sent_at || null,
  viewedAt: q.viewed_at || null,
  respondedAt: q.responded_at || null,
  createdAt: q.created_at || '',
});

const useCountUp = (target: number, duration = 900): number => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let frame: number;
    const start = performance.now();
    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);
  return value;
};

const STAGE_META: Record<Deal['stage'], { accent: string; soft: string; bg: string; iconBg: string; icon: React.ReactNode }> = {
  Active: { accent: '#2563EB', soft: '#60A5FA', bg: 'rgba(37,99,235,0.05)', iconBg: 'rgba(37,99,235,0.12)', icon: <TrendingUp size={16} /> },
  Negotiation: { accent: '#F59E0B', soft: '#FBBF24', bg: 'rgba(245,158,11,0.05)', iconBg: 'rgba(245,158,11,0.14)', icon: <MessageSquare size={16} /> },
  Won: { accent: '#10B981', soft: '#34D399', bg: 'rgba(16,185,129,0.05)', iconBg: 'rgba(16,185,129,0.14)', icon: <CheckCircle2 size={16} /> },
  Lost: { accent: '#EF4444', soft: '#F87171', bg: 'rgba(239,68,68,0.05)', iconBg: 'rgba(239,68,68,0.12)', icon: <XCircle size={16} /> },
};

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const SalesEmptyState = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionVariant = 'primary',
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionVariant?: 'primary' | 'secondary';
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '6px', padding: '2.5rem 1rem' }}>
    <div style={{
      width: '76px', height: '76px', borderRadius: '20px', marginBottom: '8px',
      background: 'linear-gradient(135deg, rgba(37,99,235,0.12), rgba(124,58,237,0.12))',
      display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-secondary)'
    }}>
      {icon}
    </div>
    <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: 'var(--color-text-main)' }}>{title}</h3>
    <p style={{ fontSize: '13.5px', color: 'var(--color-text-muted)', margin: '4px 0 12px 0', maxWidth: '360px', lineHeight: 1.6 }}>
      {description}
    </p>
    {actionLabel && onAction && (
      actionVariant === 'primary' ? (
        <button
          onClick={onAction}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 22px', borderRadius: '8px', border: 'none', background: 'var(--color-secondary)', color: '#fff', fontSize: '13.5px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.28)' }}
        >
          <Plus size={16} /> {actionLabel}
        </button>
      ) : (
        <button
          onClick={onAction}
          style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-main)', fontSize: '13.5px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          {actionLabel}
        </button>
      )
    )}
  </div>
);

const SalesCRM: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [subTab, setSubTab] = useState<'dashboard' | 'opportunities' | 'quotations' | 'proposals' | 'documents'>('opportunities');
  const { addToast } = useToast();
  const { openModal, closeModal } = useModal();
  const [dealSearch, setDealSearch] = useState('');
  const [dealStageFilter, setDealStageFilter] = useState('');
  const [quoteSearch, setQuoteSearch] = useState('');
  const [quoteStatusFilter, setQuoteStatusFilter] = useState('');

  const QUOTE_STATUS_LABELS: Record<string, string> = { PENDING: 'Pending', SENT: 'Sent', APPROVED: 'Approved', REJECTED: 'Rejected' };
  const QUOTE_STATUS_COLORS: Record<string, { bg: string; fg: string }> = {
    PENDING: { bg: '#fff8e1', fg: '#f57f17' }, SENT: { bg: '#e3f2fd', fg: '#1565c0' },
    APPROVED: { bg: '#e8f5e9', fg: '#2e7d32' }, REJECTED: { bg: '#ffebee', fg: '#c62828' }
  };

  useEffect(() => {
    const path = location.pathname;
    if (path.includes('/sales/dashboard')) {
      setSubTab('dashboard');
    } else if (path.includes('/sales/opportunities')) {
      setSubTab('opportunities');
    } else if (path.includes('/sales/quotes')) {
      setSubTab('quotations');
    } else if (path.includes('/sales/proposals')) {
      setSubTab('proposals');
    } else if (path.includes('/sales/documents')) {
      setSubTab('documents');
    } else {
      setSubTab('opportunities');
    }
  }, [location.pathname]);

  const [deals, setDeals] = useState<Deal[]>([]);
  const [draggingDealId, setDraggingDealId] = useState<number | null>(null);
  const [dragOverStage, setDragOverStage] = useState<Deal['stage'] | null>(null);

  const [clients, setClients] = useState<ClientOption[]>([]);
  const [clientRecords, setClientRecords] = useState<ClientRecord[]>([]);
  const [quotes, setQuotes] = useState<Quotation[]>([]);
  const [sendingId, setSendingId] = useState<number | null>(null);
  const [trainingCategories, setTrainingCategories] = useState<TrainingCategoryOption[]>(DEFAULT_BUSINESS_CATEGORIES);

  const fetchTrainingCategories = useCallback(async () => {
    try {
      const data = await get<any>('/training-categories/');
      const list = Array.isArray(data) ? data : (data?.results ?? []);
      if (list.length > 0) {
        setTrainingCategories(list.map((c: any) => ({ id: c.id, name: c.name, color: c.color })));
      } else {
        setTrainingCategories(DEFAULT_BUSINESS_CATEGORIES);
      }
    } catch {
      setTrainingCategories(DEFAULT_BUSINESS_CATEGORIES);
    }
  }, []);

  const fetchClients = useCallback(async () => {
    try {
      const data = await get<any>('/clients/');
      const list = Array.isArray(data) ? data : (data?.results ?? []);
      const mapped = list.map((c: any) => ({ id: c.id, name: c.name, email: c.email || '' }));
      setClients(mapped);
      setClientRecords(list.map((c: any): ClientRecord => ({
        id: c.id,
        name: c.name,
        email: c.email || '',
        status: c.status || 'Active',
        relationshipScore: typeof c.relationship_score === 'number' ? c.relationship_score : parseFloat(c.relationship_score) || 80,
        createdAt: c.created_at || '',
      })));
    } catch {
      // Quiet
    }
  }, []);

  const fetchQuotations = useCallback(async (silent = true) => {
    try {
      const data = await get<any>('/quotations/');
      const list = Array.isArray(data) ? data : (data?.results ?? []);
      setQuotes(list.map(mapQuotation));
    } catch {
      if (!silent) addToast('Could not reach the backend.', 'error');
    }
  }, [addToast]);

  const fetchDeals = useCallback(async () => {
    try {
      const data = await get<any>('/deals/');
      const list = Array.isArray(data) ? data : (data?.results ?? []);
      setDeals(list.map(mapDeal));
    } catch {
      console.warn('Backend load deals error');
    }
  }, []);

  useEffect(() => {
    fetchClients();
    fetchQuotations();
    fetchDeals();
    fetchTrainingCategories();
  }, [fetchClients, fetchQuotations, fetchDeals, fetchTrainingCategories]);

  useEffect(() => {
    if (subTab !== 'proposals') return;
    const interval = setInterval(() => fetchQuotations(), 15000);
    return () => clearInterval(interval);
  }, [subTab, fetchQuotations]);

  const handleCreateDeal = async (data: { title: string; client: string; description: string; expectedValue: string; stage: Deal['stage'] }) => {
    if (!data.title || !data.expectedValue) {
      addToast('Please enter deal title and value', 'error');
      return;
    }
    try {
      const res = await post<any>('/deals/', {
        title: data.title,
        client: data.client || null,
        description: data.description || '',
        expected_value: parseFloat(data.expectedValue).toFixed(2),
        stage: data.stage
      });
      if (res) {
        addToast('Deal recorded in sales pipeline!', 'success');
        fetchDeals();
        closeModal();
      }
    } catch (err: any) {
      addToast(formatApiError(err?.response?.data || err, err?.response?.status, 'save this opportunity'), 'error');
    }
  };

  const handleCreateTrainingDeal = async (data: { trainingCategoryId: string; client: string; description: string; expectedValue: string; stage: Deal['stage']; trainingDate: string }) => {
    if (!data.trainingCategoryId || !data.expectedValue) {
      addToast('Please select a business category and enter a value', 'error');
      return;
    }
    const category = trainingCategories.find(c => c.id === Number(data.trainingCategoryId));
    try {
      const res = await post<any>('/deals/', {
        title: category ? category.name : 'Business Opportunity',
        training_category: Number(data.trainingCategoryId),
        client: data.client || null,
        description: data.description || '',
        expected_value: parseFloat(data.expectedValue).toFixed(2),
        stage: data.stage,
        training_date: data.trainingDate || null
      });
      if (res) {
        addToast('Business opportunity recorded in sales pipeline!', 'success');
        fetchDeals();
        closeModal();
      }
    } catch (err: any) {
      addToast(formatApiError(err?.response?.data || err, err?.response?.status, 'save this business opportunity'), 'error');
    }
  };

  const handleCreateQuote = async (data: { clientId: string | number; cost: number; categoryId?: number }) => {
    try {
      const res = await post<any>('/quotations/', {
        client: data.clientId,
        training_cost: data.cost,
        training_category: data.categoryId || null,
      });
      if (res) {
        addToast('Quotation generated successfully!', 'success');
        fetchQuotations();
        closeModal();
      }
    } catch (err: any) {
      addToast(formatApiError(err?.response?.data || err, err?.response?.status, 'generate quotation'), 'error');
    }
  };

  const openAddOpportunityChooser = () => {
    openModal(
      <OpportunityTypeChooser
        onSelectDeal={() => openModal(<DealForm clients={clients} onSubmit={handleCreateDeal} onClose={closeModal} />, 'Add Deal Opportunity')}
        onSelectTraining={() => openModal(<TrainingDealForm categories={trainingCategories} clients={clients} onSubmit={handleCreateTrainingDeal} onClose={closeModal} />, 'Add Business')}
      />,
      'Add Opportunity'
    );
  };

  const handleUpdateDealStage = async (id: number, stage: Deal['stage']) => {
    setDeals(prev => prev.map(d => d.id === id ? { ...d, stage } : d));
    addToast(`Deal stage updated to ${stage}`, 'success');
    try {
      await patch(`/deals/${id}/`, { stage });
    } catch {
      console.warn('Backend update failed');
    }
  };

  const handleDeleteDeal = async (id: number) => {
    if (!window.confirm('Delete this opportunity permanently?')) return;
    setDeals(prev => prev.filter(d => d.id !== id));
    addToast('Opportunity deleted', 'success');
    try {
      await del(`/deals/${id}/`);
    } catch {
      console.warn('Backend delete failed');
    }
  };

  const handleFullEditDeal = async (id: number, data: { title: string; client: string; trainingCategoryId: string; description: string; expectedValue: string; stage: Deal['stage']; trainingDate: string }) => {
    try {
      const res = await patch<any>(`/deals/${id}/`, {
        title: data.title,
        client: data.client || null,
        training_category: data.trainingCategoryId ? Number(data.trainingCategoryId) : null,
        description: data.description || '',
        expected_value: parseFloat(data.expectedValue || '0').toFixed(2),
        stage: data.stage,
        training_date: data.trainingDate || null,
      });
      if (res) {
        addToast('Opportunity updated', 'success');
        fetchDeals();
        closeModal();
      }
    } catch (err: any) {
      addToast(formatApiError(err?.response?.data || err, err?.response?.status, 'update this opportunity'), 'error');
    }
  };

  const handleDeleteQuote = async (id: number) => {
    if (!window.confirm('Delete this quotation permanently?')) return;
    setQuotes(prev => prev.filter(q => q.id !== id));
    try {
      await del(`/quotations/${id}/`);
      addToast('Quotation deleted', 'success');
    } catch {
      addToast('Removed locally, but could not reach the backend to delete it permanently.', 'error');
    }
  };

  const handleEditGrossCost = (q: Quotation) => {
    addToast(
      q.sentAt
        ? 'This quotation has already been emailed to the client and can no longer be edited.'
        : 'Gross Cost is fixed from the opportunity. Go to Sales -> Opportunities to change it, then generate the quote again.',
      'info'
    );
  };

  const filteredDeals = deals.filter(d => {
    const q = dealSearch.toLowerCase();
    const matchesSearch = d.title.toLowerCase().includes(q) || d.clientName.toLowerCase().includes(q);
    const matchesStage = dealStageFilter ? d.stage === dealStageFilter : true;
    return matchesSearch && matchesStage;
  });

  const filteredQuotes = quotes.filter(q => {
    const query = quoteSearch.toLowerCase();
    const matchesSearch = q.quoteNo.toLowerCase().includes(query) || q.clientName.toLowerCase().includes(query);
    const matchesStatus = quoteStatusFilter ? q.status === quoteStatusFilter : true;
    return matchesSearch && matchesStatus;
  });

  const mailedProposals = quotes.filter(q => q.sentAt);

  const wonDeals = deals.filter(d => d.stage === 'Won');
  const lostDeals = deals.filter(d => d.stage === 'Lost');
  const activeDeals = deals.filter(d => d.stage === 'Active');
  const negotiationDeals = deals.filter(d => d.stage === 'Negotiation');
  const closedWonRevenue = wonDeals.reduce((sum, d) => sum + parseFloat(d.expectedValue || '0'), 0);
  const totalDealsCount = deals.length;
  const wonConversionPct = totalDealsCount > 0 ? Math.round((wonDeals.length / totalDealsCount) * 1000) / 10 : 0;
  const activePipelineValue = [...activeDeals, ...negotiationDeals].reduce((sum, d) => sum + parseFloat(d.expectedValue || '0'), 0);
  const quotationsSentCount = quotes.filter(q => q.sentAt).length;

  const [overriddenClientStatuses, setOverriddenClientStatuses] = useState<Record<string, string>>({});

  const handleToggleClientStatus = async (clientId: string | number, currentStatus: string) => {
    const nextStatus = currentStatus === 'Active' ? 'Inactive' : 'Active';
    const key = String(clientId);
    setOverriddenClientStatuses(prev => ({ ...prev, [key]: nextStatus }));
    try {
      await patch(`/clients/${clientId}/`, { status: nextStatus });
      addToast(`Client status updated to ${nextStatus}`, 'success');
      fetchClients();
    } catch {
      addToast(`Client status updated to ${nextStatus}`, 'success');
    }
  };

  const effectiveClientRecords = React.useMemo(() => {
    const records: ClientRecord[] = [...clientRecords];
    deals.forEach(d => {
      if (d.clientName) {
        const exists = records.some(r => r.name.toLowerCase() === d.clientName.toLowerCase());
        if (!exists) {
          records.push({
            id: d.clientId || d.id,
            name: d.clientName,
            email: '',
            status: 'Active',
            relationshipScore: 80,
            createdAt: d.createdAt || new Date().toISOString(),
          });
        }
      }
    });
    return records;
  }, [clientRecords, deals]);

  const totalClients = effectiveClientRecords.length;
  const activeClientsCount = effectiveClientRecords.filter(c => c.status === 'Active').length;
  const inactiveClientsCount = effectiveClientRecords.filter(c => c.status !== 'Active').length;
  const avgRelationshipScore = totalClients > 0
    ? Math.round(effectiveClientRecords.reduce((sum, c) => sum + (c.relationshipScore || 80), 0) / totalClients)
    : 0;
  const clientStatusMax = Math.max(activeClientsCount, inactiveClientsCount, 1);

  const animatedClosedWon = useCountUp(closedWonRevenue);
  const animatedPipelineValue = useCountUp(activePipelineValue);
  const animatedTotalClients = useCountUp(totalClients);
  const animatedWonConversion = useCountUp(wonConversionPct);

  interface SalesActivityItem { id: string; type: string; description: string; date: string; clientName: string }
  const salesActivityFeed: SalesActivityItem[] = [
    ...effectiveClientRecords.map((c): SalesActivityItem => ({
      id: `client-${c.id}`, type: 'CLIENT', description: `New client onboarded: ${c.name}`, date: c.createdAt, clientName: c.name
    })),
    ...deals.map((d): SalesActivityItem => ({
      id: `deal-${d.id}`, type: 'DEAL', description: `Opportunity added: ${d.title}`, date: d.createdAt, clientName: d.clientName
    })),
    ...quotes.map((q): SalesActivityItem => ({
      id: `quote-${q.id}`, type: 'QUOTE', description: `Quotation ${q.quoteNo} generated`, date: q.createdAt, clientName: q.clientName
    })),
    ...quotes.filter(q => q.sentAt).map((q): SalesActivityItem => ({
      id: `sent-${q.id}`, type: 'SENT', description: `Proposal ${q.quoteNo} emailed to client`, date: q.sentAt as string, clientName: q.clientName
    })),
    ...quotes.filter(q => q.respondedAt).map((q): SalesActivityItem => ({
      id: `resp-${q.id}`, type: q.status, description: `Quotation ${q.quoteNo} ${q.status === 'APPROVED' ? 'approved' : 'rejected'} by client`, date: q.respondedAt as string, clientName: q.clientName
    })),
  ]
    .filter(item => item.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const ACTIVITY_TAG_COLORS: Record<string, { bg: string; fg: string }> = {
    CLIENT: { bg: 'rgba(37,99,235,0.1)', fg: 'var(--color-secondary)' },
    DEAL: { bg: 'rgba(124,58,237,0.1)', fg: 'var(--color-accent)' },
    QUOTE: { bg: '#fff8e1', fg: '#f57f17' },
    SENT: { bg: '#e3f2fd', fg: '#1565c0' },
    APPROVED: { bg: '#e8f5e9', fg: '#2e7d32' },
    REJECTED: { bg: '#ffebee', fg: '#c62828' },
  };

  const exportDeals = (rows: Deal[]) => {
    downloadCSV('opportunities.csv', ['Title', 'Client', 'Value', 'Stage', 'Last Contact'],
      rows.map(d => [d.title, d.clientName, d.expectedValue, d.stage, d.lastContact]));
  };

  const exportQuotes = (rows: Quotation[]) => {
    downloadCSV('quotations.csv', ['Quote No', 'Client', 'Cost', 'GST', 'Net', 'Status'],
      rows.map(q => [q.quoteNo, q.clientName, q.trainingCost, q.gst, q.netAmount, QUOTE_STATUS_LABELS[q.status]]));
  };

  const handleSendMail = async (q: Quotation) => {
    let targetEmail = q.clientEmail;
    if (!targetEmail) {
      const entered = window.prompt(`Enter recipient email address for Quotation ${q.quoteNo} (${q.clientName}):`);
      if (!entered || !entered.trim()) return;
      targetEmail = entered.trim();
    }

    setSendingId(q.id);
    try {
      const data = await post<any>(`/quotations/${q.id}/send_mail/`, { email: targetEmail });
      if (data) {
        setQuotes(prev => prev.map(x => x.id === q.id ? mapQuotation(data) : x));
        addToast(`Proposal ${q.quoteNo} emailed successfully to ${data.client_details?.email || targetEmail}!`, 'success');
      }
    } catch (err: any) {
      addToast(err?.response?.data?.detail || 'Could not send the email — check SMTP settings.', 'error');
    } finally {
      setSendingId(null);
    }
  };

  const formatDateTime = (iso: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', minHeight: '100%' }}>
      {/* Header */}
      <div className={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(37,99,235,0.12), rgba(124,58,237,0.12))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-secondary)'
          }}>
            {subTab === 'dashboard' ? <Briefcase size={20} />
              : subTab === 'opportunities' ? <Handshake size={20} />
              : subTab === 'quotations' ? <FileText size={20} />
              : subTab === 'proposals' ? <FileSignature size={20} />
              : <FolderOpen size={20} />}
          </div>
          <div>
            <h1 className={styles.title}>
              {subTab === 'dashboard' ? (<>Sales <span style={{ color: 'var(--color-secondary)' }}>Overview</span></>)
                : subTab === 'opportunities' ? (<>Sales <span style={{ color: 'var(--color-secondary)' }}>Opportunities</span></>)
                : subTab === 'quotations' ? (<>Quotation <span style={{ color: 'var(--color-secondary)' }}>Builder</span></>)
                : subTab === 'proposals' ? (<>Proposal <span style={{ color: 'var(--color-secondary)' }}>Tracker</span></>)
                : (<>Sales <span style={{ color: 'var(--color-secondary)' }}>Documents</span></>)}
            </h1>
            <p className={styles.subtitle}>
              {subTab === 'dashboard' ? 'Live revenue, pipeline, and client portfolio pulled from across the Sales module.'
                : subTab === 'opportunities' ? 'Track deal opportunities, quotations, contracts, and revenue conversions.'
                : subTab === 'quotations' ? 'Generate, send, and track price quotations for every client deal.'
                : subTab === 'proposals' ? 'Draft and follow up on formal proposals sent to prospective clients.'
                : 'Contracts and files attached to opportunities, quotations, and proposals.'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button className={styles.btnPrimary} onClick={openAddOpportunityChooser} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} /> Add Opportunity
          </button>
          <button className={styles.btnSecondary} onClick={() => openModal(<QuoteForm clients={clients} deals={deals} categories={trainingCategories} onSubmit={handleCreateQuote} onClose={closeModal} />, 'Generate Quotation')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} /> Generate Quote
          </button>
        </div>
      </div>

      {/* ── Lead Management Styled Tab Navigation Bar ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '6px',
        padding: '6px',
        background: 'var(--color-surface-elevated, var(--color-surface))',
        backdropFilter: 'blur(12px)',
        borderRadius: '16px',
        border: '1px solid var(--color-border)',
        boxShadow: '0 4px 16px rgba(37,99,235,0.07)',
      }}>
        {[
          { id: 'dashboard', label: 'Dashboard', icon: <Briefcase size={15} />, path: '/sales/dashboard' },
          { id: 'opportunities', label: 'Opportunities', icon: <Handshake size={15} />, path: '/sales/opportunities' },
          { id: 'quotations', label: 'Quotations', icon: <FileText size={15} />, path: '/sales/quotes' },
          { id: 'proposals', label: 'Proposals', icon: <FileSignature size={15} />, path: '/sales/proposals' },
          { id: 'documents', label: 'Documents', icon: <FolderOpen size={15} />, path: '/sales/documents' },
        ].map(tab => {
          const isActive = subTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
                padding: '10px 8px', borderRadius: '11px', border: 'none', cursor: 'pointer',
                fontSize: '13px', fontWeight: isActive ? 700 : 500,
                whiteSpace: 'nowrap',
                background: isActive ? 'linear-gradient(135deg, #2563EB, #7C3AED)' : 'transparent',
                color: isActive ? '#fff' : 'var(--color-text-muted)',
                boxShadow: isActive ? '0 4px 14px rgba(37,99,235,0.35)' : 'none',
                transform: isActive ? 'translateY(-1px)' : 'translateY(0)',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ opacity: isActive ? 1 : 0.65, display: 'flex' }}>{tab.icon}</span>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Dashboard View */}
      {subTab === 'dashboard' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: '1rem' }}>
            <KpiCard
              accent="#10B981"
              accentBg="rgba(16,185,129,0.1)"
              icon={<IndianRupee size={24} />}
              label="Closed/Won Revenue"
              value={`₹${Math.round(animatedClosedWon).toLocaleString('en-IN')}`}
            />
            <KpiCard
              accent="var(--color-secondary)"
              accentBg="rgba(37,99,235,0.1)"
              icon={<TrendingUp size={24} />}
              label="Active Pipeline Value"
              value={`₹${Math.round(animatedPipelineValue).toLocaleString('en-IN')}`}
            />
            <KpiCard
              accent="var(--color-accent)"
              accentBg="rgba(124,58,237,0.1)"
              icon={<Users size={24} />}
              label="Total Clients"
              value={Math.round(animatedTotalClients).toLocaleString('en-IN')}
            />
            <KpiCard
              accent="#F59E0B"
              accentBg="rgba(245,158,11,0.1)"
              icon={<Percent size={24} />}
              label="Won Conversion"
              value={`${animatedWonConversion.toFixed(1)}%`}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1.5rem' }}>
            <div className="glass-panel" style={{ padding: '1.5rem', minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 'bold', margin: 0 }}>Client Portfolio Health</h4>
                <div style={{
                  width: '30px', height: '30px', borderRadius: '50%', border: '1px solid var(--color-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', flexShrink: 0
                }}>
                  <Users size={14} />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, minWidth: 0 }}>
                  <div
                    onClick={() => openModal(
                      <ClientListModal
                        statusFilter="Active"
                        clients={effectiveClientRecords}
                        onToggleStatus={handleToggleClientStatus}
                        onClose={closeModal}
                      />,
                      'Active Clients Portfolio'
                    )}
                    style={{ cursor: 'pointer', padding: '6px 8px', borderRadius: '8px', background: 'rgba(16,185,129,0.04)', transition: 'all 0.15s ease' }}
                    title="Click to view and manage Active Clients"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '6px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10B981', flexShrink: 0 }} />
                        Active Clients
                      </span>
                      <strong style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{activeClientsCount} <ChevronRight size={13} opacity={0.6} /></strong>
                    </div>
                    <div style={{ height: '8px', background: 'var(--color-border)', borderRadius: '4px' }}><div style={{ height: '100%', width: `${(activeClientsCount / clientStatusMax) * 100}%`, background: '#10B981', borderRadius: '4px', transition: 'width 0.6s ease' }}></div></div>
                  </div>

                  <div
                    onClick={() => openModal(
                      <ClientListModal
                        statusFilter="Inactive"
                        clients={effectiveClientRecords}
                        onToggleStatus={handleToggleClientStatus}
                        onClose={closeModal}
                      />,
                      'Inactive Clients Portfolio'
                    )}
                    style={{ cursor: 'pointer', padding: '6px 8px', borderRadius: '8px', background: 'rgba(239,68,68,0.04)', transition: 'all 0.15s ease' }}
                    title="Click to view and manage Inactive Clients"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12.5px', marginBottom: '6px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#EF4444', flexShrink: 0 }} />
                        Inactive Clients
                      </span>
                      <strong style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>{inactiveClientsCount} <ChevronRight size={13} opacity={0.6} /></strong>
                    </div>
                    <div style={{ height: '8px', background: 'var(--color-border)', borderRadius: '4px' }}><div style={{ height: '100%', width: `${(inactiveClientsCount / clientStatusMax) * 100}%`, background: '#EF4444', borderRadius: '4px', transition: 'width 0.6s ease' }}></div></div>
                  </div>
                  {totalClients === 0 && (
                    <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>No clients yet — add one from the Clients menu.</p>
                  )}
                </div>
                <ClientHealthGraphic score={avgRelationshipScore} />
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '1.5rem', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '15px', fontWeight: 'bold', margin: 0 }}>Recent Sales Activity</h4>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{quotationsSentCount} proposal{quotationsSentCount === 1 ? '' : 's'} sent</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: 0 }}>
                {salesActivityFeed.length === 0 && (
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>No sales activity logged yet.</p>
                )}
                {salesActivityFeed.slice(0, 5).map(item => (
                  <div key={item.id} style={{ display: 'flex', gap: '10px', fontSize: '13px', paddingBottom: '8px', borderBottom: '1px solid var(--color-border)', minWidth: 0, alignItems: 'center' }}>
                    <span style={{
                      color: ACTIVITY_TAG_COLORS[item.type]?.fg || 'var(--color-secondary)', fontWeight: 'bold', whiteSpace: 'nowrap', flexShrink: 0,
                      background: ACTIVITY_TAG_COLORS[item.type]?.bg || 'rgba(37,99,235,0.1)', padding: '3px 8px', borderRadius: '5px', fontSize: '11px'
                    }}>{item.type}</span>
                    <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.description}
                    </span>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '11px', whiteSpace: 'nowrap', flexShrink: 0 }}>{formatDateTime(item.date)}</span>
                  </div>
                ))}
              </div>
              {salesActivityFeed.length > 5 && (
                <span style={{ marginTop: '10px', fontSize: '11.5px', color: 'var(--color-text-muted)', textAlign: 'center' }}>
                  +{salesActivityFeed.length - 5} more activities
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Opportunities Pipeline */}
      {subTab === 'opportunities' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <SearchBox value={dealSearch} onChange={setDealSearch} placeholder="Search opportunities or clients..." />
            <FilterSelect
              value={dealStageFilter}
              onChange={setDealStageFilter}
              options={[{ value: '', label: 'All Stages' }, { value: 'Active', label: 'Active' }, { value: 'Negotiation', label: 'Negotiation' }, { value: 'Won', label: 'Won' }, { value: 'Lost', label: 'Lost' }]}
            />
            <ToolbarButton onClick={() => exportDeals(filteredDeals)}><Download size={14} /> Export</ToolbarButton>
          </div>

          <div className={opStyles.board}>
            {(['Active', 'Negotiation', 'Won', 'Lost'] as const).map(stage => {
              const stageDeals = filteredDeals.filter(d => d.stage === stage);
              const stageTotal = stageDeals.reduce((sum, d) => sum + (parseFloat(d.expectedValue) || 0), 0);
              const meta = STAGE_META[stage];
              const colVars = {
                '--col-accent': meta.accent,
                '--col-accent-soft': meta.soft,
                '--col-bg': meta.bg,
                '--col-icon-bg': meta.iconBg,
                '--col-border': 'var(--color-border)',
              } as React.CSSProperties;
              return (
                <div
                  key={stage}
                  className={`${opStyles.column} ${dragOverStage === stage ? opStyles.columnDragOver : ''}`}
                  style={colVars}
                  onDragOver={e => {
                    if (draggingDealId === null) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOverStage !== stage) setDragOverStage(stage);
                  }}
                  onDragLeave={e => {
                    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                    setDragOverStage(prev => (prev === stage ? null : prev));
                  }}
                  onDrop={e => {
                    e.preventDefault();
                    const id = draggingDealId ?? Number(e.dataTransfer.getData('text/plain'));
                    setDragOverStage(null);
                    setDraggingDealId(null);
                    if (!id) return;
                    const dropped = deals.find(dl => dl.id === id);
                    if (dropped && dropped.stage !== stage) {
                      handleUpdateDealStage(id, stage);
                    }
                  }}
                >
                  <div className={opStyles.columnHeader}>
                    <div className={opStyles.columnIcon}>{meta.icon}</div>
                    <div className={opStyles.columnHeadText}>
                      <div className={opStyles.columnTitle}>
                        {stage}
                        <span className={opStyles.countPill}>{stageDeals.length}</span>
                      </div>
                      <span className={opStyles.columnTotal}>₹{stageTotal.toLocaleString('en-IN')} total</span>
                    </div>
                  </div>

                  <div className={opStyles.cardList}>
                    {stageDeals.length === 0 && (
                      <div className={opStyles.emptyState}>
                        <Inbox size={22} />
                        <span className={opStyles.emptyStateText}>No deals in {stage.toLowerCase()}</span>
                      </div>
                    )}
                    {stageDeals.map(d => (
                      <div
                        key={d.id}
                        className={`${opStyles.card} ${draggingDealId === d.id ? opStyles.cardDragging : ''}`}
                        style={colVars}
                        draggable
                        onDragStart={e => {
                          e.dataTransfer.setData('text/plain', String(d.id));
                          e.dataTransfer.effectAllowed = 'move';
                          setDraggingDealId(d.id);
                        }}
                        onDragEnd={() => {
                          setDraggingDealId(null);
                          setDragOverStage(null);
                        }}
                      >
                        <div className={opStyles.cardTopRow}>
                          <div className={opStyles.avatar}>{getInitials(d.clientName || d.trainingCategoryName || d.title)}</div>
                          <div className={opStyles.cardTitleWrap}>
                            <span className={opStyles.cardTitle}>{(d.title && isNaN(Number(d.title))) ? d.title : (d.clientName ? `${d.clientName} Opportunity` : 'Business Opportunity')}</span>
                            <span className={opStyles.cardClient}>{d.clientName || (d.trainingCategoryName ? `Category: ${d.trainingCategoryName}` : 'No client linked')}</span>
                          </div>
                        </div>
                        <div className={opStyles.cardValueRow}>
                          <IndianRupee size={13} />{parseFloat(d.expectedValue).toLocaleString('en-IN')}
                        </div>
                        <div className={opStyles.cardDivider} />
                        <div className={opStyles.cardFooterRow}>
                          <StatusSelect
                            value={d.stage}
                            labels={{ Active: 'Active', Negotiation: 'Negotiation', Won: 'Won', Lost: 'Lost' }}
                            colors={{ Active: { bg: '#e3f2fd', fg: '#1565c0' }, Negotiation: { bg: '#fff8e1', fg: '#f57f17' }, Won: { bg: '#e8f5e9', fg: '#2e7d32' }, Lost: { bg: '#ffebee', fg: '#c62828' } }}
                            onChange={val => handleUpdateDealStage(d.id, val as Deal['stage'])}
                          />
                          <RowActions
                            onEdit={() => openModal(
                              <EditDealForm
                                deal={d}
                                clients={clients}
                                categories={trainingCategories}
                                onSubmit={data => handleFullEditDeal(d.id, data)}
                                onClose={closeModal}
                              />,
                              'Edit Opportunity'
                            )}
                            onDelete={() => handleDeleteDeal(d.id)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quotations View */}
      {subTab === 'quotations' && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '1rem' }}>Quotations</h3>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <SearchBox value={quoteSearch} onChange={setQuoteSearch} placeholder="Search quote no. or client..." />
            <FilterSelect
              value={quoteStatusFilter}
              onChange={setQuoteStatusFilter}
              options={[{ value: '', label: 'All Statuses' }, { value: 'PENDING', label: 'Pending' }, { value: 'SENT', label: 'Sent' }, { value: 'APPROVED', label: 'Approved' }, { value: 'REJECTED', label: 'Rejected' }]}
            />
            <ToolbarButton onClick={() => exportQuotes(filteredQuotes)}><Download size={14} /> Export</ToolbarButton>
          </div>
          {quotes.length === 0 ? (
            <SalesEmptyState
              icon={<FileText size={34} />}
              title="No quotations yet"
              description="Generate your first quotation from a client's opportunity to start tracking cost, GST, and net amount here."
              actionLabel="Generate Quote"
              onAction={() => openModal(<QuoteForm clients={clients} deals={deals} categories={trainingCategories} onSubmit={handleCreateQuote} onClose={closeModal} />, 'Generate Quotation')}
            />
          ) : filteredQuotes.length === 0 ? (
            <SalesEmptyState
              icon={<Search size={34} />}
              title="No matching quotations"
              description="Try a different search term or status filter."
              actionLabel="Clear Filters"
              onAction={() => { setQuoteSearch(''); setQuoteStatusFilter(''); }}
              actionVariant="secondary"
            />
          ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                <th style={{ padding: '10px' }}>Quote No</th>
                <th style={{ padding: '10px' }}>Client</th>
                <th style={{ padding: '10px' }}>Cost</th>
                <th style={{ padding: '10px' }}>18% GST</th>
                <th style={{ padding: '10px' }}>Net</th>
                <th style={{ padding: '10px' }}>Status</th>
                <th style={{ padding: '10px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredQuotes.map(q => (
                <tr key={q.id} style={{ borderBottom: '1px solid var(--color-border)', fontSize: '13px' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{q.quoteNo}</td>
                  <td style={{ padding: '12px' }}>{q.clientName}</td>
                  <td style={{ padding: '12px' }}>₹{q.trainingCost}</td>
                  <td style={{ padding: '12px' }}>₹{q.gst}</td>
                  <td style={{ padding: '12px', fontWeight: 'bold', color: 'var(--color-secondary)' }}>₹{q.netAmount}</td>
                  <td style={{ padding: '12px' }}>
                    {!q.sentAt ? (
                      <button
                        onClick={() => handleSendMail(q)}
                        disabled={sendingId === q.id}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: 'var(--color-secondary)', color: '#fff', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 'bold', cursor: sendingId === q.id ? 'default' : 'pointer', opacity: sendingId === q.id ? 0.6 : 1, whiteSpace: 'nowrap' }}
                      >
                        <Mail size={13} /> {sendingId === q.id ? 'Sending...' : 'Send Mail'}
                      </button>
                    ) : (
                      <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', background: QUOTE_STATUS_COLORS[q.status].bg, color: QUOTE_STATUS_COLORS[q.status].fg }}>
                        {QUOTE_STATUS_LABELS[q.status]}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '12px' }}>
                    <RowActions
                      onEdit={() => handleEditGrossCost(q)}
                      onDelete={() => handleDeleteQuote(q.id)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>
      )}

      {/* Proposals View */}
      {subTab === 'proposals' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>Emailed Proposals</h3>
              <ToolbarButton onClick={() => fetchQuotations(false)}><RefreshCw size={14} /> Refresh</ToolbarButton>
            </div>
            {mailedProposals.length === 0 ? (
              <SalesEmptyState
                icon={<Send size={34} />}
                title="No proposals sent yet"
                description="Send a quotation from the Quotations tab and it'll be tracked here with its live status — pending, approved, or rejected."
                actionLabel="Go to Quotations"
                onAction={() => setSubTab('quotations')}
                actionVariant="secondary"
              />
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)', fontSize: '12px' }}>
                    <th style={{ padding: '10px' }}>Quote No</th>
                    <th style={{ padding: '10px' }}>Client</th>
                    <th style={{ padding: '10px' }}>Net Amount</th>
                    <th style={{ padding: '10px' }}>Sent</th>
                    <th style={{ padding: '10px' }}>Viewed</th>
                    <th style={{ padding: '10px' }}>Responded</th>
                    <th style={{ padding: '10px' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {mailedProposals.map(q => (
                    <tr key={q.id} style={{ borderBottom: '1px solid var(--color-border)', fontSize: '13px' }}>
                      <td style={{ padding: '12px', fontWeight: 'bold' }}>{q.quoteNo}</td>
                      <td style={{ padding: '12px' }}>{q.clientName}<div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{q.clientEmail}</div></td>
                      <td style={{ padding: '12px', fontWeight: 'bold', color: 'var(--color-secondary)' }}>₹{q.netAmount}</td>
                      <td style={{ padding: '12px', fontSize: '12px' }}>{formatDateTime(q.sentAt)}</td>
                      <td style={{ padding: '12px', fontSize: '12px' }}>
                        {q.viewedAt ? (<span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Eye size={12} /> {formatDateTime(q.viewedAt)}</span>) : '—'}
                      </td>
                      <td style={{ padding: '12px', fontSize: '12px' }}>{formatDateTime(q.respondedAt)}</td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', background: QUOTE_STATUS_COLORS[q.status].bg, color: QUOTE_STATUS_COLORS[q.status].fg }}>
                          {QUOTE_STATUS_LABELS[q.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Sales Documents */}
      {subTab === 'documents' && (
        <div className="glass-panel" style={{ padding: '1.5rem' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '1.5rem' }}>Client Agreements, Contracts & Quotations</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            <div style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
              <h5 style={{ fontWeight: 'bold', fontSize: '13.5px', marginBottom: '4px' }}>TechCorp_Quotation_Q-1001.pdf</h5>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Type: Quotation • Date: 2026-07-08</span>
              <button onClick={() => addToast('Downloading Quotation PDF...', 'info')} style={{ display: 'block', border: 'none', background: 'none', color: 'var(--color-secondary)', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px', padding: 0 }}>Download</button>
            </div>
            
            <div style={{ padding: '1rem', border: '1px solid var(--color-border)', borderRadius: '8px' }}>
              <h5 style={{ fontWeight: 'bold', fontSize: '13.5px', marginBottom: '4px' }}>GlobalSolutions_Agreement_Signed.pdf</h5>
              <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Type: Signed Agreement • Date: 2026-07-07</span>
              <button onClick={() => addToast('Downloading Signed MoU...', 'info')} style={{ display: 'block', border: 'none', background: 'none', color: 'var(--color-secondary)', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px', padding: 0 }}>Download</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const KpiCard = ({ accent, accentBg, icon, label, value }: { accent: string; accentBg: string; icon: React.ReactNode; label: string; value: string }) => (
  <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '14px', borderLeft: `4px solid ${accent}`, overflow: 'hidden' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={{ padding: '10px', background: accentBg, borderRadius: '10px', color: accent, flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{label}</span>
        <h4 style={{ fontSize: '22px', fontWeight: 'bold', margin: '4px 0 0 0' }}>{value}</h4>
      </div>
    </div>
    <svg width="100%" height="40" viewBox="0 0 160 40" preserveAspectRatio="none" style={{ display: 'block' }}>
      <path d="M2,32 C20,29 26,34 36,24 S52,12 66,18 S86,7 100,12 S128,18 158,4" fill="none" stroke={accent} strokeWidth="2.5" strokeLinecap="round" opacity="0.85" />
      <path d="M2,32 C20,29 26,34 36,24 S52,12 66,18 S86,7 100,12 S128,18 158,4 L158,40 L2,40 Z" fill={accent} opacity="0.1" />
    </svg>
  </div>
);

const ClientHealthGraphic = ({ score }: { score: number }) => {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, score));
  const offset = circumference - (clamped / 100) * circumference;
  return (
    <svg width="110" height="110" viewBox="0 0 110 110" style={{ flexShrink: 0 }} aria-hidden="true">
      <circle cx="55" cy="55" r={radius} fill="none" stroke="var(--color-border)" strokeWidth="10" />
      <circle
        cx="55" cy="55" r={radius} fill="none" stroke="var(--color-secondary)" strokeWidth="10"
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        transform="rotate(-90 55 55)" style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text x="55" y="51" textAnchor="middle" fontSize="20" fontWeight="bold" fill="var(--color-text-main)">{clamped}%</text>
      <text x="55" y="68" textAnchor="middle" fontSize="9" fill="var(--color-text-muted)">avg. score</text>
    </svg>
  );
};

const OpportunityTypeChooser = ({ onSelectDeal, onSelectTraining }: { onSelectDeal: () => void; onSelectTraining: () => void }) => {
  const OPTIONS: { key: string; label: string; description: string; icon: React.ReactNode; onClick: () => void }[] = [
    {
      key: 'deal',
      label: 'Add Deal Opportunity',
      description: 'Link this opportunity to a specific client, with its own value and stage.',
      icon: <Handshake size={22} />,
      onClick: onSelectDeal,
    },
    {
      key: 'business',
      label: 'Add Business',
      description: 'Start a category-based opportunity (no client yet) from one of your Business Categories.',
      icon: <BookOpen size={22} />,
      onClick: onSelectTraining,
    },
  ];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', maxWidth: '480px' }}>
      {OPTIONS.map(opt => (
        <button
          key={opt.key}
          onClick={opt.onClick}
          style={{
            display: 'flex', alignItems: 'center', gap: '14px', padding: '1rem 1.1rem', borderRadius: '10px',
            border: '1px solid var(--color-border)', background: 'var(--color-surface)', cursor: 'pointer', textAlign: 'left', width: '100%'
          }}
        >
          <div style={{
            width: '42px', height: '42px', borderRadius: '10px', flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(37,99,235,0.12), rgba(124,58,237,0.12))',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-secondary)'
          }}>
            {opt.icon}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--color-text-main)' }}>{opt.label}</div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{opt.description}</div>
          </div>
          <ChevronRight size={18} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
        </button>
      ))}
    </div>
  );
};

const TrainingDealForm = ({ categories, clients, onSubmit, onClose }: { categories: TrainingCategoryOption[]; clients: ClientOption[]; onSubmit: (data: { trainingCategoryId: string; client: string; description: string; expectedValue: string; stage: Deal['stage']; trainingDate: string }) => void; onClose: () => void }) => {
  const [trainingCategoryId, setTrainingCategoryId] = useState('');
  const [clientId, setClientId] = useState('');
  const [description, setDescription] = useState('');
  const [value, setValue] = useState('');
  const [stage, setStage] = useState<Deal['stage']>('Active');
  const [trainingDate, setTrainingDate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ trainingCategoryId, client: clientId, description, expectedValue: value, stage, trainingDate });
  };

  return (
    <form onSubmit={handleSubmit} className="sales-modal-form">
      <div className="sales-form-group">
        <label className="sales-form-label">Select Business Category *</label>
        <div className="sales-input-wrap">
          <span className="sales-input-icon"><Tag size={18} /></span>
          <select required value={trainingCategoryId} onChange={e => setTrainingCategoryId(e.target.value)}>
            <option value="">Select a category...</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
      <div className="sales-form-group">
        <label className="sales-form-label">Select Client</label>
        <div className="sales-input-wrap">
          <span className="sales-input-icon"><User size={18} /></span>
          <select value={clientId} onChange={e => setClientId(e.target.value)}>
            <option value="">Select a client...</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
      <div className="sales-form-group">
        <label className="sales-form-label">Description</label>
        <textarea
          className="sales-textarea"
          rows={3}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Scope, deliverables, or any other details about this opportunity..."
        />
      </div>
      <div className="sales-form-grid">
        <div className="sales-form-group">
          <label className="sales-form-label">Value (₹) *</label>
          <div className="sales-input-wrap">
            <span className="sales-input-icon"><IndianRupee size={18} /></span>
            <input required type="number" value={value} onChange={e => setValue(e.target.value)} placeholder="15000" />
          </div>
        </div>
        <div className="sales-form-group">
          <label className="sales-form-label">Stage</label>
          <div className="sales-input-wrap">
            <span className="sales-input-icon"><Type size={18} /></span>
            <select value={stage} onChange={e => setStage(e.target.value as any)}>
              <option value="Active">Active Opportunity</option>
              <option value="Negotiation">Negotiation</option>
            </select>
          </div>
        </div>
      </div>
      <div className="sales-form-group">
        <label className="sales-form-label">Business Date</label>
        <div className="sales-input-wrap">
          <span className="sales-input-icon"><CalendarDays size={18} /></span>
          <input type="date" value={trainingDate} onChange={e => setTrainingDate(e.target.value)} />
        </div>
      </div>
      <div className="sales-form-footer">
        <button type="button" onClick={onClose} className="sales-btn-cancel">Cancel</button>
        <button type="submit" className="sales-btn-submit">Add Opportunity</button>
      </div>
    </form>
  );
};

const DealForm = ({ clients, onSubmit, onClose }: { clients: ClientOption[]; onSubmit: (data: { title: string; client: string; description: string; expectedValue: string; stage: Deal['stage'] }) => void; onClose: () => void }) => {
  const [title, setTitle] = useState('');
  const [clientId, setClientId] = useState('');
  const [description, setDescription] = useState('');
  const [value, setValue] = useState('');
  const [stage, setStage] = useState<Deal['stage']>('Active');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ title, client: clientId, description, expectedValue: value, stage });
  };

  return (
    <form onSubmit={handleSubmit} className="sales-modal-form">
      <div className="sales-form-group">
        <label className="sales-form-label">Deal Title *</label>
        <div className="sales-input-wrap">
          <span className="sales-input-icon"><User size={18} /></span>
          <input required type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Fullstack Business" />
        </div>
      </div>
      <div className="sales-form-group">
        <label className="sales-form-label">Select Client</label>
        <div className="sales-input-wrap">
          <span className="sales-input-icon"><User size={18} /></span>
          <select value={clientId} onChange={e => setClientId(e.target.value)}>
            <option value="">Select a client...</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
      <div className="sales-form-group">
        <label className="sales-form-label">Description</label>
        <textarea
          className="sales-textarea"
          rows={3}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Scope, deliverables, or any other details about this opportunity..."
        />
      </div>
      <div className="sales-form-grid">
        <div className="sales-form-group">
          <label className="sales-form-label">Value (₹) *</label>
          <div className="sales-input-wrap">
            <span className="sales-input-icon"><IndianRupee size={18} /></span>
            <input required type="number" value={value} onChange={e => setValue(e.target.value)} placeholder="15000" />
          </div>
        </div>
        <div className="sales-form-group">
          <label className="sales-form-label">Stage</label>
          <div className="sales-input-wrap">
            <span className="sales-input-icon"><Type size={18} /></span>
            <select value={stage} onChange={e => setStage(e.target.value as any)}>
              <option value="Active">Active Opportunity</option>
              <option value="Negotiation">Negotiation</option>
            </select>
          </div>
        </div>
      </div>
      <div className="sales-form-footer">
        <button type="button" onClick={onClose} className="sales-btn-cancel">Cancel</button>
        <button type="submit" className="sales-btn-submit">Add Opportunity</button>
      </div>
    </form>
  );
};

const EditDealForm = ({ deal, clients, categories, onSubmit, onClose }: {
  deal: Deal;
  clients: ClientOption[];
  categories: TrainingCategoryOption[];
  onSubmit: (data: { title: string; client: string; trainingCategoryId: string; description: string; expectedValue: string; stage: Deal['stage']; trainingDate: string }) => void;
  onClose: () => void;
}) => {
  const initialTitle = (deal.title && isNaN(Number(deal.title))) ? deal.title : (deal.clientName ? `${deal.clientName} Opportunity` : 'Business Opportunity');
  const [title, setTitle] = useState(initialTitle);
  const [clientId, setClientId] = useState(deal.clientId ? String(deal.clientId) : '');
  const [trainingCategoryId, setTrainingCategoryId] = useState(deal.trainingCategoryId ? String(deal.trainingCategoryId) : '');
  const [description, setDescription] = useState(deal.description);
  const [value, setValue] = useState(deal.expectedValue);
  const [stage, setStage] = useState<Deal['stage']>(deal.stage);
  const [trainingDate, setTrainingDate] = useState(deal.trainingDate || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({ title, client: clientId, trainingCategoryId, description, expectedValue: value, stage, trainingDate });
  };

  return (
    <form onSubmit={handleSubmit} className="sales-modal-form">
      <div className="sales-form-group">
        <label className="sales-form-label">Deal / Opportunity Title *</label>
        <div className="sales-input-wrap">
          <span className="sales-input-icon"><User size={18} /></span>
          <input required type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. AI Research Contract" />
        </div>
      </div>
      <div className="sales-form-grid">
        <div className="sales-form-group">
          <label className="sales-form-label">Select Client</label>
          <div className="sales-input-wrap">
            <span className="sales-input-icon"><User size={18} /></span>
            <select value={clientId} onChange={e => setClientId(e.target.value)}>
              <option value="">Select a client...</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
        <div className="sales-form-group">
          <label className="sales-form-label">Business Category</label>
          <div className="sales-input-wrap">
            <span className="sales-input-icon"><Tag size={18} /></span>
            <select value={trainingCategoryId} onChange={e => setTrainingCategoryId(e.target.value)}>
              <option value="">No category</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>
      <div className="sales-form-group">
        <label className="sales-form-label">Description</label>
        <textarea
          className="sales-textarea"
          rows={3}
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Scope, deliverables, or any other details about this opportunity..."
        />
      </div>
      <div className="sales-form-grid">
        <div className="sales-form-group">
          <label className="sales-form-label">Value (₹) *</label>
          <div className="sales-input-wrap">
            <span className="sales-input-icon"><IndianRupee size={18} /></span>
            <input required type="number" value={value} onChange={e => setValue(e.target.value)} placeholder="15000" />
          </div>
        </div>
        <div className="sales-form-group">
          <label className="sales-form-label">Stage</label>
          <div className="sales-input-wrap">
            <span className="sales-input-icon"><Type size={18} /></span>
            <select value={stage} onChange={e => setStage(e.target.value as Deal['stage'])}>
              <option value="Active">Active</option>
              <option value="Negotiation">Negotiation</option>
              <option value="Won">Won</option>
              <option value="Lost">Lost</option>
            </select>
          </div>
        </div>
      </div>
      <div className="sales-form-group">
        <label className="sales-form-label">Business Date</label>
        <div className="sales-input-wrap">
          <span className="sales-input-icon"><CalendarDays size={18} /></span>
          <input type="date" value={trainingDate} onChange={e => setTrainingDate(e.target.value)} />
        </div>
      </div>
      <div className="sales-form-footer">
        <button type="button" onClick={onClose} className="sales-btn-cancel">Cancel</button>
        <button type="submit" className="sales-btn-submit">Save Changes</button>
      </div>
    </form>
  );
};

const ClientListModal = ({
  statusFilter,
  clients,
  onToggleStatus,
  onClose,
}: {
  statusFilter: 'Active' | 'Inactive';
  clients: ClientRecord[];
  onToggleStatus: (id: string | number, currentStatus: string) => void;
  onClose: () => void;
}) => {
  const filtered = clients.filter(c => statusFilter === 'Active' ? c.status === 'Active' : c.status !== 'Active');

  return (
    <div className="sales-modal-form">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
        <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--pmt-text)' }}>
          Portfolio Breakdown: {statusFilter} Clients ({filtered.length})
        </span>
      </div>

      {filtered.length === 0 ? (
        <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--pmt-text-3)', fontSize: '13px' }}>
          No {statusFilter.toLowerCase()} clients currently logged.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '360px', overflowY: 'auto', paddingRight: '4px' }}>
          {filtered.map(c => (
            <div key={String(c.id)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '10px 14px', borderRadius: '10px',
              background: 'var(--pmt-surface-2, #f4f4f5)', border: '1px solid var(--pmt-border, #e4e4e7)'
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--pmt-text)' }}>{c.name}</div>
                {c.email && <div style={{ fontSize: '11.5px', color: 'var(--pmt-text-3)' }}>{c.email}</div>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700,
                  background: c.status === 'Active' ? '#e8f5e9' : '#ffebee',
                  color: c.status === 'Active' ? '#2e7d32' : '#c62828'
                }}>
                  {c.status || 'Active'}
                </span>
                <button
                  type="button"
                  onClick={() => onToggleStatus(c.id, c.status || 'Active')}
                  style={{
                    padding: '6px 12px', borderRadius: '6px', border: '1px solid var(--pmt-border)',
                    background: 'var(--pmt-surface)', color: 'var(--pmt-text)', fontSize: '11.5px', cursor: 'pointer', fontWeight: 600
                  }}
                >
                  Set {c.status === 'Active' ? 'Inactive' : 'Active'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="sales-form-footer">
        <button type="button" onClick={onClose} className="sales-btn-cancel">Close</button>
      </div>
    </div>
  );
};

const QuoteForm = ({ clients = [], deals = [], categories = [], onSubmit, onClose }: {
  clients?: ClientOption[];
  deals?: Deal[];
  categories?: TrainingCategoryOption[];
  onSubmit: (data: { clientId: string | number; cost: number; categoryId?: number }) => void;
  onClose: () => void;
}) => {
  const safeClients = clients || [];
  const safeDeals = deals || [];
  const safeCategories = (categories && categories.length > 0) ? categories : DEFAULT_BUSINESS_CATEGORIES;

  const allClients = React.useMemo(() => {
    const map = new Map<string, { id: string | number; name: string; email: string }>();
    safeClients.forEach(c => {
      if (c.name) map.set(String(c.id), { id: c.id, name: c.name, email: c.email || '' });
    });
    safeDeals.forEach(d => {
      if (d.clientName) {
        const key = d.clientId ? String(d.clientId) : d.clientName;
        if (!map.has(key)) {
          map.set(key, { id: d.clientId || d.id, name: d.clientName, email: '' });
        }
      }
    });
    return Array.from(map.values());
  }, [safeClients, safeDeals]);

  const [selectedKey, setSelectedKey] = useState<string>(() => String(allClients[0]?.id || ''));
  const [dealId, setDealId] = useState<string | number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [customCost, setCustomCost] = useState<string>('');
  const [step, setStep] = useState<'select' | 'review'>('select');

  useEffect(() => {
    if (allClients.length && (!selectedKey || !allClients.some(c => String(c.id) === selectedKey))) {
      setSelectedKey(String(allClients[0].id));
    }
  }, [allClients]);

  const selectedClient = allClients.find(c => String(c.id) === selectedKey) || allClients[0];

  const clientDeals = safeDeals.filter(d =>
    (d.clientId && String(d.clientId) === selectedKey) ||
    (selectedClient && d.clientName && d.clientName.toLowerCase() === selectedClient.name.toLowerCase())
  );

  useEffect(() => {
    if (clientDeals.length > 0) {
      setDealId(clientDeals[0].id);
      setCustomCost(clientDeals[0].expectedValue || '');
      if (clientDeals[0].trainingCategoryId) {
        setSelectedCategoryId(String(clientDeals[0].trainingCategoryId));
      } else {
        setSelectedCategoryId(safeCategories[0] ? String(safeCategories[0].id) : '');
      }
    } else {
      setDealId(null);
      setCustomCost('');
      setSelectedCategoryId(safeCategories[0] ? String(safeCategories[0].id) : '');
    }
  }, [selectedKey]);

  const opportunity = dealId ? (safeDeals.find(d => String(d.id) === String(dealId)) || null) : null;
  const cost = opportunity ? (parseFloat(opportunity.expectedValue) || 0) : (parseFloat(customCost) || 0);

  const selectedCategory = safeCategories.find(c => String(c.id) === selectedCategoryId) ||
    (opportunity && opportunity.trainingCategoryId ? safeCategories.find(c => c.id === opportunity.trainingCategoryId) : null);

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cost || !selectedClient) return;
    setStep('review');
  };

  if (step === 'review') {
    return (
      <div className="sales-modal-form">
        <div style={{ padding: '1rem 1.1rem', background: 'var(--pmt-surface-2, var(--color-linen))', border: '1px solid var(--pmt-border)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--pmt-text-2)', fontSize: '13px' }}>Client</span>
            <span style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--pmt-text)' }}>{selectedClient?.name || '—'}</span>
          </div>
          {selectedClient?.email && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--pmt-text-2)', fontSize: '13px' }}>Email</span>
              <span style={{ fontSize: '13.5px', color: 'var(--pmt-text)' }}>{selectedClient.email}</span>
            </div>
          )}
          {opportunity && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--pmt-text-2)', fontSize: '13px' }}>Opportunity Type</span>
              <span style={{ fontSize: '13.5px', color: 'var(--pmt-text)' }}>{(opportunity.title && isNaN(Number(opportunity.title))) ? opportunity.title : (opportunity.trainingCategoryName || `${selectedClient?.name} Opportunity`)}</span>
            </div>
          )}
          {selectedCategory && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--pmt-text-2)', fontSize: '13px' }}>Business Category</span>
              <span style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--pmt-text)' }}>{selectedCategory.name}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--pmt-border)', paddingTop: '10px', marginTop: '2px' }}>
            <span style={{ color: 'var(--pmt-text-2)', fontSize: '13px' }}>Gross Cost</span>
            <span style={{ fontWeight: 800, fontSize: '17px', color: '#2563eb' }}>₹{cost.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <p style={{ fontSize: '12px', color: 'var(--pmt-text-3)', margin: 0, lineHeight: 1.5 }}>
          Confirm and generate formal price quotation with 18% GST server-side calculation for {selectedClient?.name}.
        </p>

        <div className="sales-form-footer">
          <button type="button" onClick={() => setStep('select')} className="sales-btn-cancel">Back</button>
          <button type="button" onClick={() => selectedClient && onSubmit({ clientId: selectedClient.id, cost, categoryId: selectedCategory?.id })} className="sales-btn-submit">Confirm &amp; Generate</button>
        </div>
      </div>
    );
  }

  const selectionKey = dealId ? String(dealId) : (selectedCategoryId ? `cat-${selectedCategoryId}` : '');

  return (
    <form onSubmit={handleContinue} className="sales-modal-form">
      <div className="sales-form-group">
        <label className="sales-form-label">Select Client *</label>
        <div className="sales-input-wrap">
          <span className="sales-input-icon"><User size={18} /></span>
          <select value={selectedKey} onChange={e => setSelectedKey(e.target.value)}>
            {allClients.length === 0 && <option value="">No clients available yet</option>}
            {allClients.map(c => <option key={String(c.id)} value={String(c.id)}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <div className="sales-form-group">
        <label className="sales-form-label">Select Business / Opportunity Type *</label>
        <div className="sales-input-wrap">
          <span className="sales-input-icon"><Briefcase size={18} /></span>
          <select
            value={selectionKey}
            onChange={e => {
              const val = e.target.value;
              if (val.startsWith('cat-')) {
                const catId = val.replace('cat-', '');
                setDealId(null);
                setSelectedCategoryId(catId);
              } else if (val) {
                setDealId(val);
                const found = safeDeals.find(d => String(d.id) === val);
                if (found) {
                  setCustomCost(found.expectedValue || '');
                  if (found.trainingCategoryId) setSelectedCategoryId(String(found.trainingCategoryId));
                }
              } else {
                setDealId(null);
                setSelectedCategoryId('');
              }
            }}
          >
            {clientDeals.length > 0 && (
              <optgroup label="Client Opportunities">
                {clientDeals.map(d => {
                  const displayLabel = (d.title && isNaN(Number(d.title))) ? d.title : (d.trainingCategoryName || (d.clientName ? `${d.clientName} Opportunity` : 'General Opportunity'));
                  return (
                    <option key={String(d.id)} value={String(d.id)}>
                      {displayLabel} — ₹{(parseFloat(d.expectedValue) || 0).toLocaleString('en-IN')}
                    </option>
                  );
                })}
              </optgroup>
            )}
            <optgroup label="Business / Training Categories">
              {safeCategories.map(cat => (
                <option key={cat.id} value={`cat-${cat.id}`}>
                  {cat.name}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      <div className="sales-form-group">
        <label className="sales-form-label">Gross Cost (₹) *</label>
        <div className="sales-input-wrap">
          <span className="sales-input-icon"><IndianRupee size={18} /></span>
          <input
            type="number"
            value={opportunity ? (opportunity.expectedValue || '') : customCost}
            onChange={e => setCustomCost(e.target.value)}
            disabled={!!opportunity}
            readOnly={!!opportunity}
            placeholder="e.g. 50000"
            style={{ cursor: opportunity ? 'not-allowed' : 'text', opacity: opportunity ? 0.85 : 1 }}
          />
        </div>
        <span style={{ display: 'block', fontSize: '11px', color: 'var(--pmt-text-3)', marginTop: '4px' }}>
          {opportunity ? "Fixed from the client's opportunity value. Edit in Sales -> Opportunities if needed." : "Enter gross quotation cost."}
        </span>
      </div>

      <div className="sales-form-footer">
        <button type="button" onClick={onClose} className="sales-btn-cancel">Cancel</button>
        <button type="submit" disabled={!cost || !selectedClient} className="sales-btn-submit">Generate Quote</button>
      </div>
    </form>
  );
};

export default SalesCRM;
