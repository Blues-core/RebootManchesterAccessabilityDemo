// Minimal game logic for Slice Slice Baby accessibility demo (visual update only)
(() => {
  const QUESTIONS = [
    {
      id:0,
      title: 'Find the price of a medium pepperoni pizza',
      hint: 'Check the Menu section for Medium Pepperoni.',
      answer: '£12.99',
      answerNormalized: '12.99'
    },
    {
      id:1,
      title: 'What time is the shop open',
      hint: 'Look in Contact & Opening for opening hours.',
      answer: '11:00 – 23:00',
      answerNormalized: '11:00'
    },
    {
      id:2,
      title: 'Find the contact number for the pizza shop',
      hint: 'Contact section contains the phone number.',
      answer: '01612219900',
      answerNormalized: '01612219900'
    },
    {
      id:3,
      title: 'How much is a daily special meal combo',
      hint: 'Check the Daily Special section.',
      answer: '£20.99',
      answerNormalized: '20.99'
    },
    {
      id:4,
      title: 'How many pizzas are suitable for vegans',
      hint: 'Count menu items labelled (V) or data-vegan attribute.',
      answer: '3',
      answerNormalized: '3'
    },
    {
      id:5,
      title: 'What is the name of their only dessert',
      hint: 'Check Desserts.',
      answer: 'Vanilla slice',
      answerNormalized: 'vanilla slice'
    }
  ];

  // Elements
  const startR1Btn = document.getElementById('start-round1');
  const startR2Btn = document.getElementById('start-round2');
  const round2Select = document.getElementById('round2-disability');
  const questionNav = document.getElementById('question-nav');
  const statusEl = document.getElementById('status');
  const stageTitle = document.getElementById('stage-title');
  const qTitle = document.getElementById('q-title');
  const qDesc = document.getElementById('q-desc');
  const answerForm = document.getElementById('answer-form');
  const answerInput = document.getElementById('answer');
  const submitBtn = document.getElementById('submit-answer');
  const skipBtn = document.getElementById('skip');
  const timerEl = document.getElementById('timer');
  const mockSite = document.getElementById('mock-site');
  const progressEl = document.getElementById('progress');
  const feedback = document.getElementById('feedback');

  let round = 0; // 1 baseline, 2 simulated
  let currentQ = null;
  let timer = null;
  let timeLeft = 30;
  let completed = 0;

  function normalizeAnswerText(v){
    return ('' + v).trim().toLowerCase().replace(/£/g,'').replace(/\s+/g,' ');
  }

  function startRound(r, opts = {}) {
    round = r;
    completed = 0;
    updateProgress();
    if (r === 1) {
      stageTitle.textContent = 'Round 1 — Baseline';
      statusEl.textContent = 'Baseline: no simulations applied. Let the user explore the website to find answers.';
      clearDisabilityClasses();
      goToQuestion(0);
    } else {
      const selected = opts.disability || round2Select.value;
      if (!selected) {
        alert('Please choose a disability in the dropdown for Round 2 before starting.');
        return;
      }
      stageTitle.textContent = `Round 2 — Simulation: ${round2Select.options[round2Select.selectedIndex].text}`;
      statusEl.textContent = `Round 2 with simulation: ${round2Select.options[round2Select.selectedIndex].text}. Please enable the matching filter in Funkify and then press Start on the question.`;
      clearDisabilityClasses();
      mockSite.classList.add(mapSelectToClass(selected));
      goToQuestion(0);
    }
  }

  function mapSelectToClass(val){
    const map = {
      'color':'color-blind',
      'dyslexia':'dyslexia',
      'tremor':'tremor',
      'nomouse':'nomouse',
      'blur':'blur',
      'centreloss':'centreloss'
    };
    return map[val] || '';
  }

  function clearDisabilityClasses(){
    mockSite.classList.remove('color-blind','dyslexia','tremor','nomouse','blur','centreloss');
  }

  function goToQuestion(index){
    if (index < 0 || index >= QUESTIONS.length) return;
    currentQ = QUESTIONS[index];
    qTitle.textContent = `Q${index+1}. ${currentQ.title}`;
    qDesc.textContent = currentQ.hint;
    feedback.textContent = '';
    if (answerInput) answerInput.value = '';
    if (answerInput) answerInput.focus();
    resetTimer();
    if (round === 2) {
      showPrePageForDisability(round2Select.value, () => {
        startTimer();
      });
    } else {
      startTimer();
    }
    statusEl.textContent = `Question ${index+1} active`;
    currentQ.index = index;
  }

  function showPrePageForDisability(disabilityKey, onContinue) {
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');
    overlay.style.position = 'fixed';
    overlay.style.inset = '0';
    overlay.style.background = 'linear-gradient(rgba(2,6,23,0.5), rgba(2,6,23,0.45))';
    overlay.style.display = 'flex';
    overlay.style.alignItems = 'center';
    overlay.style.justifyContent = 'center';
    overlay.style.zIndex = '9999';
    const box = document.createElement('div');
    box.style.background = '#fff';
    box.style.padding = '18px';
    box.style.borderRadius = '12px';
    box.style.maxWidth = '640px';
    box.style.boxShadow = '0 12px 40px rgba(2,6,23,0.4)';
    const h = document.createElement('h3');
    h.textContent = 'Disability simulation — instructions';
    const p = document.createElement('p');
    p.style.marginTop = '8px';
    const mapping = {
      color: 'Colour blindness (red/green). Enable the red/green simulation in Funkify. This demo will show price highlights in colours that a red/green colour-blind person cannot reliably distinguish.',
      dyslexia: 'Dyslexia: enable the dyslexia simulation in Funkify. Text may move and be harder to read. Ask the participant to read the short site text and answer the question.',
      tremor: 'Coordination tremor: enable the shaky-hand simulation in Funkify. Small CTAs are harder to click. The participant should try to add or select a small button.',
      nomouse: 'No mouse: enable keyboard-only navigation (or simulate mouse loss) in Funkify. The site intentionally removes some keyboard affordances in this round to show problems.',
      blur: 'Blurred vision: enable the blur simulation in Funkify. Text becomes fuzzy and small elements are difficult to read; consider increasing zoom if needed for participants with low vision (this demo intentionally uses smaller text for some elements).',
      centreloss: 'Centre vision loss: enable centre-vision loss simulation in Funkify. The centre of the screen will be obscured — important CTAs may be hidden under the blind spot.',
      '': 'No disability selected. Choose one from the dropdown.'
    };
    p.textContent = mapping[disabilityKey] || mapping[''];
    const note = document.createElement('p');
    note.style.fontStyle = 'italic';
    note.style.marginTop = '8px';
    note.textContent = 'Enable the matching Funkify filter now, then click Start.';
    const btns = document.createElement('div');
    btns.style.display='flex';
    btns.style.gap='10px';
    btns.style.marginTop='14px';
    const startBtn = document.createElement('button');
    startBtn.className = 'btn primary';
    startBtn.textContent = 'Start 30s';
    startBtn.onclick = () => {
      document.body.removeChild(overlay);
      onContinue && onContinue();
    };
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn outline';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.onclick = () => {
      document.body.removeChild(overlay);
    };
    btns.appendChild(startBtn);
    btns.appendChild(cancelBtn);
    box.appendChild(h);
    box.appendChild(p);
    box.appendChild(note);
    box.appendChild(btns);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    startBtn.focus();
  }

  function startTimer(){
    clearTimer();
    timeLeft = 30;
    updateTimerDisplay();
    timer = setInterval(() => {
      timeLeft--;
      updateTimerDisplay();
      if (timeLeft <= 0){
        clearTimer();
        onTimeUp();
      }
    }, 1000);
  }

  function resetTimer(){
    clearTimer();
    timeLeft = 30;
    updateTimerDisplay();
  }

  function clearTimer(){
    if (timer) { clearInterval(timer); timer = null; }
  }

  function updateTimerDisplay(){
    const mm = Math.floor(timeLeft / 60).toString().padStart(2,'0');
    const ss = (timeLeft % 60).toString().padStart(2,'0');
    timerEl.textContent = `${mm}:${ss}`;
  }

  function onTimeUp(){
    feedback.textContent = 'Time up — automatically moving to next question.';
    feedback.style.color = 'var(--danger)';
    markCompleted(false);
    setTimeout(() => {
      nextQuestion();
    }, 1200);
  }

  function checkAnswer(val) {
    const norm = normalizeAnswerText(val);
    const expected = normalizeAnswerText(currentQ.answer);
    if (currentQ.id === 1) {
      if (norm.includes('11:00') || norm.includes('11')) return true;
    }
    if (currentQ.id === 4) {
      if (norm === '3' || norm.includes('3')) return true;
    }
    return norm.includes(expected) || expected.includes(norm) || norm === currentQ.answerNormalized;
  }

  function markCompleted(correct){
    clearTimer();
    completed++;
    updateProgress();
    if (correct) {
      feedback.textContent = 'Correct ✔';
      feedback.style.color = 'var(--success)';
    } else {
      feedback.textContent = `Wrong / timed out. Answer: ${currentQ.answer}`;
      feedback.style.color = 'var(--danger)';
    }
  }

  function nextQuestion(){
    if (currentQ.index+1 < QUESTIONS.length) {
      goToQuestion(currentQ.index+1);
    } else {
      finishRun();
    }
  }

  function finishRun(){
    stageTitle.textContent = (round ===1) ? 'Round 1 complete' : 'Round 2 complete';
    statusEl.textContent = `Round ${round} finished — Completed ${completed} of ${QUESTIONS.length}`;
    feedback.textContent = '';
    clearDisabilityClasses();
  }

  // Event listeners
  startR1Btn.addEventListener('click', () => startRound(1));
  startR2Btn.addEventListener('click', () => {
    if (!round2Select.value) {
      alert('Pick one disability from the dropdown for Round 2.');
      round2Select.focus();
      return;
    }
    startRound(2, {disability: round2Select.value});
  });

  // Jump to question from nav
  questionNav.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const idx = Number(btn.dataset.q);
    goToQuestion(idx);
  });

  // Answer submit
  answerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = answerInput.value || '';
    const isCorrect = checkAnswer(val);
    markCompleted(isCorrect);
    setTimeout(() => {
      nextQuestion();
    }, 900);
  });

  skipBtn.addEventListener('click', () => {
    markCompleted(false);
    setTimeout(() => nextQuestion(), 700);
  });

  // Make nav keyboard friendly
  document.querySelectorAll('#question-nav button').forEach(b => {
    b.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        b.click();
      }
    });
  });

  // Progress updater
  function updateProgress(){
    progressEl.textContent = `${completed} / ${QUESTIONS.length}`;
  }

  // Initialize view
  (function init(){
    qTitle.textContent = 'Ready';
    qDesc.textContent = 'Press Start Round 1 to begin the baseline run.';
    updateTimerDisplay();
    updateProgress();
  })();

})();
