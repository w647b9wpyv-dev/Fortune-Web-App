const hasSupabaseConfig = () =>
  window.CAMPUS_SUPABASE_URL &&
  window.CAMPUS_SUPABASE_KEY &&
  !window.CAMPUS_SUPABASE_URL.startsWith('YOUR_') &&
  !window.CAMPUS_SUPABASE_KEY.startsWith('YOUR_');

const supabaseClient = hasSupabaseConfig()
  ? window.supabase.createClient(window.CAMPUS_SUPABASE_URL, window.CAMPUS_SUPABASE_KEY)
  : null;

async function signIn(provider) {
  const status = document.getElementById('authStatus');
  if (!supabaseClient) {
    if (status) status.textContent = 'Supabase is not configured yet. Add your project URL and publishable key.';
    return;
  }
  if (status) status.textContent = 'Opening sign-in...';
  const { error } = await supabaseClient.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin + '/index.html' }
  });
  if (error && status) status.textContent = error.message;
}

async function loadAuthState() {
  if (!supabaseClient) return;
  const { data } = await supabaseClient.auth.getSession();
  const user = data.session?.user;
  const loginHelp = document.querySelector('.login-help');
  if (user && loginHelp) {
    loginHelp.innerHTML = 'Signed in as <strong>' + (user.email || 'student') + '</strong>.';
  }
  const composer = document.getElementById('postComposer');
  if (composer && !user) {
    const status = document.getElementById('postStatus');
    if (status) status.textContent = 'Sign in with Google or Microsoft to create a post.';
    document.getElementById('postSubmit')?.setAttribute('disabled', '');
  }
}

async function loadPosts() {
  if (!supabaseClient) return;
  const { data, error } = await supabaseClient
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return;

  const list = document.querySelector('.post-list');
  if (!list || !data?.length) return;
  list.innerHTML = data.map(post => {
    const name = post.author_name || 'Student';
    const initials = name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase();
    const attachment = post.file_url
      ? '<a class="post-file" href="' + post.file_url + '" target="_blank" rel="noopener">📎 ' + escapeHtml(post.file_name || 'Attached file') + '</a>'
      : '';
    return '<article class="card post"><div class="poster">' + escapeHtml(initials) + '</div><div><div class="post-meta">' + escapeHtml(name) + ' · ' + formatTime(post.created_at) + '</div><h3>' + escapeHtml(post.content).replace(/\n/g, '<br>') + '</h3>' + attachment + '</div><div class="count"><b>0</b>replies</div></article>';
  }).join('');
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;'
  }[char]));
}

function formatTime(value) {
  const date = new Date(value);
  const minutes = Math.round((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return minutes + ' min ago';
  if (minutes < 1440) return Math.round(minutes / 60) + ' hr ago';
  return date.toLocaleDateString();
}

async function createPost() {
  const status = document.getElementById('postStatus');
  const content = document.getElementById('postContent')?.value.trim();
  const file = document.getElementById('postFile')?.files[0];
  if (!supabaseClient) {
    if (status) status.textContent = 'Supabase is not configured yet.';
    return;
  }
  const { data: sessionData } = await supabaseClient.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) {
    if (status) status.textContent = 'Please sign in with Google or Microsoft first.';
    return;
  }
  if (!content) {
    if (status) status.textContent = 'Write something before posting.';
    return;
  }

  let fileUrl = null;
  let fileName = null;
  if (file) {
    if (file.size > 10 * 1024 * 1024) {
      if (status) status.textContent = 'Please keep files under 10 MB.';
      return;
    }
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const path = user.id + '/' + Date.now() + '-' + safeName;
    const upload = await supabaseClient.storage.from('campus-uploads').upload(path, file);
    if (upload.error) {
      if (status) status.textContent = upload.error.message;
      return;
    }
    fileUrl = supabaseClient.storage.from('campus-uploads').getPublicUrl(path).data.publicUrl;
    fileName = file.name;
  }

  const displayName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Student';
  const { error } = await supabaseClient.from('posts').insert({
    user_id: user.id,
    author_name: displayName,
    author_email: user.email,
    content,
    file_url: fileUrl,
    file_name: fileName
  });
  if (error) {
    if (status) status.textContent = error.message;
    return;
  }
  document.getElementById('postContent').value = '';
  document.getElementById('postFile').value = '';
  if (status) status.textContent = 'Posted successfully.';
  await loadPosts();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('googleLogin')?.addEventListener('click', () => signIn('google'));
  document.getElementById('microsoftLogin')?.addEventListener('click', () => signIn('azure'));
  document.getElementById('postSubmit')?.addEventListener('click', createPost);

  const chatForm = document.getElementById('chatForm');
  if (chatForm) {
    chatForm.addEventListener('submit', async (event) => {
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

  loadAuthState();
  loadPosts();
});
