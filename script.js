// Game logic updated: track per-question timing for both rounds, add Show phone toggle, and results overlay after Round 2
(() => {
  const DISABILITIES = ['color','dyslexia','tremor','nomouse','blur','centreloss'];

  const QUESTIONS = [
    {
      id:0,
      title: 'Find the price of a medium pepperoni pizza',
      hint: 'Check the Menu section for Medium Pepperoni.',
      answerRound1: '£12.99',
      answerRound2: '£13.49',
      display: { type: 'price', selectorMatch: 'Medium Pepperoni' }
    },
    {
      id:1,
      title: 'What time is the shop open',
      hint: 'Look in Contact & Opening for opening hours.',
      answerRound1: '11:00 – 23:00',
      answerRound2: '10:00 – 22:00',
      display: { type: 'hours', selector: '#contact' }
    },
    {
      id:2,
      title: 'Find the contact number for the pizza shop',
      hint: 'Contact section contains the phone number.',
      answerRound1: '01612219900',
      answerRound2: '01612219901',
      display: { type: 'phone', selector: '#phone' }
    },
    {
      id:3,
      title: 'How much is a daily special meal combo',
      hint: 'Check the Daily Special section.',
      answerRound1: '£20.99',
      answerRound2: '£22.49',
      display: { type: 'special-price', selector: '.special-price' }
    },
    {
      id:4,
      title: 'How many pizzas are suitable for vegans',
      hint: 'Count menu items labelled (V) or data-vegan attribute.',
      answerRound1: '3',
      answerRound2: '2',
      display: { type: 'vegan-count', selector: '.pizza-list' }
    },
    {
      id:5,
      title: 'What is the name of their only dessert',
      hint: 'Check Desserts.',
      answerRound1: 'Vanilla slice',
      answerRound2: 'Lemon tart',
      display: { type: 'dessert', selector: '#desserts .dessert' }
    }
  ];

  // Short talking points for exhibitors for each disability
  const TALKING_POINTS = {
    color: [
      'Explain colour blindness (red/green): many users cannot distinguish red and green hues.',
      'Point out the price highlight with low contrast and ask how that could be improved (labeling, icons, stronger contrast).',
      'Mention WCAG contrast guidelines and using text+symbol redundancy.'
    ],
    dyslexia: [
      'Explain dyslexia simulation: moving text makes reading paragraphs much harder.',
      'Ask attendees how comfortable they felt reading the description and whether they could quickly extract the answer.',
      'Talk about improvements: increased line-height, sans-serif fonts, clear spacing, and avoiding animations on text.'
    ],
    tremor: [
      'Explain coordination tremor: clicking small moving buttons is difficult.',
      'Highlight small CTAs — ask attendees whether they could reliably click the Add buttons.',
      'Discuss solutions: larger touch targets, spacing, and supporting keyboard activation.'
    ],
    nomouse: [
      'No mouse simulation: some users rely solely on keyboard or assistive tech.',
      'Show how removing focus outlines or pointer events breaks keyboard access.',
      'Talk about ensuring all functionality is reachable and operable via keyboard and using semantic controls.'
    ],
    blur: [
      'Blurred vision simulation: small text and low-contrast elements become unreadable.',
      'Ask attendees how they found scanning for prices or the phone number when content is blurred.',
      'Discuss solutions: larger font sizes, high contrast, and scalable responsive design.'
    ],
    centreloss: [
      'Centre vision loss: the central part of the view is obscured.',
      'Explain how CTAs placed centrally may be hidden to users with this condition.',
      'Talk about ensuring important elements aren’t solely reliant on central placement and providing multiple paths to actions.'
    ]
  };

  // Elements
  const startR1Btn = document.getElementById('start-round1');
  const startR2Btn = document.getElementById('start-round2');
  const questionNav = document.getElementById('question-nav');
  const statusEl = document.getElementById('status');
  const stageTitle = document.getElementById('stage-title');
  const qTitle = document.getElementById('q-title');
  const qDesc = document.getElementById('q-desc');
  const answerForm = document.getElementById('answer-form');
  const answerInput = document.getElementById('answer');
  const timerEl = document.getElementById('timer');
  const mockSite = document.getElementById('mock-site');
  const progressEl = document.getElementById('progress');
  const feedback = document.getElementById('feedback');
  const showPhoneBtn = document.getElementById('show-phone');
  const phoneSpan = document.getElementById('phone');

  let round = 0; // 1 baseline, 2 simulated
  let currentQ = null;
  let timer = null;
  let timeLeft = 30;
  let completed = 0;
  let questionStart = null;

  // Results storage: results[round][index] = { time: seconds, correct: bool }
  const results = { 1: Array(QUESTIONS.length).fill(null), 2: Array(QUESTIONS.length).fill(null) };

  function normalizeAnswerText(v){
    return ('' + v).trim().toLowerCase().replace(/£/g,'').replace(/\s+/g,' ');
  }

  // Apply visual/site content for a given round (1 or 2)
  function applySiteContentForRound(r){
    // Q0: Medium Pepperoni price
    const pepperoni = Array.from(document.querySelectorAll('.pizza')).find(li => {
      const nameEl = li.querySelector('.pizza-name');
      return nameEl && nameEl.textContent.includes('Medium Pepperoni');
    });
    if (pepperoni) {
      const priceEl = pepperoni.querySelector('.pizza-price');
      priceEl.textContent = (r === 1) ? '£12.99' : '£13.49';
    }

    // Q1: opening hours - find the element with class .opening
    const contact = document.querySelector('#contact');
    if (contact) {
      const openingEl = contact.querySelector('.opening');
      if (openingEl) openingEl.innerHTML = `<strong>Opening hours:</strong> ${(r === 1) ? 'Mon–Sun 11:00 – 23:00' : 'Mon–Sun 10:00 – 22:00'}`;
    }

    // Q2: phone
    const phone = document.querySelector('#phone');
    if (phone) phone.textContent = (r === 1) ? '01612219900' : '01612219901';

    // Q3: special price
    const specialPrice = document.querySelector('.special-price');
    if (specialPrice) specialPrice.textContent = (r === 1) ? '£20.99' : '£22.49';

    // Q4: vegan count — toggle data-vegan on one item to change count
    const pizzaItems = document.querySelectorAll('.pizza');
    if (pizzaItems && pizzaItems.length >= 4) {
      if (r === 1) {
        pizzaItems[0].setAttribute('data-vegan','false');
        pizzaItems[1].setAttribute('data-vegan','true');
        pizzaItems[2].setAttribute('data-vegan','true');
        pizzaItems[3].setAttribute('data-vegan','true');
        setVLabel(pizzaItems[1], true);
        setVLabel(pizzaItems[2], true);
        setVLabel(pizzaItems[3], true);
      } else {
        pizzaItems[0].setAttribute('data-vegan','false');
        pizzaItems[1].setAttribute('data-vegan','true');
        pizzaItems[2].setAttribute('data-vegan','false');
        pizzaItems[3].setAttribute('data-vegan','true');
        setVLabel(pizzaItems[1], true);
        setVLabel(pizzaItems[2], false);
        setVLabel(pizzaItems[3], true);
      }
    }

    // Q5: dessert
    const dessert = document.querySelector('#desserts .dessert');
    if (dessert) dessert.textContent = (r === 1) ? 'Vanilla slice' : 'Lemon tart';
  }

  function setVLabel(li, isV) {
    const nameEl = li.querySelector('.pizza-name');
    if (!nameEl) return;
    nameEl.textContent = nameEl.textContent.replace(/\(V\)/g,'').trim();
    if (isV) nameEl.textContent = `${nameEl.textContent} (V)`;
  }

  function startRound(r) {
    round = r;
    completed = 0;
    updateProgress();
    applySiteContentForRound(r);
    if (r === 1) {
      stageTitle.textContent = 'Round 1 — Baseline';
      statusEl.textContent = 'Baseline: no simulations applied. Let the user explore the website to find answers.';
      clearDisabilityClasses();
      goToQuestion(0);
    } else {
      stageTitle.textContent = 'Round 2 — Simulated disabilities (one per question)';
      statusEl.textContent = 'Round 2 will cycle through disabilities: one per question. Enable the matching Funkify filter when prompted.';
      clearDisabilityClasses();
      goToQuestion(0);
    }
  }

  function mapIndexToDisability(idx){
    return DISABILITIES[idx % DISABILITIES.length];
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
      const disabilityKey = mapIndexToDisability(index);
      clearDisabilityClasses();
      showPrePageForDisability(disabilityKey, () => {
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
      centreloss: 'Centre vision loss: enable centre-vision loss simulation in Funkify. The centre of the screen will be obscured — important CTAs may be hidden under the blind spot.'
    };
    p.textContent = mapping[disabilityKey] || '';

    const note = document.createElement('p');
    note.style.fontStyle = 'italic';
    note.style.marginTop = '8px';
    note.textContent = 'Enable the matching Funkify filter now, then click Start.';

    // Talking points section (for exhibitors)
    const tpHeader = document.createElement('h4');
    tpHeader.textContent = 'Talking points (for exhibitors)';
    tpHeader.style.marginTop = '12px';
    const tpList = document.createElement('ul');
    tpList.style.marginTop = '6px';
    tpList.style.paddingLeft = '20px';
    const points = TALKING_POINTS[disabilityKey] || [];
    points.forEach(pt => {
      const li = document.createElement('li');
      li.textContent = pt;
      tpList.appendChild(li);
    });

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
    if (points.length) {
      box.appendChild(tpHeader);
      box.appendChild(tpList);
    }
    box.appendChild(btns);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
    startBtn.focus();
  }

  function startTimer(){
    clearTimer();
    timeLeft = 30;
    questionStart = Date.now();
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
    questionStart = null;
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

  function recordResult(correct){
    if (!currentQ) return;
    const idx = currentQ.index;
    const r = round;
    let elapsed = 0;
    if (questionStart) {
      elapsed = Math.round((Date.now() - questionStart) / 1000);
      if (elapsed > 30) elapsed = 30;
    } else {
      // fallback to 30 - timeLeft
      elapsed = 30 - timeLeft;
    }
    results[r][idx] = { time: elapsed, correct: !!correct };
  }

  function onTimeUp(){
    feedback.textContent = 'Time up — automatically moving to next question.';
    feedback.style.color = 'var(--danger)';
    recordResult(false);
    markCompleted(false, {record:false});
    setTimeout(() => {
      nextQuestion();
    }, 1200);
  }

  function checkAnswer(val) {
    const norm = normalizeAnswerText(val);
    const expected = (round === 1) ? normalizeAnswerText(currentQ.answerRound1) : normalizeAnswerText(currentQ.answerRound2);

    // For opening hours accept hour portion
    if (currentQ.id === 1) {
      if (norm.includes('11:00') || norm.includes('10:00') || norm.includes('11') || norm.includes('10')) return true;
    }
    if (currentQ.id === 4) {
      // numeric match
      if (norm === normalizeAnswerText(currentQ.answerRound1) || norm === normalizeAnswerText(currentQ.answerRound2)) return true;
    }
    return norm.includes(expected) || expected.includes(norm) || norm === expected;
  }

  function markCompleted(correct, opts = {record:true}){
    clearTimer();
    if (opts.record) recordResult(correct);
    completed++;
    updateProgress();
    if (correct) {
      feedback.textContent = 'Correct ✔';
      feedback.style.color = 'var(--success)';
    } else {
      const ans = (round === 1) ? currentQ.answerRound1 : currentQ.answerRound2;
      feedback.textContent = `Wrong / timed out. Answer: ${ans}`;
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

    if (round === 2) {
      // Show results comparison overlay
      showResultsOverlay();
    }
  }

  function showResultsOverlay(){
    // Build a comparison table between round1 and round2
    const overlay = document.createElement('div');
    overlay.className = 'results-overlay';
    overlay.setAttribute('role','dialog');
    overlay.setAttribute('aria-modal','true');

    const card = document.createElement('div');
    card.className = 'results-card';

    const h = document.createElement('h2');
    h.textContent = 'Results — Round 1 vs Round 2';
    card.appendChild(h);

    const summary = document.createElement('p');
    const total1 = results[1].reduce((s,r)=> s + (r && r.time? r.time:0), 0);
    const total2 = results[2].reduce((s,r)=> s + (r && r.time? r.time:0), 0);
    summary.textContent = `Total time Round 1: ${total1}s — Round 2: ${total2}s`;
    card.appendChild(summary);

    const table = document.createElement('table');
    table.className = 'results-table';
    const thead = document.createElement('thead');
    thead.innerHTML = '<tr><th>Q#</th><th>Question</th><th>Round 1 (s)</th><th>Round 2 (s)</th><th>Diff (s)</th><th>R1 correct</th><th>R2 correct</th></tr>';
    table.appendChild(thead);
    const tbody = document.createElement('tbody');
    QUESTIONS.forEach((q, idx) => {
      const r1 = results[1][idx];
      const r2 = results[2][idx];
      const t1 = r1 && r1.time != null ? r1.time : '-';
      const t2 = r2 && r2.time != null ? r2.time : '-';
      const diff = (t1 !== '-' && t2 !== '-') ? (t2 - t1) : '-';
      const r1c = r1 && typeof r1.correct === 'boolean' ? (r1.correct ? '✔' : '✖') : '-';
      const r2c = r2 && typeof r2.correct === 'boolean' ? (r2.correct ? '✔' : '✖') : '-';
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${idx+1}</td><td>${q.title}</td><td>${t1}</td><td>${t2}</td><td>${diff}</td><td>${r1c}</td><td>${r2c}</td>`;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    card.appendChild(table);

    const btnRow = document.createElement('div');
    btnRow.style.marginTop = '12px';
    btnRow.style.display = 'flex';
    btnRow.style.gap = '10px';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn primary';
    closeBtn.textContent = 'Close';
    closeBtn.onclick = () => document.body.removeChild(overlay);

    const downloadBtn = document.createElement('button');
    downloadBtn.className = 'btn outline';
    downloadBtn.textContent = 'Download CSV';
    downloadBtn.onclick = () => {
      downloadCSV();
    };

    btnRow.appendChild(closeBtn);
    btnRow.appendChild(downloadBtn);
    card.appendChild(btnRow);

    overlay.appendChild(card);
    document.body.appendChild(overlay);
    closeBtn.focus();
  }

  function downloadCSV(){
    const rows = [['q','question','round1_time','round2_time','round1_correct','round2_correct']];
    QUESTIONS.forEach((q, idx) => {
      const r1 = results[1][idx] || {};
      const r2 = results[2][idx] || {};
      rows.push([idx+1, q.title, r1.time != null ? r1.time : '', r2.time != null ? r2.time : '', r1.correct != null ? r1.correct : '', r2.correct != null ? r2.correct : '']);
    });
    const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g,'""') + '"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'slice-slice-baby-results.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function recordResult(correct){
    if (!currentQ) return;
    const idx = currentQ.index;
    const r = round;
    let elapsed = 0;
    if (questionStart) {
      elapsed = Math.round((Date.now() - questionStart) / 1000);
      if (elapsed > 30) elapsed = 30;
    } else {
      elapsed = 30 - timeLeft;
    }
    results[r][idx] = { time: elapsed, correct: !!correct };
  }

  function markCompleted(correct, opts = {record:true}){
    clearTimer();
    if (opts.record) recordResult(correct);
    completed++;
    updateProgress();
    if (correct) {
      feedback.textContent = 'Correct ✔';
      feedback.style.color = 'var(--success)';
    } else {
      const ans = (round === 1) ? currentQ.answerRound1 : currentQ.answerRound2;
      feedback.textContent = `Wrong / timed out. Answer: ${ans}`;
      feedback.style.color = 'var(--danger)';
    }
  }

  // Event listeners
  startR1Btn.addEventListener('click', () => startRound(1));
  startR2Btn.addEventListener('click', () => startRound(2));

  // Show phone toggle
  if (showPhoneBtn && phoneSpan) {
    showPhoneBtn.addEventListener('click', () => {
      const revealed = phoneSpan.classList.toggle('phone-visible');
      showPhoneBtn.setAttribute('aria-expanded', revealed ? 'true' : 'false');
      showPhoneBtn.textContent = revealed ? 'Hide phone' : 'Show phone';
    });
  }

  // Jump to question from nav
  questionNav.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const idx = Number(btn.dataset.q);
    goToQuestion(idx);
  });

  // Answer submit - prevent blank submissions
  answerForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = (answerInput && answerInput.value) ? answerInput.value.trim() : '';
    if (val === '') {
      feedback.textContent = 'Please enter an answer before submitting.';
      feedback.style.color = 'var(--danger)';
      if (answerInput) answerInput.focus();
      return;
    }
    const isCorrect = checkAnswer(val);
    markCompleted(isCorrect);
    setTimeout(() => {
      nextQuestion();
    }, 900);
  });

  // Skip button
  const skipBtn = document.getElementById('skip');
  skipBtn.addEventListener('click', () => {
    recordResult(false);
    markCompleted(false, {record:false});
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

  function updateProgress(){
    progressEl.textContent = `${completed} / ${QUESTIONS.length}`;
  }

  (function init(){
    qTitle.textContent = 'Ready';
    qDesc.textContent = 'Press Start Round 1 to begin the baseline run.';
    updateTimerDisplay();
    updateProgress();
    // ensure baseline content is applied
    applySiteContentForRound(1);
  })();

})();
