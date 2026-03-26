import { useState, useEffect, CSSProperties } from 'react';
import { useAuth } from '../components/AuthContext';
import { Users, Search, Plus, Edit2, Trash2, Phone, CreditCard } from 'lucide-react';
import { API_URL } from '../../config';

const SAFARITIX = {
  primary: '#0077B6',
  primaryDark: '#005F8E',
  primarySoft: '#E6F4FB',
};

interface BusInfo {
  id: string;
  plate_number: string;
  model: string;
  capacity: number;
  status: string;
}

interface CompanyBus {
  id: string;
  plateNumber: string;
  model: string;
  capacity: number;
  seatLayout: string;
  driverId: string | null;
  status: string;
}

interface DriverData {
  id: string;
  name: string;
  license: string;
  phone: string;
  available: boolean;
  buses: BusInfo[];
}

export default function Drivers() {
  const { accessToken } = useAuth();
  const [drivers, setDrivers] = useState<DriverData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [currentDriverId, setCurrentDriverId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    license: '',
    phone: '',
    available: true,
  });
  const [availableBuses, setAvailableBuses] = useState<CompanyBus[]>([]);
  const [selectedBusIds, setSelectedBusIds] = useState<string[]>([]);
  const [initialBusIds, setInitialBusIds] = useState<string[]>([]);
  useEffect(() => {
    fetchDrivers();
  }, []);

  const fetchDrivers = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching drivers from:', `${API_URL}/company/drivers`);
      
      const response = await fetch(`${API_URL}/company/drivers`, {
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch drivers: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Drivers data received:', data);
      console.log('Number of drivers:', data.drivers?.length || 0);
      
      setDrivers(data.drivers || []);
    } catch (error) {
      console.error('Error fetching drivers:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to load drivers';
      setError(errorMsg);
      alert(`Error loading drivers: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchBuses = async () => {
    try {
      const response = await fetch(`${API_URL}/company/buses`, {
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch buses');
      }
      
      const data = await response.json();
      setAvailableBuses(data.buses || []);
    } catch (error) {
      console.error('Error fetching buses:', error);
    }
  };

  const openAddModal = () => {
    setFormData({
      name: '',
      license: '',
      phone: '',
      available: true,
    });
    setEditMode(false);
    setCurrentDriverId(null);
    setShowModal(true);
  };

  const openEditModal = async (driver: DriverData) => {
    setFormData({
      name: driver.name,
      license: driver.license,
      phone: driver.phone,
      available: driver.available,
    });
    setEditMode(true);
    setCurrentDriverId(driver.id);
    
    // Fetch buses and set selected buses
    await fetchBuses();
    const assignedBusIds = driver.buses?.map(b => b.id) || [];
    setSelectedBusIds(assignedBusIds);
    setInitialBusIds(assignedBusIds);
    
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditMode(false);
    setCurrentDriverId(null);
    setFormData({
      name: '',
      license: '',
      phone: '',
      available: true,
    });
    setSelectedBusIds([]);
    setInitialBusIds([]);
    setAvailableBuses([]);
  };

  const handleSaveDriver = async () => {
    // Validation
    if (!formData.name.trim()) {
      alert('Please enter driver name');
      return;
    }
    if (!formData.license.trim()) {
      alert('Please enter license number');
      return;
    }

    try {
      const url = editMode
        ? `${API_URL}/company/drivers/${currentDriverId}`
        : `${API_URL}/company/drivers`;
      
      const method = editMode ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to ${editMode ? 'update' : 'create'} driver`);
      }

      // If in edit mode, handle bus assignments
      if (editMode && currentDriverId) {
        await handleBusAssignments(currentDriverId);
      }

      await fetchDrivers();
      closeModal();
      alert(`Driver ${editMode ? 'updated' : 'added'} successfully!`);
    } catch (error) {
      console.error('Error saving driver:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to save driver';
      alert(`Error: ${errorMsg}`);
    }
  };

  const handleBusAssignments = async (driverId: string) => {
    try {
      // Find buses to assign (newly selected)
      const busesToAssign = selectedBusIds.filter(id => !initialBusIds.includes(id));
      
      // Find buses to unassign (previously selected but now deselected)
      const busesToUnassign = initialBusIds.filter(id => !selectedBusIds.includes(id));

      // Assign buses
      for (const busId of busesToAssign) {
        await fetch(`${API_URL}/company/buses/${busId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ driverId }),
        });
      }

      // Unassign buses
      for (const busId of busesToUnassign) {
        await fetch(`${API_URL}/company/buses/${busId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ driverId: null }),
        });
      }
    } catch (error) {
      console.error('Error updating bus assignments:', error);
      throw error;
    }
  };

  const handleDeleteDriver = async (driver: DriverData) => {
    const hasAssignedBuses = driver.buses && driver.buses.length > 0;
    
    const confirmMessage = hasAssignedBuses
      ? `Warning: ${driver.name} is currently assigned to ${driver.buses.length} bus(es).\n\nYou must unassign all buses before deleting this driver.\n\nCannot proceed with deletion.`
      : `Are you sure you want to delete driver "${driver.name}"?\n\n⚠️ This action cannot be undone.\n\nDriver details:\n- License: ${driver.license}\n- Phone: ${driver.phone || 'N/A'}\n\nClick OK to permanently delete this driver.`;

    if (hasAssignedBuses) {
      alert(confirmMessage);
      return;
    }

    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/company/drivers/${driver.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete driver');
      }

      await fetchDrivers();
      alert('Driver deleted successfully!');
    } catch (error) {
      console.error('Error deleting driver:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to delete driver';
      alert(`Error: ${errorMsg}`);
    }
  };

  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = 
      driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.license.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.phone.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesFilter = 
      filterStatus === 'all' || 
      (filterStatus === 'available' && driver.available) ||
      (filterStatus === 'unavailable' && !driver.available);

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
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 12px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '600',
      minWidth: '90px',
    },
    busBadge: {
      display: 'inline-block',
      padding: '4px 8px',
      background: SAFARITIX.primarySoft,
      color: SAFARITIX.primary,
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: '500',
      marginRight: '4px',
      marginBottom: '4px',
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
      maxWidth: '500px',
      maxHeight: '90vh',
      overflow: 'auto',
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    },
    modalHeader: {
      fontSize: '24px',
      fontWeight: '700',
      color: '#111827',
      marginBottom: '24px',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
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
      padding: '12px',
      border: '1px solid #D1D5DB',
      borderRadius: '8px',
      fontSize: '14px',
      outline: 'none',
      boxSizing: 'border-box' as const,
    },
    checkboxGroup: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginTop: '8px',
    },
    checkbox: {
      width: '18px',
      height: '18px',
      cursor: 'pointer',
    },
    checkboxLabel: {
      fontSize: '14px',
      color: '#374151',
      cursor: 'pointer',
    },
    modalActions: {
      display: 'flex',
      gap: '12px',
      marginTop: '32px',
      justifyContent: 'flex-end',
    },
    cancelButton: {
      padding: '10px 24px',
      background: '#F3F4F6',
      color: '#374151',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
    },
    saveButton: {
      padding: '10px 24px',
      background: SAFARITIX.primary,
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
    },
    busAssignmentSection: {
      marginBottom: '20px',
      padding: '16px',
      background: '#F9FAFB',
      borderRadius: '8px',
      border: '1px solid #E5E7EB',
    },
    busCheckboxList: {
      maxHeight: '200px',
      overflowY: 'auto' as const,
      marginTop: '12px',
    },
    busCheckboxItem: {
      display: 'flex',
      alignItems: 'center',
      padding: '8px 12px',
      marginBottom: '4px',
      background: 'white',
      borderRadius: '6px',
      border: '1px solid #E5E7EB',
    },
    busCheckbox: {
      width: '18px',
      height: '18px',
      cursor: 'pointer',
      marginRight: '10px',
    },
    busLabel: {
      fontSize: '14px',
      color: '#374151',
      cursor: 'pointer',
      flex: 1,
    },
    busStatus: {
      fontSize: '12px',
      color: '#6B7280',
      marginLeft: '8px',
    },
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Loading drivers...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>
          <Users size={32} color={SAFARITIX.primary} />
          Driver Management
        </h1>
        <p style={styles.subtitle}>
          Manage your company's drivers
        </p>
      </div>

      {/* Stats Grid */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Total Drivers</div>
          <div style={styles.statValue}>{drivers.length}</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Available</div>
          <div style={styles.statValue}>
            {drivers.filter(d => d.available).length}
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>On Duty</div>
          <div style={styles.statValue}>
            {drivers.filter(d => d.buses && d.buses.length > 0).length}
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Unassigned</div>
          <div style={styles.statValue}>
            {drivers.filter(d => !d.buses || d.buses.length === 0).length}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div style={styles.controls}>
        <div style={styles.searchBox}>
          <Search size={18} style={styles.searchIcon} />
          <input
            type="text"
            placeholder="Search by name, license, or phone..."
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
          <option value="all">All Drivers</option>
          <option value="available">Available</option>
          <option value="unavailable">Unavailable</option>
        </select>

        <button
          style={styles.addButton}
          onClick={openAddModal}
        >
          <Plus size={18} />
          Add Driver
        </button>
      </div>

      {/* Table */}
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead style={styles.thead}>
            <tr>
              <th style={styles.th}>Name</th>
              <th style={styles.th}>License Number</th>
              <th style={styles.th}>Phone</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Assigned Buses</th>
              <th style={styles.th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDrivers.length === 0 ? (
              <tr>
                <td colSpan={6} style={styles.emptyState}>
                  No drivers found
                </td>
              </tr>
            ) : (
              filteredDrivers.map((driver) => (
                <tr key={driver.id}>
                  <td style={styles.td}>
                    <strong style={{ fontSize: '15px' }}>
                      {driver.name}
                    </strong>
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CreditCard size={14} color="#6B7280" />
                      <span style={{ fontFamily: 'monospace' }}>{driver.license}</span>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Phone size={14} color="#6B7280" />
                      {driver.phone}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.statusBadge,
                        background: driver.available ? '#DCFCE7' : '#F3F4F6',
                        color: driver.available ? '#15803D' : '#6B7280',
                      }}
                    >
                      {driver.available ? '✓ Available' : '✗ Unavailable'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    {driver.buses && driver.buses.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {driver.buses.map((bus) => (
                          <span key={bus.id} style={styles.busBadge} title={bus.model}>
                            {bus.plate_number}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: '#9CA3AF', fontSize: '13px' }}>
                        No buses assigned
                      </span>
                    )}
                  </td>
                  <td style={styles.td}>
                    <button
                      style={styles.actionBtn}
                      onClick={() => openEditModal(driver)}
                      title="Edit Driver"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      style={styles.deleteBtn}
                      onClick={() => handleDeleteDriver(driver)}
                      title="Delete Driver"
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

      {/* Add/Edit Modal */}
      {showModal && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={styles.modalHeader}>
              <Users size={28} color={SAFARITIX.primary} />
              {editMode ? 'Edit Driver' : 'Add New Driver'}
            </h2>

            <div style={styles.formGroup}>
              <label style={styles.label}>Driver Name *</label>
              <input
                type="text"
                style={styles.input}
                placeholder="Enter driver full name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>License Number *</label>
              <input
                type="text"
                style={styles.input}
                placeholder="Enter license number"
                value={formData.license}
                onChange={(e) => setFormData({ ...formData, license: e.target.value })}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Phone Number</label>
              <input
                type="text"
                style={styles.input}
                placeholder="Enter phone number (optional)"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Availability Status</label>
              <div style={styles.checkboxGroup}>
                <input
                  type="checkbox"
                  id="available"
                  style={styles.checkbox}
                  checked={formData.available}
                  onChange={(e) => setFormData({ ...formData, available: e.target.checked })}
                />
                <label htmlFor="available" style={styles.checkboxLabel}>
                  Driver is available for assignments
                </label>
              </div>
            </div>

            {/* Bus Assignment Section (only in edit mode) */}
            {editMode && (
              <div style={styles.busAssignmentSection}>
                <label style={styles.label}>Assigned Buses</label>
                <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px', marginBottom: '8px' }}>
                  Select buses to assign to this driver
                </p>
                <div style={styles.busCheckboxList}>
                  {availableBuses.length === 0 ? (
                    <p style={{ fontSize: '13px', color: '#9CA3AF', padding: '12px', textAlign: 'center' }}>
                      No buses available
                    </p>
                  ) : (
                    availableBuses.map((bus) => {
                      const isSelected = selectedBusIds.includes(bus.id);
                      const isAssignedToOther = bus.driverId && bus.driverId !== currentDriverId;
                      const isDisabled = !!isAssignedToOther;
                      
                      return (
                        <div key={bus.id} style={{
                          ...styles.busCheckboxItem,
                          opacity: isDisabled ? 0.5 : 1,
                        }}>
                          <input
                            type="checkbox"
                            id={`bus-${bus.id}`}
                            style={styles.busCheckbox}
                            checked={isSelected}
                            disabled={isDisabled}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedBusIds([...selectedBusIds, bus.id]);
                              } else {
                                setSelectedBusIds(selectedBusIds.filter(id => id !== bus.id));
                              }
                            }}
                          />
                          <label htmlFor={`bus-${bus.id}`} style={styles.busLabel}>
                            <strong>{bus.plateNumber}</strong> - {bus.model}
                            {isAssignedToOther && (
                              <span style={styles.busStatus}>(Assigned to another driver)</span>
                            )}
                          </label>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            <div style={styles.modalActions}>
              <button style={styles.cancelButton} onClick={closeModal}>
                Cancel
              </button>
              <button style={styles.saveButton} onClick={handleSaveDriver}>
                {editMode ? 'Update Driver' : 'Add Driver'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
