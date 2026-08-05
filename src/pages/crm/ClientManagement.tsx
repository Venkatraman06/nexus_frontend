import React, { useEffect, useRef, useState } from 'react';
import { 
  Plus, Search, Mail, Phone, Star
} from 'lucide-react';
import styles from './ModulePlaceholder.module.css';
import { useModal } from '@/context/ModalContext';
import { useToast } from '@/context/ToastContext';
import { del, get, patch, post } from '@/services/api';
import { useAnyPermission, usePermission } from '@/hooks/usePermission';
import { PERMS } from '@/constants/permissions';

// Client type used locally in this component
interface Client {
  deal_date_from?: string;
  deal_date_to?: string;
  assigned_to?: string | string[];
  assigned_to_name?: string;
  assigned_to_names?: string[];
  assigned_employee_ids?: string[];
  assigned_employee_names?: string[];
  assigned_employees?: Array<{ full_name?: string; name?: string; email?: string } | string>;
  deal_description?: string;
  business_category?: string;
  deal_title?: string;
  deal_amount?: number | string;
  id: number | string;
  name: string;
  company: string;
  college?: string;
  contact_person: string;
  phone?: string;
  whatsapp?: string;
  email?: string;
  relationship_score: number;
  status?: string;
  notes?: string;
}

type ClientPayload = Pick<Client,
  'name' | 'company' | 'college' | 'contact_person' | 'phone' | 'whatsapp' |
  'email' | 'relationship_score' | 'status' | 'notes' | 'business_category' |
  'deal_title' | 'deal_amount' | 'deal_date_from' | 'deal_date_to' | 'deal_description'
>;

const editableFields: (keyof ClientPayload)[] = [
  'name', 'company', 'college', 'contact_person', 'phone', 'whatsapp', 'email',
  'relationship_score', 'status', 'notes', 'business_category', 'deal_title',
  'deal_amount', 'deal_date_from', 'deal_date_to', 'deal_description',
];

const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';

const assignedEmployeesText = (client: Client, employeeNames: Map<string, string> = new Map()) => {
  if (client.assigned_employee_names?.length) return client.assigned_employee_names.join(', ');
  if (client.assigned_to_names?.length) return client.assigned_to_names.join(', ');
  if (client.assigned_employees?.length) {
    return client.assigned_employees
      .map(employee => typeof employee === 'string' ? employeeNames.get(employee) || employee : employee.full_name || employee.name || employee.email)
      .filter(Boolean)
      .join(', ');
  }
  if (client.assigned_to_name) return client.assigned_to_name;
  const assignedIds = client.assigned_employee_ids || (Array.isArray(client.assigned_to) ? client.assigned_to : []);
  if (assignedIds.length) return assignedIds.map(id => employeeNames.get(id) || id).join(', ');
  return typeof client.assigned_to === 'string' ? client.assigned_to : '';
};

const toPayload = (data: Partial<Client>): Partial<ClientPayload> => {
  const payload: Partial<ClientPayload> = {};
  editableFields.forEach((field) => {
    if (field in data) payload[field] = data[field] as never;
  });
  payload.name = text(payload.name);
  payload.company = text(payload.company);
  payload.contact_person = text(payload.contact_person);
  payload.email = text(payload.email);
  payload.phone = text(payload.phone);
  payload.whatsapp = text(payload.whatsapp);
  return payload;
};

const changedPayload = (original: Client, updated: Partial<Client>): Partial<ClientPayload> => {
  const payload = toPayload(updated);
  return Object.fromEntries(
    Object.entries(payload).filter(([field, value]) => value !== original[field as keyof Client])
  ) as Partial<ClientPayload>;
};

const isValidClient = (value: unknown): value is Client => {
  if (!value || typeof value !== 'object') return false;
  const client = value as Partial<Client>;
  return (client.id !== null && client.id !== undefined) &&
    typeof client.name === 'string' &&
    typeof client.company === 'string' &&
    typeof client.contact_person === 'string' &&
    typeof client.relationship_score === 'number';
};

