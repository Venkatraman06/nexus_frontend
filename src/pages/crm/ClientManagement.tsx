import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Mail, Phone, Star
} from 'lucide-react';
import styles from './ModulePlaceholder.module.css';
import { useModal } from '@/context/ModalContext';
import { useToast } from '@/context/ToastContext';


const API_URL = 'http://127.0.0.1:8000/pmt/api/v1';

// Client type used locally in this component
interface Client {
  deal_date_from?: string;
  deal_date_to?: string;
  assigned_to?: string;
  assigned_to_name?: string;
  deal_description?: string;
  business_category?: string;
  deal_title?: string;
  deal_amount?: number | string;
  id: number;
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

const ClientManagement: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const { openModal, closeModal } = useModal();
  const { addToast } = useToast();

   const fetchClients = async () => {
    try {
      const token = localStorage.getItem('ACCESS_TOKEN');
      const response = await fetch(`${API_URL}/clients/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setClients(data);
      } else {
        setClients([]);
      }
    } catch (e) {
      setClients([]);
    }
  };

  
  useEffect(() => {
    fetchClients();
  }, []);

  const handleCreateClient = async (data: Partial<Client>) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/clients/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (response.ok) {
        addToast('Client created successfully!', 'success');
        fetchClients();
        closeModal();
      } else {
        const mockNew: Client = {
          id: clients.length + 1,
          name: data.name || 'New Client',
          company: data.company || '',
          college: data.college || '',
          contact_person: data.contact_person || '',
          phone: data.phone || '',
          whatsapp: data.whatsapp || '',
          email: data.email || '',
          relationship_score: Number(data.relationship_score) || 80,
          status: data.status || 'Active',
          notes: data.notes || '',
          deal_date_from: undefined,
          deal_date_to: undefined,
          assigned_to: undefined,
          assigned_to_name: undefined,
          deal_description: undefined,
          business_category: undefined,
          deal_title: undefined,
          deal_amount: undefined
        };
        setClients([mockNew, ...clients]);
        addToast('Client created successfully (Mock mode)!', 'success');
        closeModal();
      }
    } catch (e) {
      addToast('Error saving client', 'error');
    }
  };

  const handleEditClient = async (id: number, data: Partial<Client>) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/clients/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(data)
      });
      if (response.ok) {
        addToast('Client updated successfully!', 'success');
        fetchClients();
        closeModal();
      } else {
        addToast('Failed to update client on backend', 'error');
      }
    } catch {
      addToast('Error updating client - check backend is running on port 8000', 'error');
    }
  };

  const handleDeleteClient = async (id: number) => {
    if (!window.confirm('Delete this client? This cannot be undone.')) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/clients/${id}/`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok || response.status === 204) {
        addToast('Client deleted', 'success');
        setClients(clients.filter(c => c.id !== id));
        closeModal();
      } else {
        addToast('Failed to delete client on backend', 'error');
      }
    } catch {
      addToast('Error deleting client - check backend is running on port 8000', 'error');
    }
  };

  const filtered = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.company.toLowerCase().includes(search.toLowerCase()) ||
    c.contact_person.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
      <div className={styles.header} style={{ borderBottom: 'none', paddingBottom: 0 }}>
        <div>
          <h1 className={styles.title}>Client CRM</h1>
          <p className={styles.subtitle}>Track business accounts, relationship scores, and communication history.</p>
        </div>
        <button className={styles.btnPrimary} onClick={() => openModal(<ClientForm onSubmit={handleCreateClient} onClose={closeModal} />, 'Add Account Client')}>
          <Plus size={16} /> New Client
        </button>
      </div>

