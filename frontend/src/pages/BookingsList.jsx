import { useState, useEffect } from 'react';
import { getBookings, deleteBooking, exportBookings, deleteAllBookings } from '../api';
import { Calendar, Clock, User, FileText, Trash2, Building2, Download, AlertTriangle } from 'lucide-react';

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

  const handleDeleteAll = async () => {
    if (!confirm('Are you ABSOLUTELY sure? This will delete ALL bookings (both active and historical) permanently. This cannot be undone.')) return;
    try {
      await deleteAllBookings();
      fetchBookings();
      alert('All bookings have been permanently deleted.');
    } catch (err) {
      alert("Error deleting all bookings");
    }
  };

  if (loading) return <div className="text-secondary p-8">Loading bookings...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">All Bookings</h2>
          <p className="text-secondary mt-1">View and manage all classroom reservations.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={exportBookings} 
            className="btn-secondary flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            <span className="hidden sm:inline">Export to Excel</span>
          </button>
          
          {bookings.length > 0 && (
            <button 
              onClick={handleDeleteAll} 
              className="bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 font-medium px-3 py-2 rounded-xl flex items-center gap-2 transition"
              title="Delete all bookings permanently"
            >
              <AlertTriangle className="w-5 h-5" />
              <span className="hidden sm:inline">Clear All</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bookings.length === 0 && (
          <div className="col-span-full py-12 text-center text-secondary border-2 border-dashed border-gray-200 rounded-2xl">
            No bookings found yet.
          </div>
        )}
        
        {bookings.map(booking => {
          const isCancelled = booking.status === 'cancelled';
          const isPast = new Date() > new Date(`${booking.end_date || booking.date}T${booking.end_time}`);
          const displayStatus = isCancelled ? 'CANCELLED' : (isPast ? 'COMPLETED' : 'ACTIVE');
          
          return (
          <div key={booking.id} className={`card group transition-colors ${isCancelled ? 'opacity-60 bg-gray-50' : (isPast ? 'bg-gray-50/50 border-gray-200' : 'hover:border-primary/20')}`}>
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 className={`w-5 h-5 ${isCancelled ? 'text-gray-400' : 'text-blue-600'}`} />
                </div>
                <div>
                  <h3 className="text-lg font-bold">{booking.room_name}</h3>
                  <div className="flex items-center text-sm text-secondary gap-1">
                    <Calendar className="w-3 h-3" />
                    <span>{booking.date}{booking.end_date && booking.end_date !== booking.date ? ` to ${booking.end_date}` : ''}</span>
                  </div>
                </div>
              </div>
              
              {displayStatus === 'ACTIVE' ? (
                <button 
                  onClick={() => handleDelete(booking.id)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100"
                  title="Cancel Booking"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              ) : (
                <span className={`px-2 py-1 text-[10px] font-bold tracking-wider rounded-md ${displayStatus === 'CANCELLED' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                  {displayStatus}
                </span>
              )}
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
        )})}
      </div>
    </div>
  );
}
