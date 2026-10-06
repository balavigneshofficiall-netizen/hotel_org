const localtunnel = require('localtunnel');

let currentTunnel = null;

async function startTunnel() {
  try {
    const tunnel = await localtunnel({
      port: 3000,
      subdomain: 'annapoorna-hotel-' + Math.floor(1000 + Math.random() * 9000),
    });

    currentTunnel = tunnel;
    console.log('TUNNEL_URL:', tunnel.url);

    tunnel.on('close', () => {
      console.log('Tunnel closed. Reconnecting in 3 seconds...');
      setTimeout(startTunnel, 3000);
    });

    tunnel.on('error', (err) => {
      console.error('Tunnel error:', err.message);
      try { tunnel.close(); } catch (e) {}
      setTimeout(startTunnel, 3000);
    });
  } catch (err) {
    console.error('Failed to start tunnel:', err.message);
    setTimeout(startTunnel, 5000);
  }
}

startTunnel();
