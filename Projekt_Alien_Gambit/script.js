// Skrypt strony Alien Gambit - Autor: Wojciech Kubicz
document.addEventListener('DOMContentLoaded', () => {

  // 1. Menu mobilne
  const menuBtn = document.getElementById('menu-btn');
  const navMenu = document.getElementById('nav-menu');
  if (menuBtn && navMenu) {
    menuBtn.addEventListener('click', () => navMenu.classList.toggle('open'));
  }

  // 2. Przegladarka 12 ruchow (Strona Glowna)
  const viewer = document.getElementById('move-viewer');
  if (viewer) {
    const moves = [
      { ply: '1. e4', title: '1. e4 - Otwarcie pionem królewskim', desc: 'Zajęcie centrum i otwarcie przekątnych dla gońca oraz hetmana.' },
      { ply: '1... c6', title: '1... c6 - Obrona Caro-Kann', desc: 'Czarne przygotowują uderzenie d5 za pomocą piona c6.' },
      { ply: '2. d4', title: '2. d4 - Centralizacja pionów', desc: 'Białe tworzą klasyczny duet centralny d4-e4.' },
      { ply: '2... d5', title: '2... d5 - Kontratak w centrum', desc: 'Główny plan czarnych w Caro-Kann: atak na piona e4.' },
      { ply: '3. Nd2', title: '3. Nd2 - Obrona centrum', desc: 'Białe rozwijają skoczka na d2, zabezpieczając pole e4.' },
      { ply: '3... dxe4', title: '3... dxe4 - Wymiana na e4', desc: 'Czarne zbijają piona i otwierają linie w centrum.' },
      { ply: '4. Nxe4', title: '4. Nxe4 - Centralizacja skoczka', desc: 'Białe odbijają piona, stawiając skoczka na aktywnym polu e4.' },
      { ply: '4... Nf6', title: '4... Nf6 - Rozwój skrzydła króla', desc: 'Czarne wyprowadzają skoczka i atakują figurę na e4.' },
      { ply: '5. Ng5', title: '5. Ng5 - Przeskok na pole ataku', desc: 'Białe unikają wymiany figur i biorą na cel punkt f7.' },
      { ply: '5... h6', title: '5... h6 - Odganianie skoczka', desc: 'Naturalny ruch czarnych, który otwiera drogę do poświęcenia.' },
      { ply: '6. Nxf7!', title: '6. Nxf7! - Poświęcenie skoczka', desc: 'Ofiara figury na f7. Król czarnych musi odbić lub oddać materiał.' },
      { ply: '6... Kxf7', title: '6... Kxf7 - Alien Gambit', desc: 'Król bije na f7, traci prawo do roszady i staje w otwartym polu.' }
    ];

    let idx = parseInt(localStorage.getItem('alien_move') || '0', 10);
    if (isNaN(idx) || idx < 0 || idx >= moves.length) idx = 0;
    let timer = null;

    const boardImg = document.getElementById('board-img');
    const plyEl = document.getElementById('ply-text');
    const titleEl = document.getElementById('step-title');
    const descEl = document.getElementById('step-desc');
    const countEl = document.getElementById('step-count');
    const sacTag = document.getElementById('sac-tag');
    const movesGrid = document.getElementById('moves-grid');
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const btnAuto = document.getElementById('btn-auto');
    const btnReset = document.getElementById('btn-reset');

    moves.forEach((m, i) => {
      const chip = document.createElement('div');
      chip.className = 'move-chip';
      chip.textContent = m.ply;
      chip.addEventListener('click', () => { stopAuto(); showMove(i); });
      movesGrid.appendChild(chip);
    });

    function showMove(n) {
      idx = n;
      const m = moves[n];
      boardImg.src = `assets/board${n + 1}.png`;
      plyEl.textContent = m.ply;
      titleEl.textContent = m.title;
      descEl.textContent = m.desc;
      countEl.textContent = `Ruch ${n + 1} z ${moves.length}`;
      sacTag.style.display = n >= 10 ? 'block' : 'none';

      movesGrid.querySelectorAll('.move-chip').forEach((c, i) => c.classList.toggle('active', i === n));
      btnPrev.disabled = n === 0;
      btnNext.disabled = n === moves.length - 1;
      localStorage.setItem('alien_move', n);
    }

    function stopAuto() {
      if (timer) {
        clearInterval(timer);
        timer = null;
        btnAuto.textContent = 'Autoodtwarzanie';
      }
    }

    btnPrev.addEventListener('click', () => { stopAuto(); if (idx > 0) showMove(idx - 1); });
    btnNext.addEventListener('click', () => { stopAuto(); if (idx < moves.length - 1) showMove(idx + 1); });
    btnReset.addEventListener('click', () => { stopAuto(); showMove(0); });
    btnAuto.addEventListener('click', () => {
      if (timer) return stopAuto();
      if (idx >= moves.length - 1) showMove(0);
      btnAuto.textContent = 'Pauza';
      timer = setInterval(() => (idx < moves.length - 1 ? showMove(idx + 1) : stopAuto()), 1800);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' && idx < moves.length - 1) { stopAuto(); showMove(idx + 1); }
      if (e.key === 'ArrowLeft' && idx > 0) { stopAuto(); showMove(idx - 1); }
    });

    showMove(idx);
  }

  // 3. Zegar szachowy (3:00)
  const clock = document.getElementById('chess-clock');
  if (clock) {
    let wTime = 180, bTime = 180, turn = 'white', running = false, tickId = null;
    const wEl = document.getElementById('time-white');
    const bEl = document.getElementById('time-black');
    const wBox = document.getElementById('player-white');
    const bBox = document.getElementById('player-black');
    const btnStart = document.getElementById('clock-start');
    const btnSwitch = document.getElementById('clock-switch');
    const btnReset = document.getElementById('clock-reset');

    const fmt = (s) => `${Math.floor(s / 60)}:${s % 60 < 10 ? '0' : ''}${s % 60}`;

    function drawClock() {
      wEl.textContent = fmt(wTime);
      bEl.textContent = fmt(bTime);
      wBox.classList.toggle('active', running && turn === 'white');
      bBox.classList.toggle('active', running && turn === 'black');
    }

    btnStart.addEventListener('click', () => {
      if (running) {
        clearInterval(tickId);
        running = false;
        btnStart.textContent = 'Start';
      } else {
        running = true;
        btnStart.textContent = 'Pauza';
        tickId = setInterval(() => {
          if (turn === 'white' && wTime > 0) wTime--;
          else if (turn === 'black' && bTime > 0) bTime--;
          drawClock();
        }, 1000);
      }
      drawClock();
    });

    btnSwitch.addEventListener('click', () => {
      turn = turn === 'white' ? 'black' : 'white';
      drawClock();
    });

    btnReset.addEventListener('click', () => {
      clearInterval(tickId);
      running = false;
      wTime = 180;
      bTime = 180;
      turn = 'white';
      btnStart.textContent = 'Start';
      drawClock();
    });

    drawClock();
  }

  // 4. Galeria: kopiowanie PGN i okno modalne
  const copyBtn = document.getElementById('copy-pgn');
  const pgnText = document.getElementById('pgn-text');
  if (copyBtn && pgnText) {
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(pgnText.textContent.trim()).then(() => {
        copyBtn.textContent = 'Skopiowano!';
        setTimeout(() => { copyBtn.textContent = 'Kopiuj PGN'; }, 1500);
      });
    });
  }

  const modal = document.getElementById('img-modal');
  if (modal) {
    const mImg = document.getElementById('modal-img');
    const mTitle = document.getElementById('modal-title');
    const mDesc = document.getElementById('modal-desc');

    document.querySelectorAll('.gallery-card').forEach(card => {
      card.addEventListener('click', () => {
        mImg.src = card.querySelector('img').src;
        mTitle.textContent = card.querySelector('strong').textContent;
        mDesc.textContent = card.querySelector('.card-note').textContent;
        modal.classList.add('open');
      });
    });

    document.getElementById('modal-close').addEventListener('click', () => modal.classList.remove('open'));
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('open'); });
  }

  // 5. Formularz kontaktowy: walidacja i localStorage
  const form = document.getElementById('contact-form');
  if (form) {
    const email = document.getElementById('email');
    const topic = document.getElementById('topic');
    const message = document.getElementById('message');
    const okMsg = document.getElementById('form-ok');

    try {
      const saved = JSON.parse(localStorage.getItem('alien_draft') || '{}');
      if (saved.email) email.value = saved.email;
      if (saved.topic) topic.value = saved.topic;
      if (saved.message) message.value = saved.message;
    } catch (e) {}

    const saveDraft = () => localStorage.setItem('alien_draft', JSON.stringify({
      email: email.value, topic: topic.value, message: message.value
    }));
    [email, topic, message].forEach(el => el.addEventListener('input', saveDraft));

    const mark = (el, ok) => {
      const g = el.closest('.form-group');
      g.classList.toggle('has-error', !ok);
      g.classList.toggle('is-valid', ok);
    };

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const vEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim());
      const vTopic = topic.value !== '';
      const vMsg = message.value.trim().length >= 10;

      mark(email, vEmail);
      mark(topic, vTopic);
      mark(message, vMsg);

      if (vEmail && vTopic && vMsg) {
        localStorage.removeItem('alien_draft');
        okMsg.classList.add('show');
        form.reset();
        form.querySelectorAll('.form-group').forEach(g => g.classList.remove('is-valid', 'has-error'));
      }
    });
  }

});