const ClientManagement: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | string | null>(null);
  const [employeeNames, setEmployeeNames] = useState<Map<string, string>>(new Map());
  const fetchRequest = useRef(0);
  const { openModal, closeModal } = useModal();
  const { addToast } = useToast();
  const canCreate = useAnyPermission([PERMS.PROJECT_CLIENT_CREATE, PERMS.FINANCE_DOCUMENT_CREATE]);
  const canUpdate = usePermission(PERMS.PROJECT_CLIENT_UPDATE);
  const canDelete = usePermission(PERMS.PROJECT_CLIENT_DELETE);

  const fetchClients = async () => {
    const requestId = ++fetchRequest.current;
    setIsLoading(true);
    setLoadError(false);
    try {
      const data = await get<unknown>('/clients/');
      if (requestId !== fetchRequest.current) return;
      setClients(Array.isArray(data) ? data.filter(isValidClient) : []);
    } catch {
      if (requestId !== fetchRequest.current) return;
      setLoadError(true);
    } finally {
      if (requestId === fetchRequest.current) setIsLoading(false);
    }
  };

  
  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    get<Array<{ id: string; full_name: string }>>('/employees/simple-dropdown/')
      .then(employees => setEmployeeNames(new Map(employees.map(employee => [employee.id, employee.full_name]))))
      .catch(() => setEmployeeNames(new Map()));
  }, []);

  const handleCreateClient = async (data: Partial<Client>) => {
    if (!canCreate || isSaving) return;
    const payload = toPayload(data);
    if (!payload.name || !payload.contact_person) {
      addToast('Client name and contact person are required.', 'error');
      return;
    }
    setIsSaving(true);
    try {
      await post<Client>('/clients/', payload);
      addToast('Client created successfully!', 'success');
      await fetchClients();
      closeModal();
    } catch {
      addToast('Error saving client', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditClient = async (id: number | string, data: Partial<Client>) => {
    if (!canUpdate || isSaving) return;
    const original = clients.find(client => client.id === id);
    if (!original) {
      addToast('This client is no longer available. Refresh and try again.', 'error');
      return;
    }
    const payload = changedPayload(original, data);
    if (!payload.name || !payload.contact_person) {
      addToast('Client name and contact person are required.', 'error');
      return;
    }
    if (Object.keys(payload).length === 0) {
      closeModal();
      return;
    }
    setIsSaving(true);
    try {
      await patch<Client>(`/clients/${id}/`, payload);
      addToast('Client updated successfully!', 'success');
      await fetchClients();
      closeModal();
    } catch {
      addToast('Unable to update client. Please try again.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClient = async (client: Client) => {
    if (!canDelete || deletingId !== null) return;
    if (!window.confirm(`Delete client "${client.name}"? This cannot be undone.`)) return;
    setDeletingId(client.id);
    try {
      await del(`/clients/${client.id}/`);
      addToast('Client deleted', 'success');
      setClients(currentClients => currentClients.filter(currentClient => currentClient.id !== client.id));
      closeModal();
    } catch {
      addToast('Unable to delete client. Please try again.', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const normalizedSearch = search.trim().toLowerCase();
  const filtered = clients.filter(c => 
    c.name.toLowerCase().includes(normalizedSearch) || 
    c.company.toLowerCase().includes(normalizedSearch) ||
    c.contact_person.toLowerCase().includes(normalizedSearch)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      <div className={styles.header} style={{ borderBottom: 'none', paddingBottom: 0 }}>
        <div>
          <h1 className={styles.title}>Client CRM</h1>
          <p className={styles.subtitle}>Track business accounts, relationship scores, and communication history.</p>
        </div>
        {canCreate && <button className={styles.btnPrimary} onClick={() => openModal(<ClientForm onSubmit={handleCreateClient} onClose={closeModal} isSaving={isSaving} />, 'Add Account Client')}>
          <Plus size={16} /> New Client
        </button>}
      </div>

      <div style={{ position: 'relative', width: '100%' }}>
        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
        <input 
          type="text" 
          aria-label="Search clients"
          placeholder="Search accounts, companies, contact persons..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '10px 10px 10px 36px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-main)' }} 
        />
      </div>

      {loadError && (
        <div role="alert" className="glass-panel" style={{ padding: '1rem', border: '1px solid #EF4444' }}>
          Unable to load clients. <button type="button" onClick={() => void fetchClients()}>Try again</button>
        </div>
      )}

      {isLoading ? <p aria-live="polite">Loading clients…</p> : !loadError && (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {filtered.map(client => (
          <div
            key={client.id}
            className="glass-panel"
            style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '10px', border: '1px solid var(--color-border)', transition: 'box-shadow 0.15s, transform 0.15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.10)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 'bold' }}>{client.name}</h3>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>{client.company}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'rgba(37,99,235,0.1)', padding: '4px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold', color: 'var(--color-secondary)' }}>
                <Star size={12} fill="var(--color-secondary)"/> Score: {client.relationship_score}
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '4px 0' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
              <div><strong>Primary Contact:</strong> {client.contact_person}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-text-muted)' }}><Mail size={12}/> {client.email}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--color-text-muted)' }}><Phone size={12}/> {client.phone}</div>
              {client.business_category && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <span style={{ fontSize: '10.5px', fontWeight: 700, color: 'var(--color-secondary)', background: 'rgba(37,99,235,0.08)', padding: '2px 8px', borderRadius: '999px' }}>
                    {client.business_category}
                  </span>
                  {client.deal_amount && (
                    <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#10B981' }}>
                      ${Number(client.deal_amount).toLocaleString()}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button
                onClick={() => openModal(<ClientDetailView client={client} employeeNames={employeeNames} onEdit={handleEditClient} onDelete={handleDeleteClient} canUpdate={canUpdate} canDelete={canDelete} isSaving={isSaving} isDeleting={deletingId === client.id} />, `Client Account Profile: ${client.name}`)}
                style={{ flex: 1, padding: '8px', background: 'rgba(37,99,235,0.1)', color: 'var(--color-secondary)', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
              >
                View Profile
              </button>
              {canUpdate && <button
                  onClick={() => openModal(<ClientEditForm client={client} onSubmit={(data) => handleEditClient(client.id, data)} onClose={closeModal} isSaving={isSaving} />, `Edit: ${client.name}`)}
                style={{ padding: '8px 12px', background: 'rgba(124,58,237,0.1)', color: '#7C3AED', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
              >
                Edit
              </button>}
              {canDelete && <button
                type="button"
                disabled={deletingId !== null}
                onClick={() => handleDeleteClient(client)}
                style={{ padding: '8px 12px', background: '#EF44441A', color: '#EF4444', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
              >
                {deletingId === client.id ? 'Deleting…' : 'Delete'}
              </button>}
            </div>
          </div>
        ))}
      </div>
      )}
    </div>
  );
};

// Form to add client
const ClientForm = ({ onSubmit, onClose, isSaving }: {
  onSubmit: (data: Partial<Client>) => void;
  onClose: () => void;
  isSaving: boolean;
}) => {
  const [formData, setFormData] = useState<Partial<Client>>({
    name: '', company: '', college: '', contact_person: '',
    phone: '', whatsapp: '', email: '', relationship_score: 90,
    status: 'Active', notes: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '0.5rem', width: '100%', maxWidth: '500px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Client Name *</label>
          <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-main)' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Company Group</label>
          <input type="text" value={formData.company} onChange={e => setFormData({ ...formData, company: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-main)' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Contact Person *</label>
          <input required type="text" value={formData.contact_person} onChange={e => setFormData({ ...formData, contact_person: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-main)' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Relationship Score *</label>
          <input required type="number" min="0" max="100" value={formData.relationship_score} onChange={e => setFormData({ ...formData, relationship_score: Number(e.target.value) })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-main)' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Phone</label>
          <input type="text" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-main)' }} />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Email</label>
          <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-main)' }} />
        </div>
      </div>
      <div>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '4px' }}>Notes</label>
        <textarea rows={2} value={formData.notes} onChange={e => setFormData({ ...formData, notes: e.target.value })} style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-main)', resize: 'vertical' }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
        <button type="button" onClick={onClose} disabled={isSaving} style={{ padding: '8px 16px', color: 'var(--color-text-muted)', fontWeight: '600' }}>Cancel</button>
        <button type="submit" disabled={isSaving} style={{ padding: '8px 16px', background: 'var(--color-secondary)', color: 'white', borderRadius: '8px', fontWeight: '600' }}>{isSaving ? 'Saving…' : 'Save Client'}</button>
      </div>
    </form>
  );
};

// Client Details drawer View
const ClientDetailView = ({
  client, employeeNames, onEdit, onDelete, canUpdate, canDelete, isSaving, isDeleting,
}: {
  client: Client;
  employeeNames: Map<string, string>;
  onEdit: (id: number | string, data: Partial<Client>) => void;
  onDelete: (client: Client) => void;
  canUpdate: boolean;
  canDelete: boolean;
  isSaving: boolean;
  isDeleting: boolean;
}) => {
  const [editing, setEditing] = useState(false);
  useModal();
  const assignedTo = assignedEmployeesText(client, employeeNames) || '—';

  if (editing) {
    return <ClientEditForm client={client} onSubmit={(data) => onEdit(client.id, data)} onClose={() => setEditing(false)} isSaving={isSaving} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%', maxWidth: '500px', padding: '0.5rem' }}>
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>{client.name}</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>{client.company}</p>
      </div>

      <div className="glass-panel" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid var(--color-border)', fontSize: '13px' }}>
        <div><strong>Placement Head:</strong> {client.contact_person}</div>
        <div><strong>Email Address:</strong> {client.email}</div>
        <div><strong>Phone/WhatsApp:</strong> {client.phone}</div>
        <div><strong>Relationship Score:</strong> {client.relationship_score}%</div>
      </div>

      {(client.business_category || client.deal_title || assignedTo !== '—') && (
        <div className="glass-panel" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid var(--color-border)', fontSize: '13px' }}>
          <h4 style={{ fontWeight: 'bold', fontSize: '14px', margin: 0 }}>Deal Details</h4>
          {client.business_category && <div><strong>Category:</strong> {client.business_category}</div>}
          {client.deal_title && <div><strong>Title:</strong> {client.deal_title}</div>}
          {client.deal_description && <div><strong>Description:</strong> {client.deal_description}</div>}
          {client.deal_amount && <div><strong>Amount:</strong> ${Number(client.deal_amount).toLocaleString()}</div>}
          {(client.deal_date_from || client.deal_date_to) && <div><strong>Duration:</strong> {client.deal_date_from} → {client.deal_date_to}</div>}
          <div><strong>Assigned To:</strong> {assignedTo}</div>
        </div>
      )}

      <div>
        <h4 style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '6px' }}>Client Contract History</h4>
        <p style={{ fontSize: '13px', background: 'var(--color-bg)', padding: '10px', borderRadius: '6px', margin: 0 }}>
          {client.notes || 'No notes logged.'}
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
        <button
          onClick={() => setEditing(true)}
          disabled={isSaving || !canUpdate}
          title={canUpdate ? 'Edit client' : 'You do not have permission to edit clients'}
          style={{ padding: '8px 16px', background: 'var(--color-secondary)', color: 'white', borderRadius: '8px', fontWeight: 700, border: 'none', cursor: canUpdate ? 'pointer' : 'not-allowed', opacity: canUpdate ? 1 : 0.55, fontSize: '13px' }}
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(client)}
          disabled={isDeleting || !canDelete}
          title={canDelete ? 'Delete client' : 'You do not have permission to delete clients'}
          style={{ padding: '8px 16px', background: '#EF44441A', color: '#EF4444', borderRadius: '8px', fontWeight: 700, border: '1px solid #EF444444', cursor: canDelete ? 'pointer' : 'not-allowed', opacity: canDelete ? 1 : 0.55, fontSize: '13px' }}
        >
          {isDeleting ? 'Deleting…' : 'Delete'}
        </button>
      </div>
    </div>
  );
};

// Edit form for an existing client
const ClientEditForm = ({
  client, onSubmit, onClose, isSaving,
}: {
  client: Client;
  onSubmit: (data: Partial<Client>) => void;
  onClose: () => void;
  isSaving: boolean;
}) => {
  const [formData, setFormData] = useState<Partial<Client>>({ ...client });

  const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-main)' };
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '4px' };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '0.5rem', width: '100%', maxWidth: '500px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div>
          <label style={labelStyle}>Client Name *</label>
          <input required type="text" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Company Group</label>
          <input type="text" value={formData.company || ''} onChange={e => setFormData({ ...formData, company: e.target.value })} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Contact Person *</label>
          <input required type="text" value={formData.contact_person || ''} onChange={e => setFormData({ ...formData, contact_person: e.target.value })} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Relationship Score *</label>
          <input required type="number" min="0" max="100" value={formData.relationship_score ?? 0} onChange={e => setFormData({ ...formData, relationship_score: Number(e.target.value) })} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Phone</label>
          <input type="text" value={formData.phone || ''} onChange={e => setFormData({ ...formData, phone: e.target.value })} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>Email</label>
          <input type="email" value={formData.email || ''} onChange={e => setFormData({ ...formData, email: e.target.value })} style={inputStyle} />
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
        <h4 style={{ fontWeight: 700, fontSize: '14px', marginBottom: '10px' }}>Deal Details</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={labelStyle}>Business Category</label>
            <select value={formData.business_category || ''} onChange={e => setFormData({ ...formData, business_category: e.target.value })} style={inputStyle}>
              <option value="">— Select —</option>
              <option value="TRAINING">Training</option>
              <option value="CONSULTING">Consulting</option>
              <option value="SALES">Sales</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Deal Title</label>
            <input type="text" value={formData.deal_title || ''} onChange={e => setFormData({ ...formData, deal_title: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Amount ($)</label>
            <input type="number" step="0.01" value={formData.deal_amount ?? ''} onChange={e => setFormData({ ...formData, deal_amount: e.target.value })} style={inputStyle} />
          </div>
          <div />
          <div>
            <label style={labelStyle}>Date From</label>
            <input type="date" value={formData.deal_date_from || ''} onChange={e => setFormData({ ...formData, deal_date_from: e.target.value })} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Date To</label>
            <input type="date" value={formData.deal_date_to || ''} onChange={e => setFormData({ ...formData, deal_date_to: e.target.value })} style={inputStyle} />
          </div>
        </div>
        <div style={{ marginTop: '1rem' }}>
          <label style={labelStyle}>Deal Description</label>
          <textarea rows={2} value={formData.deal_description || ''} onChange={e => setFormData({ ...formData, deal_description: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Notes</label>
        <textarea rows={2} value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} style={{ ...inputStyle, resize: 'vertical' }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--color-border)', paddingTop: '1rem' }}>
        <button type="button" onClick={onClose} disabled={isSaving} style={{ padding: '8px 16px', color: 'var(--color-text-muted)', fontWeight: 600, border: '1.5px solid var(--color-border)', borderRadius: '8px', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
        <button type="submit" disabled={isSaving} style={{ padding: '8px 16px', background: 'var(--color-secondary)', color: 'white', borderRadius: '8px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>{isSaving ? 'Saving…' : 'Save Changes'}</button>
      </div>
    </form>
  );
};

export default ClientManagement;
