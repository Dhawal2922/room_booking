import { useState, useEffect } from 'react';
import { getBookings, deleteBooking } from '../api';
import { Calendar, Clock, User, FileText, Trash2, Building2 } from 'lucide-react';

export default function BookingsList() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      const data = await getBookings();
      // Sort bookings by date and time (newest first)
      const sorted = data.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.start_time}`);
        const dateB = new Date(`${b.date}T${b.start_time}`);
        return dateB - dateA; 
      });
      setBookings(sorted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    try {
      await deleteBooking(id);
      fetchBookings();
    } catch (err) {
      alert("Error deleting booking");
    }
  };

  if (loading) return <div className="text-secondary p-8">Loading bookings...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">All Bookings</h2>
          <p className="text-secondary mt-1">View and manage all classroom reservations.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bookings.length === 0 && (
          <div className="col-span-full py-12 text-center text-secondary border-2 border-dashed border-gray-200 rounded-2xl">
            No bookings found yet.
          </div>
        )}
        
        {bookings.map(booking => (
          <div key={booking.id} className="card group hover:border-primary/20 transition-colors">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">{booking.room_name}</h3>
                  <div className="flex items-center text-sm text-secondary gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{booking.date}</span>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => handleDelete(booking.id)}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100"
                title="Cancel Booking"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="space-y-3 pt-3 border-t border-gray-100">
              <div className="flex items-start gap-3 text-sm">
                <Clock className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">{booking.start_time} - {booking.end_time}</p>
                  <p className="text-xs text-gray-500">Time Slot</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 text-sm">
                <User className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="font-medium text-gray-900">{booking.name}</p>
                  <p className="text-xs text-gray-500">{booking.email}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 text-sm">
                <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-gray-700">{booking.reason}</p>
                  <p className="text-xs text-gray-500">Reason</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
