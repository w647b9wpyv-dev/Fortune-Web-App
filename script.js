document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', (event) => {
      event.preventDefault();
      window.location.href = '/index.html';
    });
  }

  const chatForm = document.getElementById('chatForm');
  if (chatForm) {
    chatForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const input = document.getElementById('chatInput');
      const text = input.value.trim();
      if (!text) return;

      const message = document.createElement('div');
      message.className = 'message mine';
      message.innerHTML = '<div class="avatar">AM</div><div class="bubble"><span class="message-name">You</span><span class="time">now</span><div class="message-text"></div></div>';
      message.querySelector('.message-text').textContent = text;
      document.getElementById('messages').append(message);
      input.value = '';
      message.scrollIntoView({ behavior: 'smooth', block: 'end' });
    });
  }
});
