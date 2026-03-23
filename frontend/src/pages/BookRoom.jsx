import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { getRooms, getBookings, createBooking } from '../api';
import { cn } from '../utils';
import { format, parseISO } from 'date-fns';

const TIME_SLOTS = [
  '00:00', '01:00', '02:00', '03:00', '04:00', '05:00', 
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', 
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', 
  '20:00', '21:00', '22:00', '23:00'
];

export default function BookRoom() {
  const location = useLocation();
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  
  const [blockFilter, setBlockFilter] = useState('');
  const [capacityFilter, setCapacityFilter] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    reason: '',
    room_ids: [],
    date: format(new Date(), 'yyyy-MM-dd'),
    end_date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '',
    end_time: ''
  });

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [r, b] = await Promise.all([getRooms(), getBookings()]);
      setRooms(r);
      setBookings(b);
      
      const preselectedRoomId = location.state?.roomId;
      
      if (preselectedRoomId) {
        setFormData(prev => ({ ...prev, room_ids: [preselectedRoomId.toString()] }));
      } else if (r.length > 0) {
        setFormData(prev => ({ ...prev, room_ids: [r[0].id.toString()] }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const checkOverlap = () => {
    if (!formData.start_time || !formData.end_time) return false;
    const reqStart = new Date(`${formData.date}T${formData.start_time}`);
    const reqEnd = new Date(`${formData.end_date}T${formData.end_time}`);
    if (reqStart >= reqEnd) return false;
    
    const relevantBookings = bookings.filter(b => formData.room_ids.includes(b.room_id.toString()));
    for (const b of relevantBookings) {
      const bStart = new Date(`${b.date}T${b.start_time}`);
      const bEnd = new Date(`${b.end_date || b.date}T${b.end_time}`);
      if (reqStart < bEnd && bStart < reqEnd) return true;
    }
    return false;
  };

  const hasConflict = checkOverlap();

  const handleBooking = async (e) => {
    e.preventDefault();
    const reqStart = new Date(`${formData.date}T${formData.start_time}`);
    const reqEnd = new Date(`${formData.end_date}T${formData.end_time}`);

    if (reqStart >= reqEnd) {
      alert("End date/time must be strictly after start date/time.");
      return;
    }

    if (hasConflict) {
      alert("Cannot book due to conflicting existing bookings.");
      return;
    }

    try {
      await createBooking(formData);

      // Construct the custom email link
      const selectedRooms = rooms.filter(r => formData.room_ids.includes(r.id.toString())).map(r => r.name).join(', ');
      const subject = encodeURIComponent(`Room Booking Approval Request - ${formData.name}`);
      const bodyText = `Dear ${formData.name},

Your room booking request has been approved. Below are the details:

Name: ${formData.name}
Email: ${formData.email}
Reason: ${formData.reason}
Room(s): ${selectedRooms}
Date: ${formData.date} ${formData.date !== formData.end_date ? `to ${formData.end_date}` : ''}
Time: ${formData.start_time} to ${formData.end_time}


Thank you,
${formData.name}`;

      // Force Outlook on the Web (Office 365) which is commonly used by universities/schools
      const outlookLink = `https://outlook.office.com/mail/deeplink/compose?subject=${subject}&body=${encodeURIComponent(bodyText)}`;
      
      // Open Outlook Web in a new tab explicitly
      window.open(outlookLink, '_blank');

      alert("Booking confirmed! Outlook Web has been opened to send your approval request.");
      setFormData(prev => ({ ...prev, name: '', email: '', reason: '', start_time: '', end_time: '' }));
      
      // Refresh bookings
      const b = await getBookings();
      setBookings(b);
    } catch (err) {
      alert(err.response?.data?.error || "Error creating booking");
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in">
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Book a Room</h2>
        <p className="text-secondary mt-1">Select a classroom, choose available time slots, and fill in your details.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Step 1: Selection & Availability */}
        <div className="card space-y-6">
          <h3 className="text-lg font-semibold border-b pb-4">1. Select Room & Date</h3>
          
          <div className="grid grid-cols-1 gap-4">
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                <label className="label mb-0">Select Classroom(s)</label>
                <div className="flex gap-2">
                  <select 
                    className="input py-1 text-sm border-gray-200"
                    value={blockFilter}
                    onChange={(e) => setBlockFilter(e.target.value)}
                  >
                    <option value="">All Blocks</option>
                    {Array.from(new Set(rooms.map(r => r.name.charAt(0).toUpperCase()))).sort().map(b => (
                      <option key={b} value={b}>Block {b}</option>
                    ))}
                  </select>
                  <select 
                    className="input py-1 text-sm border-gray-200"
                    value={capacityFilter}
                    onChange={(e) => setCapacityFilter(e.target.value)}
                  >
                    <option value="">All Capacities</option>
                    <option value="small">Small (&lt; 50)</option>
                    <option value="medium">Medium (50 - 100)</option>
                    <option value="large">Large (&gt; 100)</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-1">
                {rooms.filter(r => {
                  if (blockFilter && !r.name.toUpperCase().startsWith(blockFilter)) return false;
                  if (capacityFilter === 'small' && r.capacity >= 50) return false;
                  if (capacityFilter === 'medium' && (r.capacity < 50 || r.capacity > 100)) return false;
                  if (capacityFilter === 'large' && r.capacity <= 100) return false;
                  return true;
                }).map(r => {
                  const isSelected = formData.room_ids.includes(r.id.toString());
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => {
                        const idStr = r.id.toString();
                        setFormData(prev => ({
                          ...prev,
                          room_ids: prev.room_ids.includes(idStr)
                            ? prev.room_ids.filter(id => id !== idStr)
                            : [...prev.room_ids, idStr],
                          start_time: '',
                          end_time: ''
                        }));
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-sm font-medium transition-all border",
                        isSelected 
                          ? "bg-primary text-white border-primary shadow-sm" 
                          : "bg-white text-gray-700 border-gray-200 hover:border-primary/50 hover:bg-primary/5"
                      )}
                    >
                      {r.name} ({r.capacity})
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Start Date</label>
                <input 
                  type="date" 
                  className="input w-full" 
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value, end_date: e.target.value, start_time: '', end_time: '' })}
                />
              </div>
              <div>
                <label className="label">End Date</label>
                <input 
                  type="date" 
                  className="input w-full" 
                  value={formData.end_date}
                  min={formData.date}
                  onChange={e => setFormData({ ...formData, end_date: e.target.value, start_time: '', end_time: '' })}
                />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Start Time</label>
                <select 
                  className="input" 
                  value={formData.start_time} 
                  onChange={e => setFormData({ ...formData, start_time: e.target.value })}
                >
                  <option value="">Select Start Time</option>
                  {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label">End Time</label>
                <select 
                  className="input" 
                  value={formData.end_time} 
                  onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                >
                  <option value="">Select End Time</option>
                  {TIME_SLOTS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {hasConflict && (
              <div className="p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg border border-red-100">
                Warning: The selected time range conflicts with an existing booking for one or more chosen rooms. Please select a different time.
              </div>
            )}
            
            {formData.start_time && formData.end_time && !hasConflict && (
              <div className="text-sm font-medium text-green-600">
                ✅ Time range available!
              </div>
            )}
          </div>
        </div>

        {/* Step 2: Details */}
        <form onSubmit={handleBooking} className="card space-y-6">
          <h3 className="text-lg font-semibold border-b pb-4">2. Your Details</h3>
          
          <div className="space-y-4">
            <div>
              <label className="label">Full Name</label>
              <input 
                required 
                type="text" 
                className="input" 
                placeholder="John Doe"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Email Address</label>
              <input 
                required 
                type="email" 
                className="input" 
                placeholder="john@example.com"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Reason for Booking</label>
              <textarea 
                required 
                className="input min-h-[100px] resize-none" 
                placeholder="Club meeting..."
                value={formData.reason}
                onChange={e => setFormData({ ...formData, reason: e.target.value })}
              />
            </div>
          </div>

          <div className="bg-gray-50 -mx-6 px-6 py-4 border-t mt-auto mb-[-1.5rem] rounded-b-2xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-secondary">Summary:</span>
              <span className="text-sm font-bold text-textMain">
                {formData.start_time && formData.end_time 
                  ? `${formData.start_time} - ${formData.end_time}` 
                  : "Select a range"}
              </span>
            </div>
            <button 
              type="submit" 
              disabled={!formData.start_time || !formData.end_time || formData.room_ids.length === 0 || hasConflict}
              className="btn-primary w-full"
            >
              Confirm Booking
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
