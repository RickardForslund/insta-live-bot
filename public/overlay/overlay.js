(function () {
  const params = new URLSearchParams(location.search);
  const debug = params.get('debug') === '1';
  const preview = params.get('preview') === '1';
  if (params.get('stage') === '1') document.documentElement.classList.add('stage');

  const card = document.getElementById('card');
  const eyebrow = document.getElementById('eyebrow');
  const username = document.getElementById('username');
  const question = document.getElementById('question');
  const answer = document.getElementById('answer');
  const debugEl = document.getElementById('debug');

  if (debug) debugEl.hidden = false;

  const labels = {
    question: 'Fråga',
    help: 'Hjälp',
    info: 'Live',
  };

  let hideTimer = 0;
  let leaveTimer = 0;
  let retryMs = 500;

  function setDebug(text) {
    if (debug) debugEl.textContent = text;
  }

  function render(payload, hideAfterMs) {
    const kind = payload.kind || 'question';
    eyebrow.textContent = labels[kind] || 'Live';
    const name = (payload.username || '').replace(/^@/, '');
    username.textContent = name ? '@' + name : '';
    question.textContent = payload.question || '';
    answer.textContent = payload.answer || '';

    card.hidden = false;
    card.classList.remove('leave');
    card.classList.remove('show');
    void card.offsetWidth;
    card.classList.add('show');

    window.clearTimeout(hideTimer);
    window.clearTimeout(leaveTimer);

    const delay = Number(hideAfterMs);
    if (delay > 0) {
      hideTimer = window.setTimeout(function () {
        card.classList.add('leave');
        leaveTimer = window.setTimeout(function () {
          card.hidden = true;
          card.classList.remove('show', 'leave');
        }, 360);
      }, delay);
    }
  }

  function remainingMs(payload) {
    const hideAfterMs = Number(payload.hideAfterMs) || 0;
    if (hideAfterMs <= 0) return 0;
    const created = Date.parse(payload.createdAt);
    if (!Number.isFinite(created)) return hideAfterMs;
    return hideAfterMs - (Date.now() - created);
  }

  function connect() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(protocol + '//' + location.host + '/ws');

    socket.addEventListener('open', function () {
      retryMs = 500;
      setDebug('ansluten');
    });

    socket.addEventListener('message', function (event) {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch {
        return;
      }
      if (!data || typeof data !== 'object') return;

      if (data.type === 'show' && data.card) {
        render(data.card, data.card.hideAfterMs);
        return;
      }
      if (data.type === 'hello' && data.card) {
        const remain = remainingMs(data.card);
        if (remain > 200) render(data.card, remain);
        return;
      }
      if (data.type === 'hide') {
        card.hidden = true;
      }
    });

    socket.addEventListener('close', function () {
      setDebug('återansluter…');
      window.setTimeout(connect, retryMs);
      retryMs = Math.min(retryMs * 2, 8000);
    });
  }

  if (preview) {
    render(
      {
        kind: 'question',
        username: 'tittare',
        question: 'Vad är huvudstaden i Sverige?',
        answer: 'Stockholm.',
      },
      0,
    );
  }

  connect();
})();
