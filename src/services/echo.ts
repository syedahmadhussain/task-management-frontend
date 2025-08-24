import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Make Pusher available globally for Laravel Echo
(window as any).Pusher = Pusher;

// Create Echo instance for Laravel Reverb
const echo = new Echo({
  broadcaster: 'reverb',
  key: import.meta.env.VITE_REVERB_APP_KEY || 'local',
  wsHost: import.meta.env.VITE_REVERB_HOST || 'localhost',
  wsPort: import.meta.env.VITE_REVERB_PORT || 6001,
  wssPort: import.meta.env.VITE_REVERB_PORT || 6001,
  forceTLS: false,
  enabledTransports: ['ws', 'wss'],
  auth: {
    headers: {
      Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
    },
  },
  authEndpoint: `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/broadcasting/auth`,
  // Add connection configuration for better reliability
  cluster: 'local',
  encrypted: false,
});

// Connection event handlers are handled internally by Laravel Echo

export default echo;
