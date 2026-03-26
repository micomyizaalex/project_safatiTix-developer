import { useState, useEffect, CSSProperties } from 'react';
import { useAuth } from '../components/AuthContext';
import { Bus, Search, Plus, Edit2, Trash2, UserCheck } from 'lucide-react';

const SAFARITIX = {
  primary: '#0077B6',
  primaryDark: '#005F8E',
  primarySoft: '#E6F4FB',
};

interface BusData {
  id: string;
  plateNumber: string;
  model: string;
  capacity: number;
  seatLayout: string;
  driverId: string | null;
  status: string;
}

export default function Buses() {
  const { accessToken } = useAuth();
  const [buses, setBuses] = useState<BusData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentBusId, setCurrentBusId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    plateNumber: '',
    model: '',
    capacity: '',
    seatLayout: '',
    status: 'active'
  });
  const API_URL = import.meta.env.VITE_API_URL || 'https://backend-v2-wjcs.onrender.com/api';

  useEffect(() => {
    fetchBuses();
  }, []);

  const fetchBuses = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching buses from:', `${API_URL}/company/buses`);
      
      const response = await fetch(`${API_URL}/company/buses`, {
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch buses: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Buses data received:', data);
      console.log('Number of buses:', data.buses?.length || 0);
      
      setBuses(data.buses || []);
    } catch (error) {
      console.error('Error fetching buses:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to load buses';
      setError(errorMsg);
      alert(`Error loading buses: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (bus: BusData) => {
    setEditMode(true);
    setCurrentBusId(bus.id);
    setFormData({
      plateNumber: bus.plateNumber,
      model: bus.model,
      capacity: bus.capacity.toString(),
      seatLayout: bus.seatLayout || '',
      status: bus.status
    });
    setShowModal(true);
  };

  const openAddModal = () => {
    setEditMode(false);
    setCurrentBusId(null);
    setFormData({
      plateNumber: '',
      model: '',
      capacity: '',
      seatLayout: '30',
      status: 'active'
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditMode(false);
    setCurrentBusId(null);
    setFormData({
      plateNumber: '',
      model: '',
      capacity: '',
      seatLayout: '',
      status: 'active'
    });
  };

  const handleSaveBus = async () => {
    try {
      if (!formData.plateNumber || !formData.model || !formData.capacity) {
        alert('Please fill in all required fields: Plate Number, Model, and Capacity');
        return;
      }

      if (!formData.seatLayout) {
        alert('Please select a seat layout');
        return;
      }

      // Validate capacity doesn't exceed seat layout
      const capacity = parseInt(formData.capacity);
      const seatLayout = parseInt(formData.seatLayout);
      
      if (capacity > seatLayout) {
        alert(`Capacity (${capacity}) cannot exceed seat layout (${seatLayout})`);
        return;
      }

      const url = editMode 
        ? `${API_URL}/company/buses/${currentBusId}`
        : `${API_URL}/company/buses`;
      
      const method = editMode ? 'PUT' : 'POST';

      // Build request body - exclude capacity when editing
      const requestBody: any = {
        plateNumber: formData.plateNumber,
        model: formData.model,
        seatLayout: formData.seatLayout,
        status: formData.status
      };

      // Only include capacity when creating a new bus
      if (!editMode) {
        requestBody.capacity = capacity;
      }

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save bus');
      }

      alert(editMode ? 'Bus updated successfully!' : 'Bus created successfully!');
      closeModal();
      fetchBuses();
    } catch (error) {
      console.error('Error saving bus:', error);
      alert(error instanceof Error ? error.message : 'Failed to save bus');
    }
  };

  const handleDeleteBus = async (busId: string, plateNumber: string) => {
    if (!confirm(`⚠️ DELETE BUS: ${plateNumber}\n\nThis action cannot be undone.\nAre you sure you want to permanently delete this bus?\n\nClick OK to delete, or Cancel to keep the bus.`)) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/company/buses/${busId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete bus');
      }

      alert('✅ Bus deleted successfully!');
      fetchBuses();
    } catch (error) {
      console.error('Error deleting bus:', error);
      alert(`❌ Error: ${error instanceof Error ? error.message : 'Failed to delete bus'}`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return '#10B981';
      case 'inactive':
        return '#6B7280';
      case 'maintenance':
        return '#F59E0B';
      default:
        return '#6B7280';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  };

  const filteredBuses = buses.filter(bus => {
    const matchesSearch = 
      bus.plateNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      bus.model.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = 
      filterStatus === 'all' || 
      bus.status.toLowerCase() === filterStatus.toLowerCase();

    return matchesSearch && matchesFilter;
  });

  const styles: Record<string, CSSProperties> = {
    container: {
      padding: '32px',
      maxWidth: '1600px',
      margin: '0 auto',
    },
    header: {
      marginBottom: '32px',
    },
    title: {
      fontSize: '28px',
      fontWeight: '700',
      color: '#111827',
      marginBottom: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    },
    subtitle: {
      fontSize: '14px',
      color: '#6B7280',
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '20px',
      marginBottom: '24px',
    },
    statCard: {
      background: 'white',
      padding: '20px',
      borderRadius: '12px',
      border: '1px solid #E5E7EB',
    },
    statLabel: {
      fontSize: '13px',
      color: '#6B7280',
      marginBottom: '8px',
      fontWeight: '500',
    },
    statValue: {
      fontSize: '24px',
      fontWeight: '700',
      color: '#111827',
    },
    controls: {
      background: 'white',
      padding: '20px',
      borderRadius: '12px',
      border: '1px solid #E5E7EB',
      marginBottom: '24px',
      display: 'flex',
      gap: '16px',
      flexWrap: 'wrap' as const,
      alignItems: 'center',
    },
    searchBox: {
      flex: '1',
      minWidth: '250px',
      position: 'relative' as const,
    },
    searchInput: {
      width: '100%',
      padding: '10px 10px 10px 40px',
      border: '1px solid #D1D5DB',
      borderRadius: '8px',
      fontSize: '14px',
      outline: 'none',
    },
    searchIcon: {
      position: 'absolute' as const,
      left: '12px',
      top: '50%',
      transform: 'translateY(-50%)',
      color: '#9CA3AF',
    },
    filterSelect: {
      padding: '10px 36px 10px 12px',
      border: '1px solid #D1D5DB',
      borderRadius: '8px',
      fontSize: '14px',
      outline: 'none',
      cursor: 'pointer',
      background: 'white',
    },
    addButton: {
      padding: '10px 20px',
      background: SAFARITIX.primary,
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    },
    tableContainer: {
      background: 'white',
      borderRadius: '12px',
      border: '1px solid #E5E7EB',
      overflow: 'hidden',
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse' as const,
    },
    thead: {
      background: '#F9FAFB',
      borderBottom: '1px solid #E5E7EB',
    },
    th: {
      padding: '16px',
      textAlign: 'left' as const,
      fontSize: '12px',
      fontWeight: '600',
      color: '#6B7280',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.5px',
    },
    td: {
      padding: '16px',
      borderBottom: '1px solid #F3F4F6',
      fontSize: '14px',
      color: '#374151',
    },
    statusBadge: {
      display: 'inline-block',
      padding: '4px 12px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '600',
      textAlign: 'center' as const,
      minWidth: '90px',
    },
    actionBtn: {
      padding: '8px',
      border: 'none',
      background: SAFARITIX.primarySoft,
      color: SAFARITIX.primary,
      borderRadius: '6px',
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: '8px',
    },
    deleteBtn: {
      padding: '8px',
      border: 'none',
      background: '#FEE2E2',
      color: '#DC2626',
      borderRadius: '6px',
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyState: {
      textAlign: 'center' as const,
      padding: '60px 20px',
      color: '#9CA3AF',
    },
    loading: {
      textAlign: 'center' as const,
      padding: '60px 20px',
      fontSize: '16px',
      color: '#6B7280',
    },
    modalOverlay: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
    },
    modalContent: {
      background: 'white',
      borderRadius: '16px',
      padding: '32px',
      width: '90%',
      maxWidth: '600px',
      maxHeight: '90vh',
      overflow: 'auto',
    },
    modalHeader: {
      fontSize: '24px',
      fontWeight: '700',
      color: '#111827',
      marginBottom: '24px',
    },
    formGroup: {
      marginBottom: '20px',
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '600',
      color: '#374151',
      marginBottom: '8px',
    },
    input: {
      width: '100%',
      padding: '10px 12px',
      border: '1px solid #D1D5DB',
      borderRadius: '8px',
      fontSize: '14px',
      outline: 'none',
      boxSizing: 'border-box' as const,
    },
    select: {
      width: '100%',
      padding: '10px 12px',
      border: '1px solid #D1D5DB',
      borderRadius: '8px',
      fontSize: '14px',
      outline: 'none',
      cursor: 'pointer',
      background: 'white',
      boxSizing: 'border-box' as const,
    },
    modalActions: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end',
      marginTop: '24px',
    },
    cancelBtn: {
      padding: '10px 24px',
      background: '#F3F4F6',
      color: '#374151',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
    },
    saveBtn: {
      padding: '10px 24px',
      background: SAFARITIX.primary,
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
    },
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading buses...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>
          <Bus size={32} color={SAFARITIX.primary} />
          Bus Fleet Management
        </h1>
        <p style={styles.subtitle}>
          Manage your company's bus fleet
        </p>
      </div>

      {/* Stats Grid */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Buses</div>
          <div style={styles.statValue}>{buses.length}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Active</div>
          <div style={styles.statValue}>
            {buses.filter(b => b.status.toLowerCase() === 'active').length}
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>In Maintenance</div>
          <div style={styles.statValue}>
            {buses.filter(b => b.status.toLowerCase() === 'maintenance').length}
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Capacity</div>
          <div style={styles.statValue}>
            {buses.reduce((sum, b) => sum + b.capacity, 0)} seats
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={styles.controls}>
        <div style={styles.searchBox}>
          <Search size={18} style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search by plate number or model..."
            style={styles.searchInput}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <select
          style={styles.filterSelect}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="maintenance">Maintenance</option>
        </select>

        <button
          style={styles.addButton}
          onClick={openAddModal}
        >
          <Plus size={18} />
          Add Bus
        </button>
      </div>

      {/* Table */}
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead style={styles.thead}>
            <tr>
              <th style={styles.th}>Plate Number</th>
              <th style={styles.th}>Model</th>
              <th style={styles.th}>Capacity</th>
              <th style={styles.th}>Seat Layout</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Driver Assigned</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBuses.length === 0 ? (
              <tr>
                <td colSpan={7} style={styles.emptyState}>
                  No buses found
                </td>
              </tr>
            ) : (
              filteredBuses.map((bus) => (
                <tr key={bus.id}>
                  <td style={styles.td}>
                    <strong style={{ fontSize: '15px', fontFamily: 'monospace' }}>
                      {bus.plateNumber}
                    </strong>
                  </td>
                  <td style={styles.td}>
                    {bus.model}
                  </td>
                  <td style={styles.td}>
                    <strong>{bus.capacity} seats</strong>
                  </td>
                  <td style={styles.td}>
                    {bus.seatLayout ? `${bus.seatLayout} seats (max)` : 'Not set'}
                  </td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.statusBadge,
                        background: `${getStatusColor(bus.status)}15`,
                        color: getStatusColor(bus.status),
                      }}
                    >
                      {getStatusLabel(bus.status)}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {bus.driverId ? (
                      <span style={{ color: '#10B981', fontWeight: '500' }}>
                        ✓ Assigned
                      </span>
                    ) : (
                      <span style={{ color: '#9CA3AF' }}>
                        No driver
                      </span>
                    )}
                  </td>
                  <td style={styles.td}>
                    <button
                      style={styles.actionBtn}
                      onClick={() => openEditModal(bus)}
                      title="Edit Bus"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      style={styles.deleteBtn}
                      onClick={() => handleDeleteBus(bus.id, bus.plateNumber)}
                      title="Delete Bus"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit/Add Modal */}
      {showModal && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalHeader}>
              {editMode ? 'Edit Bus' : 'Add New Bus'}
            </h2>
            
            <div style={styles.formGroup}>
              <label style={styles.label}>Plate Number *</label>
              <input
                type="text"
                style={styles.input}
                value={formData.plateNumber}
                onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })}
                placeholder="e.g., RAC 123A"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Model *</label>
              <input
                type="text"
                style={styles.input}
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                placeholder="e.g., Scania Luxury Coach"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Capacity (seats) *</label>
              <input
                type="number"
                style={{
                  ...styles.input,
                  ...(editMode ? {
                    background: '#F3F4F6',
                    cursor: 'not-allowed',
                    color: '#6B7280'
                  } : {})
                }}
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                placeholder="e.g., 45"
                min="1"
                disabled={editMode}
              />
              {editMode && (
                <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '6px', fontStyle: 'italic' }}>
                  Capacity cannot be changed for existing buses to maintain data integrity
                </p>
              )}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Seat Layout *</label>
              <select
                style={styles.select}
                value={formData.seatLayout}
                onChange={(e) => setFormData({ ...formData, seatLayout: e.target.value })}
              >
                <option value="">Select seat layout</option>
                <option value="25">25 seats</option>
                <option value="30">30 seats</option>
                <option value="50">50 seats</option>
              </select>
              <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '6px' }}>
                Maximum number of seats available on this bus
              </p>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Status *</label>
              <select
                style={styles.select}
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>

            <div style={styles.modalActions}>
              <button style={styles.cancelBtn} onClick={closeModal}>
                Cancel
              </button>
              <button style={styles.saveBtn} onClick={handleSaveBus}>
                {editMode ? 'Update Bus' : 'Create Bus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
