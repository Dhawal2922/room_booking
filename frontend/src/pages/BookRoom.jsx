import { useState, useEffect } from 'react';
import { getRooms, getBookings, createBooking } from '../api';
import { cn } from '../utils';
import { format, parseISO } from 'date-fns';

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', 
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'
];

export default function BookRoom() {
  const [rooms, setRooms] = useState([]);
  const [bookings, setBookings] = useState([]);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    reason: '',
    room_id: '',
    date: format(new Date(), 'yyyy-MM-dd'),
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
      if (r.length > 0) {
        setFormData(prev => ({ ...prev, room_id: r[0].id.toString() }));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBooking = async (e) => {
    e.preventDefault();
    if (formData.start_time >= formData.end_time) {
      alert("End time must be strictly after start time.");
      return;
    }

    try {
      await createBooking(formData);
      alert("Booking confirmed!");
      setFormData(prev => ({ ...prev, name: '', email: '', reason: '', start_time: '', end_time: '' }));
      // Refresh bookings
      const b = await getBookings();
      setBookings(b);
    } catch (err) {
      alert(err.response?.data?.error || "Error creating booking");
    }
  };

  // Filter bookings for the selected room and date
  const currentBookings = bookings.filter(
    b => b.room_id.toString() === formData.room_id && b.date === formData.date
  );

  const isSlotBooked = (time) => {
    return currentBookings.some(b => {
      return time >= b.start_time && time < b.end_time;
    });
  };

  const handleTimeSlotClick = (time) => {
    if (isSlotBooked(time)) return;

    if (!formData.start_time) {
      setFormData({ ...formData, start_time: time, end_time: '' });
    } else if (!formData.end_time) {
      if (time > formData.start_time) {
        // Find next hour to set as end time. e.g. clicking 09:00 sets span 08:00 to 10:00
        const index = TIME_SLOTS.indexOf(time);
        const endStr = index < TIME_SLOTS.length - 1 ? TIME_SLOTS[index + 1] : '21:00';
        
        // Check if there are booked slots between start and end
        const hasOverlap = currentBookings.some(b => {
           return formData.start_time < b.end_time && endStr > b.start_time;
        });

        if (hasOverlap) {
          alert('Cannot select range overlapping with existing bookings.');
          setFormData({ ...formData, start_time: time, end_time: '' });
        } else {
          setFormData({ ...formData, end_time: endStr });
        }
      } else {
        setFormData({ ...formData, start_time: time, end_time: '' });
      }
    } else {
      // Reset
      setFormData({ ...formData, start_time: time, end_time: '' });
    }
  };

  const isSlotSelected = (time) => {
    if (!formData.start_time) return false;
    if (formData.start_time === time && !formData.end_time) return true;
    if (formData.start_time && formData.end_time) {
      return time >= formData.start_time && time < formData.end_time;
    }
    return false;
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
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Classroom</label>
              <select 
                className="input"
                value={formData.room_id}
                onChange={e => setFormData({ ...formData, room_id: e.target.value, start_time: '', end_time: '' })}
              >
                {rooms.map(r => <option key={r.id} value={r.id}>{r.name} ({r.capacity})</option>)}
              </select>
            </div>
            <div>
              <label className="label">Date</label>
              <input 
                type="date" 
                className="input" 
                value={formData.date}
                onChange={e => setFormData({ ...formData, date: e.target.value, start_time: '', end_time: '' })}
              />
            </div>
          </div>

          <div className="pt-2 border-t">
            <div className="flex justify-between items-center mb-4">
              <label className="label mb-0">Select Time Slots</label>
              <div className="flex gap-4 text-xs">
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-primary/20"></span> Available
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-gray-200"></span> Booked
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full bg-primary"></span> Selected
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {TIME_SLOTS.map((time) => {
                const booked = isSlotBooked(time);
                const selected = isSlotSelected(time);
                return (
                  <button
                    key={time}
                    type="button"
                    disabled={booked}
                    onClick={() => handleTimeSlotClick(time)}
                    className={cn(
                      "py-2 rounded-xl text-sm font-medium transition-all",
                      booked ? "bg-gray-100 text-gray-400 cursor-not-allowed line-through" : 
                      selected ? "bg-primary text-white shadow-md shadow-primary/30" : 
                      "bg-primary/5 hover:bg-primary/20 text-primary hover:text-primary"
                    )}
                  >
                    {time}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-secondary mt-3">
              Click a slot to start, then click another to select a duration.
            </p>
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
              disabled={!formData.start_time || !formData.end_time}
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
