import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const login = (credentials) => api.post('/login', credentials).then(res => res.data);
export const changePassword = (data) => api.put('/admin/password', data).then(res => res.data);

export const bulkCreateRooms = (formData) => api.post('/rooms/bulk', formData, {
  headers: { 'Content-Type': 'multipart/form-data' }
}).then(res => res.data);
export const deleteAllRooms = () => api.delete('/rooms').then(res => res.data);

export const getRooms = () => api.get('/rooms').then(res => res.data);
export const createRoom = (roomData) => api.post('/rooms', roomData).then(res => res.data);
export const deleteRoom = (id) => api.delete(`/rooms/${id}`).then(res => res.data);

export const getBookings = () => api.get('/bookings').then(res => res.data);
export const createBooking = (bookingData) => api.post('/bookings', bookingData).then(res => res.data);
export const deleteBooking = (id) => api.delete(`/bookings/${id}`).then(res => res.data);
export const deleteAllBookings = () => api.delete('/bookings').then(res => res.data);

export const exportBookings = () => {
  const token = localStorage.getItem('token');
  fetch(`${API_URL}/export`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  .then(res => {
    if (res.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      window.location.href = '/login';
      return;
    }
    return res.blob();
  })
  .then(blob => {
    if (!blob) return;
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bookings.xlsx';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
  })
  .catch(err => console.error('Export failed', err));
};

export default api;
