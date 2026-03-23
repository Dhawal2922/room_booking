import { useState, useEffect, useRef } from 'react';
import { getRooms, createRoom, deleteRoom, bulkCreateRooms, deleteAllRooms } from '../api';
import { Building2, Users, Trash2, Plus, Upload, AlertTriangle } from 'lucide-react';

export default function ManageRooms() {
  const [rooms, setRooms] = useState([]);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({ name: '', capacity: '', building: '' });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const data = await getRooms();
      setRooms(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await createRoom({
        ...formData,
        capacity: parseInt(formData.capacity)
      });
      setIsAdding(false);
      setFormData({ name: '', capacity: '', building: '' });
      fetchRooms();
    } catch (err) {
      alert("Error adding room");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure? This will delete all associated bookings.')) return;
    try {
      await deleteRoom(id);
      fetchRooms();
    } catch (err) {
      alert("Error deleting room");
    }
  };

  const handleBulkUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      await bulkCreateRooms(formData);
      fetchRooms();
      alert('Rooms imported successfully!');
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to import rooms');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('Are you ABSOLUTELY sure? This will delete ALL rooms and their associated bookings permanently.')) return;
    try {
      await deleteAllRooms();
      fetchRooms();
      alert('All rooms deleted.');
    } catch (err) {
      alert("Error deleting all rooms");
    }
  };

  if (loading) return <div className="text-secondary">Loading rooms...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Classroom Management</h2>
          <p className="text-secondary mt-1 hidden sm:block">Add, view, or remove classrooms from the system.</p>
        </div>
        <div className="flex items-center gap-3">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleBulkUpload} 
            accept=".xlsx,.xls,.csv" 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={uploading}
            className="btn-secondary flex items-center gap-2"
          >
            <Upload className="w-5 h-5" />
            <span className="hidden sm:inline">{uploading ? 'Uploading...' : 'Bulk Upload'}</span>
          </button>
          
          <button 
            onClick={() => setIsAdding(!isAdding)} 
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Add Room</span>
          </button>

          {rooms.length > 0 && (
            <button 
              onClick={handleDeleteAll} 
              className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 font-medium px-3 py-2 rounded-xl flex items-center gap-2 transition"
              title="Delete all rooms"
            >
              <AlertTriangle className="w-5 h-5" />
              <span className="hidden lg:inline">Delete All</span>
            </button>
          )}
        </div>
      </div>

      {isAdding && (
        <form onSubmit={handleAdd} className="card bg-gray-50/50 border-dashed animate-in fade-in slide-in-from-top-4">
          <h3 className="text-lg font-semibold mb-4">Add New Classroom</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Room Name (e.g. 101)</label>
              <input 
                required 
                type="text"
                className="input" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                placeholder="Room Name"
              />
            </div>
            <div>
              <label className="label">Capacity</label>
              <input 
                required 
                type="number"
                min="1"
                className="input" 
                value={formData.capacity}
                onChange={e => setFormData({...formData, capacity: e.target.value})}
                placeholder="e.g. 60"
              />
            </div>
            <div>
              <label className="label">Building</label>
              <input 
                required 
                type="text"
                className="input" 
                value={formData.building}
                onChange={e => setFormData({...formData, building: e.target.value})}
                placeholder="e.g. Block A"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <button type="button" onClick={() => setIsAdding(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Save Room</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms.length === 0 && !isAdding && (
          <div className="col-span-full py-12 text-center text-secondary border-2 border-dashed border-gray-200 rounded-2xl">
            No rooms found. Click "Add Room" to create one.
          </div>
        )}
        {rooms.map(room => (
          <div key={room.id} className="card group hover:border-primary/20 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold">{room.name}</h3>
              <button 
                onClick={() => handleDelete(room.id)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100"
                title="Delete Room"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-secondary text-sm">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>Capacity: {room.capacity} students</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                <span>{room.building}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