      <div style={{ position: 'relative', width: '100%' }}>
        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
        <input 
          type="text" 
          placeholder="Search accounts, companies, contact persons..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', padding: '10px 10px 10px 36px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-surface)', color: 'var(--color-text-main)' }} 
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' }}>
        {filtered.map(client => (
          <div
            key={client.id}
            className="glass-panel"
            onClick={() => openModal(<ClientDetailView client={client} onEdit={handleEditClient} onDelete={handleDeleteClient} />, `Client Account Profile: ${client.name}`)}
            style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '10px', border: '1px solid var(--color-border)', cursor: 'pointer', transition: 'box-shadow 0.15s, transform 0.15s' }}
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
                onClick={(e) => { e.stopPropagation(); openModal(<ClientDetailView client={client} onEdit={handleEditClient} onDelete={handleDeleteClient} />, `Client Account Profile: ${client.name}`); }}
                style={{ flex: 1, padding: '8px', background: 'rgba(37,99,235,0.1)', color: 'var(--color-secondary)', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
              >
                View Profile
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); openModal(<ClientEditForm client={client} onSubmit={(data) => handleEditClient(client.id, data)} onClose={closeModal} />, `Edit: ${client.name}`); }}
                style={{ padding: '8px 12px', background: 'rgba(124,58,237,0.1)', color: '#7C3AED', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
              >
                Edit
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteClient(client.id); }}
                style={{ padding: '8px 12px', background: '#EF44441A', color: '#EF4444', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Form to add client
const ClientForm = ({ onSubmit, onClose }: { onSubmit: (data: Partial<Client>) => void; onClose: () => void }) => {
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
        <button type="button" onClick={onClose} style={{ padding: '8px 16px', color: 'var(--color-text-muted)', fontWeight: '600' }}>Cancel</button>
        <button type="submit" style={{ padding: '8px 16px', background: 'var(--color-secondary)', color: 'white', borderRadius: '8px', fontWeight: '600' }}>Save Client</button>
      </div>
    </form>
  );
};

// Client Details drawer View
const ClientDetailView = ({
  client, onEdit, onDelete,
}: {
  client: Client;
  onEdit: (id: number, data: Partial<Client>) => void;
  onDelete: (id: number) => void;
}) => {
  const [editing, setEditing] = useState(false);
  useModal();

  if (editing) {
    return <ClientEditForm client={client} onSubmit={(data) => onEdit(client.id, data)} onClose={() => setEditing(false)} />;
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

      {(client.business_category || client.deal_title) && (
        <div className="glass-panel" style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', border: '1px solid var(--color-border)', fontSize: '13px' }}>
          <h4 style={{ fontWeight: 'bold', fontSize: '14px', margin: 0 }}>Deal Details</h4>
          {client.business_category && <div><strong>Category:</strong> {client.business_category}</div>}
          {client.deal_title && <div><strong>Title:</strong> {client.deal_title}</div>}
          {client.deal_description && <div><strong>Description:</strong> {client.deal_description}</div>}
          {client.deal_amount && <div><strong>Amount:</strong> ${Number(client.deal_amount).toLocaleString()}</div>}
          {(client.deal_date_from || client.deal_date_to) && <div><strong>Duration:</strong> {client.deal_date_from} → {client.deal_date_to}</div>}
          {client.assigned_to_name && <div><strong>Assigned To:</strong> {client.assigned_to_name}</div>}
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
          style={{ padding: '8px 16px', background: 'var(--color-secondary)', color: 'white', borderRadius: '8px', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: '13px' }}
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(client.id)}
          style={{ padding: '8px 16px', background: '#EF44441A', color: '#EF4444', borderRadius: '8px', fontWeight: 700, border: '1px solid #EF444444', cursor: 'pointer', fontSize: '13px' }}
        >
          Delete
        </button>
      </div>
    </div>
  );
};

// Edit form for an existing client
const ClientEditForm = ({
  client, onSubmit, onClose,
}: {
  client: Client;
  onSubmit: (data: Partial<Client>) => void;
  onClose: () => void;
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
        <button type="button" onClick={onClose} style={{ padding: '8px 16px', color: 'var(--color-text-muted)', fontWeight: 600, border: '1.5px solid var(--color-border)', borderRadius: '8px', background: 'transparent', cursor: 'pointer' }}>Cancel</button>
        <button type="submit" style={{ padding: '8px 16px', background: 'var(--color-secondary)', color: 'white', borderRadius: '8px', fontWeight: 600, border: 'none', cursor: 'pointer' }}>Save Changes</button>
      </div>
    </form>
  );
};

export default ClientManagement;