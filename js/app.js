/*
 * LÓGICA DEL JUEGO
 * ----------------
 * Carga las fuentes definidas en config.js, arma el mazo, y controla
 * las pantallas (configuración, turnos, partida, resultados).
 * No necesitas tocar este archivo para añadir listas nuevas: eso se
 * hace en config.js. Este archivo sí se toca si quieres cambiar reglas
 * del juego (duración, puntuación, etc.).
 */
(function(){

  let DECK = {};
  let CATEGORIES = [];
  let loadedSourceSummary = [];

  function normalizeSourceData(label, data){
    const map = {};
    if(Array.isArray(data)){
      map[label] = data.filter(x => typeof x === 'string' && x.trim() !== '');
    } else if(data && typeof data === 'object'){
      Object.keys(data).forEach(key=>{
        if(Array.isArray(data[key])){
          map[key] = data[key].filter(x => typeof x === 'string' && x.trim() !== '');
        }
      });
    }
    return map;
  }

  async function fetchSource(source){
    const res = await fetch(source.url, { cache: 'no-store' });
    if(!res.ok) throw new Error('HTTP ' + res.status + ' al leer ' + source.url);
    const data = await res.json();
    return { label: source.label, map: normalizeSourceData(source.label, data) };
  }

  function mergeDecks(results){
    const merged = {};
    results.forEach(({map})=>{
      Object.keys(map).forEach(cat=>{
        if(!merged[cat]) merged[cat] = [];
        merged[cat].push(...map[cat]);
      });
    });
    Object.keys(merged).forEach(cat=>{
      merged[cat] = Array.from(new Set(merged[cat]));
    });
    return merged;
  }

  function applyDeck(results){
    DECK = mergeDecks(results);
    CATEGORIES = Object.keys(DECK).filter(cat => DECK[cat].length > 0);
    if(CATEGORIES.length === 0){
      throw new Error('Las listas cargadas no contienen ninguna tarjeta válida.');
    }
    loadedSourceSummary = results.map(({label, map}) => {
      const count = Object.values(map).reduce((sum, arr) => sum + arr.length, 0);
      return label + ' (' + count + ')';
    });
    onDataReady();
  }

  async function loadAllSources(){
    showScreen('loading-screen');
    try{
      const results = await Promise.all(SOURCES.map(fetchSource));
      applyDeck(results);
    } catch(err){
      showError(err);
    }
  }

  function showError(err){
    const isFileProtocol = window.location.protocol === 'file:';
    const detailEl = document.getElementById('error-detail');
    if(isFileProtocol){
      detailEl.textContent =
        'Has abierto el archivo directamente desde tu ordenador (protocolo "file://"), y por seguridad los navegadores bloquean la lectura de otros archivos JSON en ese modo. No es un error de la página: usa el selector de abajo para cargar timesup.json a mano, o sirve la carpeta con un servidor local para que la carga automática funcione.';
    } else {
      detailEl.textContent =
        (err && err.message) ? err.message : 'Error desconocido al leer el JSON.';
    }
    showScreen('error-screen');
  }

  function onDataReady(){
    state.activeCategories = new Set(CATEGORIES);
    renderCategoryChips();
    document.getElementById('source-info').textContent =
      'Fuente cargada: ' + loadedSourceSummary.join(', ') + '. Selecciona al menos una categoría.';
    showScreen('setup-screen');
  }

  function renderCategoryChips(){
    const chipContainer = document.getElementById('category-chips');
    chipContainer.innerHTML = '';
    CATEGORIES.forEach(cat=>{
      const chip = document.createElement('div');
      chip.className = 'chip active';
      chip.textContent = cat + ' · ' + DECK[cat].length;
      chip.dataset.cat = cat;
      chip.addEventListener('click', ()=>{
        if(state.activeCategories.has(cat)){
          if(state.activeCategories.size === 1) return; // al menos una categoría activa
          state.activeCategories.delete(cat);
          chip.classList.remove('active');
        } else {
          state.activeCategories.add(cat);
          chip.classList.add('active');
        }
      });
      chipContainer.appendChild(chip);
    });
  }

  function showScreen(id){
    ['loading-screen','error-screen','setup-screen'].forEach(sid=>{
      document.getElementById(sid).style.display = (sid === id) ? 'block' : 'none';
    });
  }

  document.getElementById('retry-load-btn').addEventListener('click', loadAllSources);
  document.getElementById('reload-sources-btn').addEventListener('click', loadAllSources);

  document.getElementById('manual-json-input').addEventListener('change', (e)=>{
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ()=>{
      try{
        const data = JSON.parse(reader.result);
        applyDeck([{ label: file.name.replace(/\.json$/i, ''), map: normalizeSourceData(file.name.replace(/\.json$/i, ''), data) }]);
      } catch(err){
        showError(new Error('El archivo seleccionado no es un JSON válido.'));
      }
    };
    reader.onerror = ()=> showError(new Error('No se ha podido leer el archivo seleccionado.'));
    reader.readAsText(file);
  });

  // ---------------- STATE ----------------
  let state = {
    activeCategories: new Set(),
    turnSeconds: 60,
    teams: [],
    scores: [],
    currentTeamIdx: 0,
    fullDeck: [],
    remainingDeck: [],
    turnQueue: [],
    turnCorrect: [],
    turnPassed: [],
    turnScore: 0,
    timerId: null,
    timeLeft: 60
  };

  // ---------------- SETUP SCREEN ----------------
  // (Los chips de categoría se generan dinámicamente en renderCategoryChips()
  // una vez cargadas las fuentes de datos — ver más arriba.)

  document.querySelectorAll('#duration-seg button').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('#duration-seg button').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      state.turnSeconds = parseInt(btn.dataset.secs, 10);
    });
  });

  const teamInputsEl = document.getElementById('team-inputs');
  const defaultTeamNames = ['Equipo 1','Equipo 2'];

  function renderTeamInputs(){
    teamInputsEl.innerHTML = '';
    defaultTeamNames.forEach((name, i)=>{
      const row = document.createElement('div');
      row.className = 'team-row';
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = name;
      input.maxLength = 24;
      input.dataset.idx = i;
      row.appendChild(input);
      if(defaultTeamNames.length > 2){
        const rm = document.createElement('button');
        rm.className = 'remove';
        rm.textContent = '×';
        rm.addEventListener('click', ()=>{
          defaultTeamNames.splice(i,1);
          renderTeamInputs();
        });
        row.appendChild(rm);
      }
      teamInputsEl.appendChild(row);
    });
  }
  renderTeamInputs();

  document.getElementById('add-team-btn').addEventListener('click', ()=>{
    if(defaultTeamNames.length >= 8) return;
    defaultTeamNames.push('Equipo ' + (defaultTeamNames.length + 1));
    renderTeamInputs();
  });

  const setupError = document.getElementById('setup-error');

  document.getElementById('start-game-btn').addEventListener('click', ()=>{
    const names = Array.from(teamInputsEl.querySelectorAll('input')).map((inp, i)=>{
      return (inp.value.trim() || inp.placeholder);
    });
    const uniqueNames = new Set(names.map(n=>n.toLowerCase()));
    if(uniqueNames.size !== names.length){
      setupError.textContent = 'Cada equipo necesita un nombre distinto.';
      return;
    }
    if(state.activeCategories.size === 0){
      setupError.textContent = 'Selecciona al menos una categoría.';
      return;
    }
    setupError.textContent = '';
    state.teams = names;
    state.scores = names.map(()=>0);
    state.currentTeamIdx = 0;

    let pool = [];
    state.activeCategories.forEach(cat=>{
      DECK[cat].forEach(text=> pool.push({text, cat}));
    });
    state.fullDeck = shuffle(pool);
    state.remainingDeck = state.fullDeck.slice();

    document.getElementById('setup-screen').style.display = 'none';
    document.getElementById('scoreboard').style.display = 'flex';
    renderScoreboard();
    startTurnIntro();
  });

  function shuffle(arr){
    const a = arr.slice();
    for(let i = a.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i+1));
      [a[i],a[j]] = [a[j],a[i]];
    }
    return a;
  }

  // ---------------- SCOREBOARD ----------------
  function renderScoreboard(){
    const el = document.getElementById('scoreboard');
    el.innerHTML = '';
    state.teams.forEach((name, i)=>{
      const pill = document.createElement('div');
      pill.className = 'score-pill' + (i === state.currentTeamIdx ? ' current' : '');
      pill.innerHTML = name + ' · <b>' + state.scores[i] + '</b>';
      el.appendChild(pill);
    });
  }

  // ---------------- TURN INTRO ----------------
  function startTurnIntro(){
    hideAllScreens();
    const teamName = state.teams[state.currentTeamIdx];
    document.getElementById('intro-team-name').textContent = teamName;
    document.getElementById('cards-left-note').textContent =
      state.remainingDeck.length + ' tarjeta' + (state.remainingDeck.length===1?'':'s') + ' quedan en el mazo';
    document.getElementById('turn-intro').style.display = 'block';
    renderScoreboard();
  }

  document.getElementById('begin-turn-btn').addEventListener('click', beginTurn);

  function beginTurn(){
    if(state.remainingDeck.length === 0){
      endGame();
      return;
    }
    hideAllScreens();
    document.getElementById('game-screen').style.display = 'block';
    document.getElementById('current-team-label').textContent = state.teams[state.currentTeamIdx];
    state.turnQueue = shuffle(state.remainingDeck);
    state.turnCorrect = [];
    state.turnPassed = [];
    state.turnScore = 0;
    document.getElementById('turn-score').textContent = '0';
    state.timeLeft = state.turnSeconds;
    updateTimerDisplay();
    showNextCard();
    state.timerId = setInterval(tick, 1000);
  }

  function tick(){
    state.timeLeft--;
    updateTimerDisplay();
    if(state.timeLeft <= 0){
      clearInterval(state.timerId);
      finishTurn();
    }
  }

  function updateTimerDisplay(){
    document.getElementById('time-num').textContent = state.timeLeft;
    const pct = Math.max(0, (state.timeLeft / state.turnSeconds) * 100);
    const fill = document.getElementById('timer-fill');
    fill.style.width = pct + '%';
    if(pct < 25){
      fill.style.background = 'linear-gradient(90deg, var(--pass-dark), var(--pass))';
    } else if(pct < 55){
      fill.style.background = 'linear-gradient(90deg, var(--gold-dark), var(--gold))';
    } else {
      fill.style.background = 'linear-gradient(90deg, var(--correct), var(--gold))';
    }
  }

  function showNextCard(){
    if(state.turnQueue.length === 0){
      // Se han agotado las tarjetas de este turno dentro del tiempo: recicla las pasadas
      if(state.turnPassed.length > 0){
        state.turnQueue = shuffle(state.turnPassed);
        state.turnPassed = [];
      } else {
        clearInterval(state.timerId);
        finishTurn();
        return;
      }
    }
    const card = state.turnQueue[0];
    document.getElementById('active-card-cat').textContent = card.cat;
    document.getElementById('active-card-text').textContent = card.text;
    document.getElementById('active-card-count').textContent =
      (state.turnCorrect.length + state.turnQueue.length) + ' restantes';
    const cardEl = document.getElementById('active-card');
    cardEl.classList.remove('leaving-left','leaving-right');
  }

  function resolveCard(isCorrect){
    if(state.turnQueue.length === 0) return;
    const card = state.turnQueue.shift();
    const cardEl = document.getElementById('active-card');
    cardEl.classList.add(isCorrect ? 'leaving-right' : 'leaving-left');

    if(isCorrect){
      state.turnCorrect.push(card);
      state.turnScore++;
      document.getElementById('turn-score').textContent = state.turnScore;
      // se elimina definitivamente del mazo global
      state.remainingDeck = state.remainingDeck.filter(c => c !== card);
    } else {
      state.turnPassed.push(card);
    }

    setTimeout(()=>{
      if(state.timeLeft > 0) showNextCard();
    }, 160);
  }

  document.getElementById('correct-btn').addEventListener('click', ()=> resolveCard(true));
  document.getElementById('pass-btn').addEventListener('click', ()=> resolveCard(false));

  // Atajos de teclado: flecha derecha = acierto, izquierda = paso
  document.addEventListener('keydown', (e)=>{
    if(document.getElementById('game-screen').style.display !== 'block') return;
    if(e.key === 'ArrowRight'){ resolveCard(true); }
    if(e.key === 'ArrowLeft'){ resolveCard(false); }
  });

  function finishTurn(){
    hideAllScreens();
    state.scores[state.currentTeamIdx] += state.turnScore;
    document.getElementById('turn-end-score').textContent = state.turnScore;
    document.getElementById('turn-end-team').textContent = state.teams[state.currentTeamIdx];

    const recap = document.getElementById('turn-end-recap');
    recap.innerHTML = '';
    if(state.turnCorrect.length === 0 && state.turnPassed.length === 0){
      recap.innerHTML = '<div>No hubo tiempo para ninguna tarjeta.</div>';
    } else {
      state.turnCorrect.forEach(c=>{
        const row = document.createElement('div');
        row.innerHTML = '<span class="ok">✓ ' + c.text + '</span><span>' + c.cat + '</span>';
        recap.appendChild(row);
      });
      state.turnPassed.forEach(c=>{
        const row = document.createElement('div');
        row.innerHTML = '<span class="skip">⟲ ' + c.text + '</span><span>' + c.cat + '</span>';
        recap.appendChild(row);
      });
    }
    document.getElementById('turn-end').style.display = 'block';
    renderScoreboard();
  }

  document.getElementById('next-turn-btn').addEventListener('click', ()=>{
    if(state.remainingDeck.length === 0){
      endGame();
      return;
    }
    state.currentTeamIdx = (state.currentTeamIdx + 1) % state.teams.length;
    startTurnIntro();
  });

  function endGame(){
    hideAllScreens();
    const maxScore = Math.max(...state.scores);
    const winners = state.teams.filter((t,i)=> state.scores[i] === maxScore);
    document.getElementById('winner-name').textContent = winners.join(' y ');

    const order = state.teams.map((name,i)=>({name, score: state.scores[i]}))
      .sort((a,b)=> b.score - a.score);
    const standings = document.getElementById('final-standings');
    standings.innerHTML = '';
    order.forEach(t=>{
      const row = document.createElement('div');
      row.className = 'row' + (t.score === maxScore ? ' win' : '');
      row.innerHTML = '<span>' + t.name + '</span><b>' + t.score + '</b>';
      standings.appendChild(row);
    });
    document.getElementById('game-over').style.display = 'block';
  }

  document.getElementById('play-again-btn').addEventListener('click', ()=>{
    location.reload();
  });

  function hideAllScreens(){
    ['loading-screen','error-screen','setup-screen','turn-intro','game-screen','turn-end','game-over'].forEach(id=>{
      document.getElementById(id).style.display = 'none';
    });
  }

  // ---------------- ARRANQUE ----------------
  loadAllSources();

})();
