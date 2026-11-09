'use strict';

/* =================== УТИЛИТЫ =================== */
const $ = id => document.getElementById(id);
const rnd = n => Math.floor(Math.random() * n);
const pick = a => a[rnd(a.length)];
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=rnd(i+1); [a[i],a[j]]=[a[j],a[i]]; } return a; }

/* =================== СОСТОЯНИЕ =================== */
const SAVE_KEY = 'arina_save_v3';
const defaultState = {
  version:3,
  chapter:1, coins:0, crystals:0, care:0,
  level:1, exp:0,
  maxEnergy:10, energy:10, energyRegenMin:10, lastEnergyTs:0,
  coinMult:1, luck:0,
  theme:'light', themeAuto:true, unlockedThemes:['light','dark'],
  lastPlayed:null, streak:0, bestStreak:0,
  dailyTasks:[], dailyDay:0, giftDay:0, giftDate:null,
  achievements:[],
  storyPath:null, finaleChoice:null, storyDone:false,
  boosters:{x2until:0, skips:0},
  urgent:{next:0, end:0},
  referral:{code:'', used:false},
  encyclopediaRead:[], careUnlocks:[], scores:[],
  secrets:{}, taps:{coins:0, shadow:0, cat:0, welcome:0},
  name:'Игрок',
  lastRestTs:0,
  stats:{games:0, bugs:0, heals:0, earned:0, bossWins:0, urgentDone:0, recipesOk:0}
};
function deepMerge(base, patch){
  const out = Array.isArray(base) ? patch : Object.assign({}, base);
  for(const k in patch){
    const v = patch[k];
    if(v && typeof v === 'object' && !Array.isArray(v) && base[k] && typeof base[k] === 'object' && !Array.isArray(base[k])){
      out[k] = deepMerge(base[k], v);
    } else out[k] = v;
  }
  return out;
}
let state = (()=>{
  try{
    const raw = localStorage.getItem(SAVE_KEY);
    if(raw) return deepMerge(JSON.parse(JSON.stringify(defaultState)), JSON.parse(raw));
  }catch(e){}
  return JSON.parse(JSON.stringify(defaultState));
})();
function saveGame(){ try{ localStorage.setItem(SAVE_KEY, JSON.stringify(state)); }catch(e){} }

/* =================== ЭНЕРГИЯ =================== */
function regenEnergy(){
  const now = Date.now();
  if(!state.lastEnergyTs){ state.lastEnergyTs = now; saveGame(); return; }
  if(state.energy >= state.maxEnergy){ state.lastEnergyTs = now; return; }
  const per = state.energyRegenMin * 60000;
  const gained = Math.floor((now - state.lastEnergyTs) / per);
  if(gained > 0){
    state.energy = Math.min(state.maxEnergy, state.energy + gained);
    state.lastEnergyTs = now;
    if($('screen-menu').classList.contains('active')) updateUI();
  }
}
setInterval(regenEnergy, 20000);

/* Исправление: единая функция траты энергии — сбрасывает таймер регена,
   если энергия была полной, иначе реген «дарил» бы энергию с прошлого раза */
function spendEnergy(n){
  n = n || 1;
  if(state.energy >= state.maxEnergy) state.lastEnergyTs = Date.now();
  state.energy = Math.max(0, state.energy - n);
}

/* =================== ТЕМЫ =================== */
const THEMES = [
  {id:'light',   label:'🌸 День'},
  {id:'morning', label:'🌅 Утро'},
  {id:'night',   label:'🌙 Ночь'},
  {id:'dark',    label:'🌌 Глубокая ночь'},
  {id:'caramel', label:'🍬 Карамелька'},
  {id:'gold',    label:'👑 Золото'}
];
function storyTheme(){
  if(state.chapter <= 5) return 'morning';
  if(state.chapter <= 15) return 'light';
  if(state.chapter <= 30) return 'night';
  return 'dark';
}
function applyTheme(){
  let t = state.themeAuto ? storyTheme() : state.theme;
  if(!state.themeAuto && !state.unlockedThemes.includes(t)) t = 'light';
  document.body.className = 'theme-' + t;
  $('game-container').classList.toggle('bg-garden', state.careUnlocks.includes('bg_garden'));
}

/* =================== НАВИГАЦИЯ =================== */
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $(id).classList.add('active');
  if(id === 'screen-dialog') initParallax();
  if(id === 'screen-cabinet') renderCabinet();
  if(id === 'screen-daily') renderDailyTasks();
  if(id === 'screen-achievements') renderAchievements();
  if(id === 'screen-encyclopedia') renderEncyclopedia();
  if(id === 'screen-rewards') renderCareRewards();
  if(id === 'screen-records') renderRecords();
  if(id === 'screen-friends') initRef();
  if(id === 'screen-settings') renderThemes();
  if(id === 'screen-stats') renderSecrets();
  updateUI();
}
function goToMenu(){ showScreen('screen-menu'); }
function showMinigames(){ showScreen('screen-minigames'); renderFreePlay(); }
function openShop(){ showScreen('screen-shop'); setShopTab('up'); }

/* =================== ЭФФЕКТЫ =================== */
function toast(msg, icon){
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = (icon ? icon + ' ' : '') + msg;
  $('toast-layer').appendChild(t);
  setTimeout(()=>t.classList.add('show'), 50);
  setTimeout(()=>t.remove(), 2600);
}
function confetti(count){
  count = count || 26;
  if(state.careUnlocks.includes('bell')) count += 12;
  const emojis = ['💊','🩹','🌸','⭐','❤️','🎉'];
  for(let i=0;i<count;i++){
    const p = document.createElement('span');
    p.className = 'fx-particle';
    p.textContent = pick(emojis);
    p.style.left = (Math.random()*94+2) + '%';
    p.style.animationDelay = (Math.random()*0.6) + 's';
    $('fx-layer').appendChild(p);
    setTimeout(()=>p.remove(), 3200);
  }
}
function dustBurst(){
  for(let i=0;i<10;i++){
    const p = document.createElement('span');
    p.className = 'fx-dust';
    p.textContent = pick(['💨','🌫️','💜']);
    p.style.left = (Math.random()*80+10) + '%';
    p.style.top = (Math.random()*40+30) + '%';
    $('fx-layer').appendChild(p);
    setTimeout(()=>p.remove(), 1800);
  }
}
function showModal(title, bodyHtml, quote){
  $('modal-layer').innerHTML =
    '<div class="modal-card"><h3>' + title + '</h3>' +
    (quote ? '<div class="modal-quote">' + quote + '</div>' : '') +
    '<p>' + bodyHtml + '</p><button class="main-btn small" onclick="closeModal()">Понятно!</button></div>';
  $('modal-layer').classList.add('open');
}
function closeModal(){ $('modal-layer').classList.remove('open'); $('modal-layer').innerHTML = ''; }

/* =================== НАГРАДЫ И ОПЫТ =================== */
function addCoins(amount){
  const x2 = state.boosters.x2until > Date.now();
  const mult = (x2?2:1) * state.coinMult * (1 + state.luck/10);
  const final = Math.max(1, Math.floor(amount * mult));
  state.coins += final;
  state.stats.earned += final;
  progressTask('coins', final);
  return final;
}
function addExp(amount){
  state.exp += amount;
  if(state.exp >= state.level * 100){
    state.exp -= state.level * 100;
    state.level++;
    state.maxEnergy++;
    state.crystals += 5;
    toast('Новый уровень ' + state.level + '! +5 💎, +1 ⚡ макс.', '🎉');
  }
}
function addCare(n){
  state.care += n;
  if(n > 0) toast('+' + n + ' очков заботы', '💝');
}
function checkAchievements(){
  ACH.forEach(a=>{
    if(state.achievements.includes(a.id)) return;
    if(a.check(state)){
      state.achievements.push(a.id);
      state.crystals += 10;
      toast('Достижение: ' + a.name + '! +10 💎', '🏆');
    }
  });
}

/* =================== NPC =================== */
const NPC = {
  arina:  {name:'Аринка', emoji:'👧'},
  mom:    {name:'Мама', emoji:'👩'},
  doctor: {name:'Доктор Плюшкин', emoji:'👨‍⚕️'},
  nurse:  {name:'Медсестра Света', emoji:'👩‍⚕️'},
  cat:    {name:'Кот Мурзик', emoji:'🐱'},
  virus:  {name:'Вирус', emoji:'🦠'}
};
function arinaEmoji(){
  if(state.chapter >= 28 || state.storyDone) return '😊';
  if(state.chapter >= 15) return '🤒';
  return '👧';
}

/* =================== КАБИНЕТ =================== */
function healthStatus(){
  if(state.storyDone || state.chapter >= 30) return 'healthy';
  if(state.chapter >= 15) return 'healing';
  return 'sick';
}
const HAND_FILES = [
  ['hand_bandaged.png','hand_bandaged.jpg','hand_bandaged.jpeg'],
  ['hand_healthy.png','hand_healthy.jpg','hand_healthy.jpeg']
];
function tryHandImage(stage, tryIdx){
  const img = $('hand-img'), fb = $('hand-fallback');
  const variants = HAND_FILES[stage];
  if(tryIdx >= variants.length){
    img.style.display = 'none';
    fb.style.display = 'flex';
    return;
  }
  img.style.display = 'block';
  fb.style.display = 'none';
  img.onerror = function(){ tryHandImage(stage, tryIdx + 1); };
  img.src = variants[tryIdx] + '?v=' + Date.now();
}
function renderCabinet(){
  const st = state.storyDone ? 2 : 1;
  tryHandImage(st - 1, 0);
  const fbEmoji = ['🤕','😊'][st-1];
  if($('hand-fallback').textContent !== fbEmoji) $('hand-fallback').textContent = fbEmoji;
  $('hand-desc').textContent = st === 1
    ? 'Ручка забинтована. Каждая глава сюжета помогает ей заживать!'
    : 'Рука полностью здорова! Аринка снова может бегать и прыгать! 🎉';
  const hs = healthStatus();
  const badge = $('health-badge');
  badge.className = 'badge ' + hs;
  badge.textContent = {sick:'🤒 Заболела', healing:'😌 Выздоравливает', healthy:'😊 Здорова!'}[hs];
  $('health-desc').textContent = {
    sick:'Температура и слабость. Нужно лечиться и соблюдать режим.',
    healing:'Температура спала, силы возвращаются. Осталось закрепить результат!',
    healthy:'Аринка полностью здорова! Забота победила болезнь.'
  }[hs];
  const pct = state.storyDone ? 100 : Math.min(100, Math.floor((state.chapter-1)/30*100));
  $('cabinet-fill').style.width = pct + '%';
  $('cabinet-progress-text').textContent = state.storyDone
    ? 'Сюжет пройден полностью! Лечение: 100% 🎉'
    : 'Прогресс лечения: ' + pct + '% (глава ' + state.chapter + ' из 30)';
}

/* =================== СЮЖЕТ (30 ГЛАВ) =================== */
const path = (home, clinic) => state.storyPath === 'clinic' ? clinic : home;

const storyData = {
  1:{lines:()=>[
    {who:'arina', text:'Ой-ой! Я резала яблоко и порезала пальчик. В ранку попала грязь…'},
    {who:'mom', text:'Спокойно! %NAME%, обработай ранку по порядку.'}], mg:'aid'},
  2:{lines:()=>[
    {who:'arina', text:'Пальчик опух… В ранке завелись бактерии!'},
    {who:'doctor', text:'Бактерии боятся чистоты. Прогоним их всех!'}], mg:'bacteria'},
  3:{lines:()=>[
    {who:'arina', text:'Меня знобит… Лоб горячий, как чашка какао.'},
    {who:'mom', text:'Померим температуру и собьём жар!'}], mg:'temp'},
  4:{lines:()=>[
    {who:'arina', text:'Скучно лежать… Давай поиграем в пары?'},
    {who:'cat', text:'Мяу! Найди две одинаковые картинки!'}], mg:'memory'},
  5:{lines:()=>[
    {who:'mom', text:'Ручка покраснела. Нужно решить, как лечить Аринку.'},
    {who:'doctor', text:'Могу принять вас в поликлинике!'}],
    choice:{prompt:'Как будем лечить Аринку?', options:[
      {text:'🏠 Дома с мамой', sub:'Тепло и спокойно. +2 💝', apply:()=>{ state.storyPath='home'; addCare(2); }},
      {text:'🏥 Поликлиника', sub:'Быстро и надёжно. +50 🪙', apply:()=>{ state.storyPath='clinic'; addCoins(50); toast('Мама оплатила приём!', '🪙'); }}
    ]}},
  6:{lines:()=>[
    {who:'arina', text:path('Мама принесла завтрак! Что из этого полезнее?', 'В больничной столовой всё вкусное! Что выбрать?')},
    {who:path('mom','nurse'), text:'Выбери три самых полезных продукта!'}], mg:'recipe'},
  7:{lines:()=>[
    {who:'doctor', text:'Велел мыть руки перед едой. Научим Аринку правильно!'},
    {who:'arina', text:'Это как танец с мылом? Показывай!'}], mg:'handwash'},
  8:{lines:()=>[
    {who:'doctor', text:'Лекарство: по 2 таблетки 3 раза в день. Считай дозу!'},
    {who:'arina', text:'Математика и медицина — вот это поворот!'}], mg:'dosage'},
  9:{lines:()=>[
    {who:'arina', text:'Когда дышу глубоко, бочок немного болит…'},
    {who:'mom', text:'Сделаем дыхательную гимнастику!'}], mg:'breathing'},
  10:{boss:true, lines:()=>[
    {who:'cat', text:'МЯУ-У! Из-под кровати лезет БАКТЕРИЯ-МУТАНТ!'},
    {who:'virus', text:'Хи-хи! Меня не так-то просто прогнать!'}], mg:'bacteria'},
  11:{lines:()=>[
    {who:'doctor', text:'Лови полезные витамины, вредное — не трогай!'},
    {who:'arina', text:'Ловлю витаминки, как сачком!'}], mg:'vitamins'},
  12:{lines:()=>[
    {who:'doctor', text:'Лекарство горькое, но нужное. Договорились принимать?'}],
    choice:{prompt:'Что ответишь доктору?', options:[
      {text:'👍 Буду слушаться!', sub:'Честность лечит. +3 💝', apply:()=>addCare(3)},
      {text:'🤫 Спрячу таблетку', sub:'Хитрость не лечит. −1 ⚡', apply:()=>{ toast('Хитрость отложила выздоровление…', '😮‍💨'); }}
    ]}},
  13:{lines:()=>[
    {who:'arina', text:'В школе будут спрашивать про здоровье. Потренируемся?'},
    {who:'mom', text:'Отвечай внимательно!'}], mg:'quiz'},
  14:{lines:()=>[
    {who:'mom', text:'В аптечке всё перемешалось! Что можно трогать, а что нет?'},
    {who:'doctor', text:'Полезное — можно, опасное — не трогать!'}], mg:'sorting'},
  15:{boss:true, lines:()=>[
    {who:'arina', text:'Жар возвращается, сильнее прежнего… ЖАР-БОСС!'},
    {who:'mom', text:'Не бойся, доченька. Ты не одна!'}], mg:'temp'},
  16:{lines:()=>[
    {who:'arina', text:'Напоем мелодию выздоровления! Повторяй за мной.'},
    {who:'cat', text:'Мур-р! Музыка лечит даже кошек!'}], mg:'melody'},
  17:{lines:()=>[
    {who:'mom', text:'Я собрала цветочную мозаику! Сложи по порядку.'},
    {who:'arina', text:'Открывай плитки по очереди — получится картина!'}], mg:'puzzle'},
  18:{lines:()=>[
    {who:'mom', text:'Здоровый режим дня — лучшее лекарство. Проверим, что ты знаешь!'},
    {who:'arina', text:'Зарядка, обед, сон… Я угадаю всё!'}], mg:'dayplan'},
  19:{lines:()=>[
    {who:'arina', text:'Сил стало больше! Потренируем реакцию!'},
    {who:'doctor', text:'Отличный знак — организм восстанавливается!'}], mg:'target'},
  20:{lines:()=>[
    {who:'arina', text:'Ура, я почти здорова! Чем займёмся?'}],
    choice:{prompt:'Что сделаем для настроения?', options:[
      {text:'🚶 Прогулка в парке', sub:'Свежий воздух! +2 💝', apply:()=>{ addCare(2); state.finaleChoice='park'; }},
      {text:'📺 Мультики дома', sub:'Отдых. +60 🪙', apply:()=>{ addCoins(60); state.finaleChoice='cartoons'; }},
      {text:'👯 Позвать подругу', sub:'Дружба греет. +1 💝 +30 🪙', apply:()=>{ addCare(1); addCoins(30); state.finaleChoice='friend'; }}
    ]}},
  21:{lines:()=>[
    {who:'mom', text:'Собираемся на прогулку! Одень меня по погоде.'},
    {who:'arina', text:'Дождь? Панама? Я знаю, что надеть!'}], mg:'weather'},
  22:{lines:()=>[
    {who:'cat', text:'Мяу! В моей миске завёлся один странный сухарик. Найди его!'},
    {who:'arina', text:'Найди лишнее? Люблю такие!'}], mg:'spotdiff'},
  23:{lines:()=>[
    {who:'arina', text:'На празднике выздоровления — шарики! Лопай только нужного цвета.'},
    {who:'mom', text:'Будь внимательна — шарики разных цветов!'}], mg:'balloon'},
  24:{lines:()=>[
    {who:'arina', text:'В комнате за время болезни пыльно. Уберёмся?'},
    {who:'mom', text:'Чистота — залог здоровья!'}], mg:'cleaning'},
  25:{boss:true, lines:()=>[
    {who:'virus', text:'Я — ГЛАВНЫЙ ВИРУСНЫЙ БОСС! Поймай мои вредности!'},
    {who:'arina', text:'%NAME%, будь начеку!'},
    {who:'mom', text:'Мы всей семьёй с тобой!'}], mg:'vitamins'},
  26:{lines:()=>[
    {who:'doctor', text:'Приём лекарства строго по часам! Останови стрелку на нужном времени.'},
    {who:'arina', text:'Тик-так… Пунктуальность — мой конёк!'}], mg:'clock'},
  27:{lines:()=>[
    {who:'mom', text:'После болезни почистим зубки — крепкие зубы это важно!'},
    {who:'nurse', text:'Каждый зуб — три раза щёточкой!'}], mg:'teeth'},
  28:{lines:()=>[
    {who:'arina', text:'Соберу букет для мамы — спасибо ей за заботу!'},
    {who:'cat', text:'Мур! Только берегись пчёл!'}], mg:'garden'},
  29:{lines:()=>[
    {who:'doctor', text:'Последний этап: выпей ровно восемь глотков воды!'},
    {who:'arina', text:'Ровно восемь. Больше — нельзя, меньше — нельзя!'}], mg:'water'},
  30:{lines:()=>{
    const plans = {park:'прогуляться в парке', cartoons:'посмотреть мультики', friend:'позвать подругу'};
    const plan = plans[state.finaleChoice] || 'отпраздновать';
    return [
      {who:'arina', text:'Я ЗДОРОВА! Могу бегать, прыгать и гулять!'},
      {who:'mom', text:'Моя девочка выздоровела! Спасибо за заботу!'},
      {who:'doctor', text:'Диагноз: отличное здоровье. Лечение: дружба и терпение!'},
      {who:'cat', text:'Мяу! Ты лучший доктор на свете!'},
      {who:'arina', text:'Давай ' + plan + '! Спасибо за заботу все эти дни!'}
    ];
  }, mg:'finale'}
};
/* =================== ДВИЖОК ДИАЛОГОВ =================== */
let dialogLines = [], dialogIdx = 0, curCh = null;
function startStory(){
  if(state.energy <= 0){ toast('Нет энергии! Отдохни или купи бустер.', '⚡'); return; }
  if(state.storyDone){
    toast('Сюжет пройден! Попробуй мини-игры или рекорды!', '🎉');
    showMinigames();
    return;
  }
  isStoryMode = true;                     /* Исправление: сюжетный режим включается */
  state.energy--;                          /* Исправление: глава стоит 1 ⚡ */
  state.lastEnergyTs = state.lastEnergyTs || Date.now();
  curCh = storyData[state.chapter];
  dialogLines = curCh.lines();
  dialogIdx = 0;
  showScreen('screen-dialog');
  renderLine();
}
function renderLine(){
  const line = dialogLines[dialogIdx];
  const npc = NPC[line.who];
  $('dialog-name').textContent = npc.name;
  $('dialog-text').textContent = line.text.replace('%NAME%', state.name);
  $('char-emoji').textContent = line.who === 'arina' ? arinaEmoji() : npc.emoji;
  setCharPhoto(line.who);
  const last = dialogIdx >= dialogLines.length - 1;
  if(curCh.choice && last){
    $('btn-next-dialog').style.display = 'none';
    renderChoices();
  } else {
    $('dialog-choices').style.display = 'none';
    $('dialog-choices').innerHTML = '';
    $('btn-next-dialog').style.display = 'block';
    $('btn-next-dialog').textContent = last && curCh.mg ? 'Приступить 💪' : 'Далее ➔';
  }
}
function nextDialog(){
  if(dialogIdx < dialogLines.length - 1){ dialogIdx++; renderLine(); return; }
  if(curCh.mg) startMinigame(curCh.mg);
}
function renderChoices(){
  const box = $('dialog-choices');
  box.style.display = 'flex';
  box.innerHTML = '';
  const title = document.createElement('div');
  title.className = 'mg-sub';
  title.textContent = curCh.choice.prompt;
  box.appendChild(title);
  curCh.choice.options.forEach(op=>{
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.innerHTML = op.text + '<small>' + op.sub + '</small>';
    btn.onclick = ()=>{
      op.apply();
      /* Исправление: энергию уже сняли в startStory — двойного списания больше нет */
      if(state.chapter >= 30){ finishStory(); }
      else { state.chapter++; progressTask('chapter', 1); }
      checkAchievements();
      goToMenu();
    };
    box.appendChild(btn);
  });
}
function finishStory(){
  state.storyDone = true;
  addCoins(500); addCare(20); addExp(200);
  confetti(60);
  toast('СЮЖЕТ ПРОЙДЕН! Арина здорова! +500 🪙 +20 💝', '🎉');
  checkAchievements();
}

/* =================== ПАРАЛЛАКС =================== */
function initParallax(){
  const bg = $('dialog-bg');
  if(!bg || bg.dataset.plx) return;
  bg.dataset.plx = '1';
  bg.addEventListener('pointermove', e=>{
    const r = bg.getBoundingClientRect();
    const x = (e.clientX - r.left)/r.width - .5;
    const y = (e.clientY - r.top)/r.height - .5;
    $('plx-flowers').style.transform = 'translateX(' + (x*24) + 'px)';
    $('plx-clouds').style.transform = 'translate(' + (x*12) + 'px,' + (y*10) + 'px)';
  });
  bg.addEventListener('pointerleave', ()=>{
    $('plx-flowers').style.transform = '';
    $('plx-clouds').style.transform = '';
  });
}

/* =================== ЯДРО МИНИ-ИГР =================== */
let activeTimer = null, activeIntervals = [], mgActive = false;
/* Исправление: добавлена lastWasStory — помнит, что проигранная игра была сюжетной */
let lastMg = null, isStoryMode = false, bossMode = false, urgentRun = false, lastWasStory = false;
let sliderActive = false, breathActive = false, breathRaf = null;

function cleanupMinigame(){
  if(activeTimer) cancelAnimationFrame(activeTimer);
  activeIntervals.forEach(i=>clearInterval(i));
  activeIntervals = []; activeTimer = null; mgActive = false;
  /* Исправление: ползунок и дыхание больше не «живут» после выхода из игры */
  sliderActive = false;
  breathActive = false;
  if(breathRaf){ cancelAnimationFrame(breathRaf); breathRaf = null; }
  $('minigame-container').innerHTML = '';
  $('mg-timer').textContent = '⏱ —';
  $('mg-score').textContent = '⭐ 0';
}
function setHudTimer(t){ $('mg-timer').textContent = '⏱ ' + t; }
function setHudScore(s){ $('mg-score').textContent = '⭐ ' + s; }

function startMinigame(type){
  if(!isStoryMode && state.energy <= 0){ toast('Нет энергии!', '⚡'); return; }
  if(!isStoryMode) spendEnergy();
  lastMg = type;
  bossMode = isStoryMode && curCh && curCh.boss;
  cleanupMinigame();
  mgActive = true;
  showScreen('screen-game');
  (MG[type] || (()=>endGame(true,'Игра!',40,20)))();
}
function mgFinale(){
  confetti(60);
  endGame(true, '🎉 Финальная глава пройдена!', 100, 50);
}
function endGame(win, text, coins, exp, care){
  cleanupMinigame();
  state.stats.games++;
  progressTask('game', 1);
  let earned = 0, gotCare = 0;
  if(win){
    earned = addCoins(coins);
    addExp(exp);
    if(care){ addCare(care); gotCare = care; }
    if(isStoryMode){
      if(bossMode){
        state.stats.bossWins++;
        state.crystals += 2;
        addCare(5);
        toast('БОСС ПОБЕЖДЁН! +2 💎 +5 💝', '⚔️');
      }
      if(state.chapter >= 30){ finishStory(); state.chapter = 31; }
      else state.chapter++;
      progressTask('chapter', 1);
      state.energy = Math.min(state.maxEnergy, state.energy + 1);
    } else {
      state.energy = Math.min(state.maxEnergy, state.energy + 1);
    }
  } else dustBurst();
  if(urgentRun){
    if(win){
      state.stats.urgentDone++;
      state.urgent.end = 0;
      state.energy = Math.min(state.maxEnergy, state.energy + 2);
      toast('Срочный вызов выполнен! +2 ⚡', '🚨');
    }
    urgentRun = false;
    $('urgent-banner').style.display = 'none';
  }
  checkAchievements();
  updateUI();
  $('result-title').textContent = win ? 'Победа!' : 'Не вышlo';
  $('result-title').style.color = win ? 'var(--accent)' : 'var(--danger)';
  $('result-text').textContent = text;
  $('result-coins').textContent = earned;
  $('result-exp').textContent = exp;
  $('result-care-line').style.display = gotCare ? 'block' : 'none';
  $('result-care').textContent = gotCare;
  /* Исправление: «Ещё раз» видна и после проигрыша сюжетной главы */
  lastWasStory = isStoryMode;
  $('btn-result-story').style.display = (win && isStoryMode) ? 'block' : 'none';
  $('btn-result-replay').style.display = (lastMg && lastMg !== 'finale') ? 'block' : 'none';
  isStoryMode = false; bossMode = false;
  showScreen('screen-result');
}
function replayMinigame(){
  if(!lastMg || lastMg === 'finale') return;
  if(lastWasStory && !state.storyDone){
    /* Повтор сюжетной главы: энергия уже потрачена при первом заходе */
    isStoryMode = true;
    bossMode = false;
    curCh = storyData[state.chapter];
    dialogLines = curCh.lines();
    dialogIdx = 0;
    showScreen('screen-dialog');
    renderLine();
    return;
  }
  isStoryMode = false; curCh = null;
  startMinigame(lastMg);
}
function abortMinigame(){
  cleanupMinigame();
  isStoryMode = false; bossMode = false; urgentRun = false;
  goToMenu();
}
function skipMinigame(){
  if(state.boosters.skips <= 0){ toast('Нет пропусков! Купи в магазине.', '💊'); return; }
  state.boosters.skips--;
  endGame(true, 'Мини-игра пропущена с помощью волшебной таблетки!', 40, 15);
}

/* --- 1. Аптечка --- */
const AID_ITEMS = [
  {id:'water', label:'💧 Промыть водой'},
  {id:'antiseptic', label:'🧪 Антисептик'},
  {id:'ointment', label:'🧴 Мазь'},
  {id:'bandage', label:'🩹 Пластырь'}
];
let aidSeq = [], aidStep = 0;
function initAid(){
  aidSeq = shuffle(AID_ITEMS.slice()); aidStep = 0;
  const c = $('minigame-container');
  c.innerHTML = '<h2 class="mg-title">Обработай рану</h2><p class="mg-desc">Выбирай предметы по порядку!</p><div class="aid-progress" id="aid-progress"></div><div class="grid-2x3" id="aid-grid"></div>';
  updAid();
  aidSeq.forEach(item=>{
    const b = document.createElement('button');
    b.className = 'action-btn'; b.textContent = item.label;
    b.onclick = ()=>aidClick(item.id);
    $('aid-grid').appendChild(b);
  });
}
function updAid(){ $('aid-progress').textContent = 'Шаг ' + (aidStep+1) + ' из 4: ' + aidSeq[aidStep].label; }
function aidClick(id){
  if(id === aidSeq[aidStep].id){
    aidStep++; state.stats.heals++;
    if(aidStep === 4) endGame(true, 'Ранка обработана идеально! 🩹', 60, 40, 1);
    else updAid();
  } else endGame(false, 'Неправильный порядок! Сначала подумай.');
}

/* --- 2. Бактерии/пыль --- */
let bugsKilled = 0, bugsGoal = 15;
function initBacteria(isClean){
  bugsKilled = 0; bugsGoal = bossMode ? 20 : 15;
  const c = $('minigame-container');
  c.innerHTML = '<h2 class="mg-title">' + (isClean ? 'Убери пыль' : 'Убей бактерии') + '</h2>'
    + '<p class="mg-desc">Кликай по ' + (isClean ? 'пылинкам 💨' : 'бактериям 🦠') + '! Не трогай 🌸!</p>'
    + '<div id="bacteria-area"><div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:60px;pointer-events:none">' + (isClean ? '🧹' : '🩹') + '</div></div>'
    + '<p class="mg-sub" id="bugs-count">0 / ' + bugsGoal + '</p>';
  let tLeft = bossMode ? 40 : 30;
  setHudTimer(tLeft + 'с');
  const tick = setInterval(()=>{
    tLeft--; setHudTimer(tLeft + 'с');
    if(tLeft <= 0){ clearInterval(tick); if(bugsKilled < bugsGoal) endGame(false, 'Время вышло! Бактерии не все прогнаны.'); }
  }, 1000);
  activeIntervals.push(tick);
  const spawn = setInterval(()=>{
    if(bugsKilled >= bugsGoal){ clearInterval(spawn); return; }
    const area = $('bacteria-area'); if(!area || !mgActive) return;
    const good = Math.random() < 0.15;
    const b = document.createElement('div');
    b.className = 'bacteria';
    b.textContent = good ? '🌸' : (isClean ? '💨' : '🦠');
    b.style.left = (Math.random()*80+5) + '%';
    b.style.top = (Math.random()*70+10) + '%';
    b.onclick = ()=>{
      b.remove();
      if(good){ endGame(false, 'Ой! Ты тронула цветочек — его нельзя было трогать!'); return; }
      bugsKilled++;
      if(isClean) state.stats.heals++; else state.stats.bugs++;
      setHudScore(bugsKilled);
      $('bugs-count').textContent = bugsKilled + ' / ' + bugsGoal;
      if(bugsKilled >= bugsGoal){
        activeIntervals.forEach(clearInterval); activeIntervals = [];
        endGame(true, (isClean ? 'Комната чиста!' : 'Все бактерии побеждены!') + (bossMode ? ' Босс повержен!' : ''), bossMode?120:60, bossMode?60:40, 1);
      }
    };
    area.appendChild(b);
    setTimeout(()=>{ if(b.parentNode) b.remove(); }, 1600);
  }, bossMode ? 450 : 600);
  activeIntervals.push(spawn);
}

/* --- 3. Термометр --- */
let sliderX = 0, sliderDir = 1, tempTarget = {left:45, width:12}, tempTries = 3, tempSpeed = 1.6;
function initTemp(){
  tempTries = 3;
  tempSpeed = bossMode ? 2.6 : 1.6;
  const zoneW = bossMode ? 8 : 12;
  tempTarget = {left: rnd(80-zoneW)+5, width: zoneW};
  const c = $('minigame-container');
  c.innerHTML = '<h2 class="mg-title">Сбей температуру</h2>'
    + '<p class="mg-desc">Останови полоску точно в зелёной зоне!</p>'
    + '<div class="slider-track"><div class="slider-target" style="left:'+tempTarget.left+'%;width:'+tempTarget.width+'%"></div>'
    + '<div id="slider-thumb" class="slider-thumb"></div></div>'
    + '<button class="main-btn" onclick="stopSlider()">Стоп!</button>'
    + '<div class="temp-hearts" id="temp-hearts">Попытки: ❤️❤️❤️</div>';
  sliderX = 0; sliderDir = 1; sliderActive = true;
  animateSlider();
}
function animateSlider(){
  if(!sliderActive || !mgActive) return;
  sliderX += sliderDir * tempSpeed;
  if(sliderX > 100){ sliderX = 100; sliderDir = -1; }
  if(sliderX < 0){ sliderX = 0; sliderDir = 1; }
  const thumb = $('slider-thumb');
  if(thumb) thumb.style.left = sliderX + '%';
  activeTimer = requestAnimationFrame(animateSlider);
}
function stopSlider(){
  sliderActive = false;
  if(sliderX >= tempTarget.left && sliderX <= tempTarget.left + tempTarget.width){
    endGame(true, 'Температура в норме! 36.6 🌡️', bossMode?120:70, bossMode?60:50, 1);
  } else {
    tempTries--;
    if(tempTries <= 0) endGame(false, 'Все попытки израсходованы…');
    else {
      $('temp-hearts').textContent = 'Попытки: ' + '❤️'.repeat(tempTries) + '🖤'.repeat(3-tempTries);
      toast('Промах! Осталось попыток: ' + tempTries, '🌡️');
      sliderX = 0; sliderDir = 1; sliderActive = true;
      animateSlider();
    }
  }
}

/* --- 4. Память --- */
const MEM_SETS = [['🍎','🍊','💊','🍵','🥕','💧'], ['🌟','🌙','☀️','⭐','🌷','🍓'], ['🐱','🐰','🐻','🦊','🐼','🐸']];
function initMemory(){
  const set = pick(MEM_SETS);
  const cards = shuffle(set.concat(set));
  const c = $('minigame-container');
  c.innerHTML = '<h2 class="mg-title">Найди пары</h2><p class="mg-desc">Открой все 6 пар!</p><div class="memory-grid" id="memory-grid"></div>';
  let flipped = [], matched = 0, lock = false;
  cards.forEach(e=>{
    const card = document.createElement('div');
    card.className = 'memory-card';
    card.onclick = ()=>{
      if(lock || card.classList.contains('flipped') || flipped.length >= 2) return;
      card.textContent = e; card.classList.add('flipped');
      flipped.push({el:card, e});
      if(flipped.length === 2){
        lock = true;
        setTimeout(()=>{
          if(flipped[0].e === flipped[1].e){
            matched++; setHudScore(matched);
            if(matched === 6) endGame(true, 'Все пары найдены! Отличная память! 🧠', 80, 60, 1);
          } else flipped.forEach(f=>{ f.el.classList.remove('flipped'); f.el.textContent = ''; });
          flipped = []; lock = false;
        }, 700);
      }
    };
    $('memory-grid').appendChild(card);
  });
}

/* --- 5. Реакция --- */
function initTarget(){
  let hits = 0;
  const need = bossMode ? 12 : 10;
  const c = $('minigame-container');
  c.innerHTML = '<h2 class="mg-title">Поймай мишени</h2><p class="mg-desc">Успей нажать на все ' + need + ' мишеней за 15 секунд!</p><div id="target-area"></div>';
  let tLeft = 15;
  setHudTimer('15с');
  const tick = setInterval(()=>{
    tLeft--; setHudTimer(tLeft + 'с');
    if(tLeft <= 0){ clearInterval(tick); if(hits < need) endGame(false, 'Время вышло! Поймано ' + hits + ' из ' + need + '.'); }
  }, 1000);
  activeIntervals.push(tick);
  const area = $('target-area');
  const spawn = ()=>{
    if(hits >= need || !mgActive) return;
    area.innerHTML = '';
    const btn = document.createElement('button');
    btn.className = 'target-btn';
    btn.textContent = '🎯';
    btn.style.left = rnd(70) + '%';
    btn.style.top = rnd(70) + '%';
    btn.onclick = ()=>{
      hits++; setHudScore(hits);
      if(hits >= need){
        activeIntervals.forEach(clearInterval); activeIntervals = [];
        endGame(true, 'Реакция супер! Все мишени пойманы!', 60, 40);
      } else spawn();
    };
    area.appendChild(btn);
  };
  spawn();
}

/* --- 6. Витамины --- */
const VIT_GOOD = ['🍎','💊','🥕','🍇','🥦'], VIT_BAD = ['🍬','🥤','🍟','🍫'];
let vitScore = 0, vitLives = 3, vitBadChance = 0.3, recordMode = false;
function initVitamins(record){
  recordMode = !!record;
  vitScore = 0; vitLives = record ? 1 : 3; vitBadChance = record ? 0.35 : 0.3;
  const c = $('minigame-container');
  c.innerHTML = '<h2 class="mg-title">' + (record ? '🏆 Рекордный забег' : 'Лови витамины') + '</h2>'
    + '<p class="mg-desc">Тапай полезное ' + VIT_GOOD[0] + ', избегай вредного ' + VIT_BAD[0] + '!' + (record ? '' : ' 3 промаха — проигрыш.') + '</p>'
    + '<div id="vit-area"><div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:56px;pointer-events:none">🧺</div></div>'
    + '<p class="mg-sub" id="vit-info"></p>';
  updVit();
  let tLeft = record ? 60 : 30;
  setHudTimer(tLeft + 'с');
  const tick = setInterval(()=>{
    tLeft--; setHudTimer(tLeft + 'с');
    if(tLeft <= 0){
      clearInterval(tick);
      if(record){
        state.scores.push(vitScore);
        state.scores.sort((a,b)=>b-a);
        state.scores = state.scores.slice(0,5);
        confetti(vitScore > 10 ? 40 : 20);
        endGame(true, 'Время вышло! Твой счёт: ' + vitScore + ' 🏆', vitScore*4, vitScore*2);
      } else endGame(true, 'Отличная охота за витаминами! Счёт: ' + vitScore, 50+vitScore*3, 30+vitScore, 1);
    }
  }, 1000);
  activeIntervals.push(tick);
  const spawn = setInterval(()=>{
    const area = $('vit-area');
    if(!area || !mgActive) return;
    const bad = Math.random() < vitBadChance;
    const item = document.createElement('div');
    item.className = 'fall-item';
    item.textContent = bad ? pick(VIT_BAD) : pick(VIT_GOOD);
    item.style.left = rnd(85) + '%';
    item.style.animationDuration = (bossMode ? 2.4 : (record ? 2.2 : 3)) + rnd(10)/10 + 's';
    item.onclick = ()=>{
      item.remove();
      if(bad){
        if(record){ toast('Вредность! −1 к счёту', '❌'); vitScore = Math.max(0, vitScore-1); }
        else {
          vitLives--; updVit();
          if(vitLives <= 0){ activeIntervals.forEach(clearInterval); activeIntervals = []; endGame(false, 'Слишком много вредностей! Счёт: ' + vitScore); return; }
        }
      } else {
        vitScore++;
        if(bossMode && vitScore >= 12){ activeIntervals.forEach(clearInterval); activeIntervals = []; endGame(true, 'Босс повержен! Ты поймала все витаминки!', 120, 60, 5); return; }
      }
      setHudScore(vitScore);
      updVit();
    };
    area.appendChild(item);
    setTimeout(()=>{ if(item.parentNode) item.remove(); }, 4000);
  }, 550);
  activeIntervals.push(spawn);
}
function updVit(){
  const el = $('vit-info');
  if(!el) return;
  el.textContent = recordMode ? 'Счёт: ' + vitScore : 'Счёт: ' + vitScore + ' · Жизни: ' + '❤️'.repeat(Math.max(0,vitLives));
}

/* --- 7. Мелодия --- */
const PAD_COLORS = ['#FF6B9D','#4CAF50','#2196F3','#FF9800'];
const PAD_ICONS = ['🎵','🎶','🎼','🔔'];
let melSeq = [], melInput = [], melRound = 0;
function initMelody(){
  melSeq = []; melRound = 0;
  const c = $('minigame-container');
  c.innerHTML = '<h2 class="mg-title">Мелодия выздоровления</h2><p class="mg-desc">Смотри и повтори последовательность!</p><div class="melody-grid" id="melody-grid"></div><p class="mg-sub" id="mel-status">Слушай…</p>';
  for(let i=0;i<4;i++){
    const pad = document.createElement('button');
    pad.className = 'pad';
    pad.style.background = PAD_COLORS[i];
    pad.textContent = PAD_ICONS[i];
    pad.onclick = ()=>melPress(i);
    $('melody-grid').appendChild(pad);
  }
  setTimeout(melNextRound, 900);
}
function flashPad(i){
  const pads = document.querySelectorAll('.pad');
  if(!pads[i]) return;
  pads[i].classList.add('pad-flash');
  setTimeout(()=>{ if(pads[i]) pads[i].classList.remove('pad-flash'); }, 300);
}
function melNextRound(){
  if(!mgActive) return;
  melRound++;
  melSeq.push(rnd(4));
  $('mel-status').textContent = 'Раунд ' + melRound + ' из 3: слушай!';
  melSeq.forEach((p, idx)=>{
    setTimeout(()=>{ if(mgActive) flashPad(p); }, (idx+1)*650);
  });
  setTimeout(()=>{ if(mgActive) $('mel-status').textContent = 'Твой ход! Повтори ' + melSeq.length + ' нот.'; }, (melSeq.length+1)*650);
  melInput = [];
}
function melPress(i){
  if(!mgActive || melInput.length >= melSeq.length) return;
  flashPad(i);
  melInput.push(i);
  if(melSeq[melInput.length - 1] !== i){ endGame(false, 'Не та нота! Мелодия сбилась…'); return; }
  if(melInput.length === melSeq.length){
    if(melRound >= 3) endGame(true, 'Мелодия выздоровления сыграна! 🎵', 90, 55, 1);
    else { toast('Раунд ' + melRound + ' пройден!', '🎵'); setTimeout(melNextRound, 800); }
  }
}

/* --- 8. Викторина --- */
const QUIZ = [
  {q:'Когда нужно мыть руки?', o:['Перед едой и после улицы','Раз в неделю','Только перед сном','Никогда'], a:0},
  {q:'Что помогает при температуре?', o:['Бегать и прыгать','Пить воду и отдыхать','Есть мороженое','Смотреть в окно'], a:1},
  {q:'Какие продукты самые полезные?', o:['Чипсы и газировка','Овощи и фрукты','Конфеты','Жвачка'], a:1},
  {q:'Что делать с ранкой?', o:['Замотать грязной тряпкой','Промыть и обработать','Посыпать песком','Ничего'], a:1},
  {q:'Сколько нужно спать ребёнку?', o:['3 часа','9–11 часов','Не спать вовсе','Только днём'], a:1},
  {q:'Что нельзя брать без взрослых?', o:['Игрушки','Книжки','Лекарства из аптечки','Карандаши'], a:2},
  {q:'Что убивает бактерии на руках?', o:['Сок','Мыло и вода','Воздух','Солнечные очки'], a:1},
  {q:'Нужно ли говорить доктору правду?', o:['Нет','Иногда','Да, всегда','Только маме'], a:2},
  {q:'Что полезнее на полдник?', o:['Яблоко','Чипсы','Кола','Торт'], a:0},
  {q:'Зачем нужен сон?', o:['Чтобы скучать','Для восстановления сил','Чтобы не играть','Не знаю'], a:1}
];
function initQuiz(){
  const qs = shuffle(QUIZ.slice()).slice(0, 5);
  let qi = 0, right = 0;
  const c = $('minigame-container');
  const renderQ = ()=>{
    if(qi >= qs.length){
      if(right >= 4) endGame(true, 'Отлично! ' + right + ' из 5 правильных ответов! 🤓', 80, 50, 1);
      else endGame(false, 'Правильных только ' + right + ' из 5. Нужно минимум 4!');
      return;
    }
    const q = qs[qi];
    c.innerHTML = '<h2 class="mg-title">Вопрос ' + (qi+1) + '/5</h2><p class="mg-desc">' + q.q + '</p><div id="quiz-opts"></div>';
    q.o.forEach((opt, oi)=>{
      const b = document.createElement('button');
      b.className = 'quiz-opt';
      b.textContent = opt;
      b.onclick = ()=>{
        if(oi === q.a){ b.classList.add('ok'); right++; setHudScore(right); }
        else b.classList.add('bad');
        setTimeout(()=>{ qi++; renderQ(); }, 600);
      };
      $('quiz-opts').appendChild(b);
    });
  };
  renderQ();
}

/* --- 9. Сортировка аптечки --- */
const SORT_ITEMS = [
  {e:'💊', ok:true}, {e:'🩹', ok:true}, {e:'🧪', ok:true}, {e:'🌡️', ok:true},
  {e:'🧸', ok:false}, {e:'🍫', ok:false}, {e:'⚔️', ok:false}, {e:'🧦', ok:false}
];
function initSorting(){
  const items = shuffle(SORT_ITEMS.slice());
  let idx = 0, done = 0;
  const c = $('minigame-container');
  const render = ()=>{
    if(idx >= items.length){ endGame(true, 'Аптечка разобрана идеально!', 70, 45, 1); return; }
    const it = items[idx];
    c.innerHTML = '<h2 class="mg-title">Разбери аптечку</h2><p class="mg-desc">Можно ли это трогать из аптечки?</p>'
      + '<div class="sort-stage">' + it.e + '</div>'
      + '<div class="sort-btns"><button class="action-btn success-btn" id="sort-yes">✅ Можно</button><button class="action-btn" id="sort-no">⛔ Нельзя</button></div>'
      + '<p class="mg-sub">Предмет ' + (idx+1) + ' из ' + items.length + '</p>';
    $('sort-yes').onclick = ()=>answer(true);
    $('sort-no').onclick = ()=>answer(false);
  };
  const answer = yes=>{
    if(yes === items[idx].ok){ done++; setHudScore(done); idx++; render(); }
    else endGame(false, 'Ошибка! Так сортировать нельзя.');
  };
  render();
}

/* --- 10. Рецепт здоровья --- */
const RECIPE_GOOD = ['🍎','🥕','💧','🥦','🥛','🐟'], RECIPE_BAD = ['🍬','🥤','🍟','🍫','🍩','🧋'];
function initRecipe(){
  const good = shuffle(RECIPE_GOOD.slice()).slice(0,3);
  const bad = shuffle(RECIPE_BAD.slice()).slice(0,3);
  const all = shuffle(good.concat(bad));
  let picked = [];
  const c = $('minigame-container');
  const render = ()=>{
    c.innerHTML = '<h2 class="mg-title">Рецепт здоровья</h2><p class="mg-desc">Выбери 3 самых полезных продукта!</p><div class="grid-2x3" id="recipe-grid"></div><p class="mg-sub" id="recipe-status">Выбрано: 0/3</p>';
    all.forEach(it=>{
      const b = document.createElement('button');
      b.className = 'action-btn';
      b.textContent = it;
      b.onclick = ()=>{
        if(picked.includes(it)) return;
        if(good.includes(it)){
          picked.push(it);
          b.style.background = 'rgba(76,175,80,.3)';
          $('recipe-status').textContent = 'Выбрано: ' + picked.length + '/3';
          setHudScore(picked.length);
          if(picked.length === 3){ state.stats.recipesOk++; endGame(true, 'Идеальный рецепт здоровья! 🥗', 70, 45, 1); }
        } else {
          b.style.background = 'rgba(244,67,54,.3)';
          endGame(false, 'Упс! ' + it + ' — не полезно для больного!');
        }
      };
      $('recipe-grid').appendChild(b);
    });
  };
  render();
}

/* --- 11. Дозировка --- */
function initDosage(){
  const tasks = [];
  for(let i=0;i<5;i++){
    const a = rnd(3)+1, b = rnd(3)+1, ans = a*b;
    tasks.push({q:'Принимать ' + a + ' табл. × ' + b + ' раза в день = ?', o:shuffle([ans, ans+1, ans+2]), a:ans});
  }
  let ti = 0, right = 0;
  const c = $('minigame-container');
  const renderT = ()=>{
    if(ti >= tasks.length){
      if(right >= 4) endGame(true, 'Дозировка точна! Ты как настоящий фармацевт! 💊', 80, 50, 1);
      else endGame(false, 'Слишком много ошибок в дозе! Правильно: ' + right + ' из 5.');
      return;
    }
    const t = tasks[ti];
    c.innerHTML = '<h2 class="mg-title">Дозировка</h2><p class="mg-desc">' + t.q + '</p><div id="dose-opts"></div>';
    t.o.forEach(opt=>{
      const b = document.createElement('button');
      b.className = 'quiz-opt';
      b.textContent = opt;
      b.onclick = ()=>{
        if(opt === t.a){ b.classList.add('ok'); right++; setHudScore(right); }
        else b.classList.add('bad');
        setTimeout(()=>{ ti++; renderT(); }, 500);
      };
      $('dose-opts').appendChild(b);
    });
  };
  renderT();
}

/* --- 12. Дыхательная гимнастика --- */
let breathVal = 0, breathZone = {left:55, width:15}, breathRound = 0;
function initBreathing(){
  breathRound = 0;
  const c = $('minigame-container');
  c.innerHTML = '<h2 class="mg-title">Дыхательная гимнастика</h2>'
    + '<p class="mg-desc">Держи палец на кнопке — полоска наполнится воздухом. Отпусти точно в зелёной зоне!</p>'
    + '<div class="breath-track"><div class="breath-zone" id="breath-zone"></div><div class="breath-fill" id="breath-fill"></div></div>'
    + '<button class="main-btn breath-btn" id="breath-btn">🌬️ Держи вдох!</button>'
    + '<p class="mg-sub" id="breath-status">Раунд 1 из 3</p>';
  const btn = $('breath-btn');
  btn.addEventListener('pointerdown', e=>{ e.preventDefault(); startBreath(); });
  btn.addEventListener('pointerup', stopBreath);
  btn.addEventListener('pointerleave', ()=>{ if(breathActive) stopBreath(); });
  nextBreathRound();
}
function nextBreathRound(){
  const zoneW = bossMode ? 10 : 15;
  breathZone = {left: rnd(70)+15, width: zoneW};
  $('breath-zone').style.left = breathZone.left + '%';
  $('breath-zone').style.width = breathZone.width + '%';
  $('breath-status').textContent = 'Раунд ' + (breathRound+1) + ' из 3';
  breathVal = 0;
  $('breath-fill').style.width = '0%';
  breathActive = false;
}
function startBreath(){
  if(breathActive || !mgActive) return;
  breathActive = true;
  const fillFn = ()=>{
    if(!breathActive || !mgActive) return;
    breathVal += 1.6;
    if(breathVal >= 100){ breathVal = 100; stopBreath(); return; }
    $('breath-fill').style.width = breathVal + '%';
    breathRaf = requestAnimationFrame(fillFn);
  };
  breathRaf = requestAnimationFrame(fillFn);
}
function stopBreath(){
  if(!breathActive) return;
  breathActive = false;
  if(breathRaf){ cancelAnimationFrame(breathRaf); breathRaf = null; }
  if(breathVal >= breathZone.left && breathVal <= breathZone.left + breathZone.width){
    breathRound++; setHudScore(breathRound);
    if(breathRound >= 3) endGame(true, 'Дыхание ровное и спокойное! 🌬️', 75, 45, 1);
    else { toast('Отличный вдох! Раунд ' + breathRound + '/3', '🌬️'); setTimeout(nextBreathRound, 700); }
  } else endGame(false, 'Выдох не попал в зону… Попробуй ещё раз!');
}

/* --- 13. Мытьё рук --- */
const WASH_STEPS = ['💧 Смочить руки','🧼 Взять мыло','🤲 Потереть между пальцами','🚿 Смыть пену','🧻 Вытереть полотенцем'];
let washSeq = [], washStep = 0;
function initHandwash(){
  washSeq = shuffle(WASH_STEPS.slice()); washStep = 0;
  const c = $('minigame-container');
  c.innerHTML = '<h2 class="mg-title">Помой руки</h2><p class="mg-desc">Шаги в правильном порядке!</p><div class="aid-progress" id="wash-hint"></div><div class="grid-2x3" id="wash-grid"></div>';
  updWash();
  washSeq.forEach(s=>{
    const b = document.createElement('button');
    b.className = 'action-btn'; b.textContent = s;
    b.onclick = ()=>{
      if(s === washSeq[washStep]){
        washStep++; state.stats.heals++;
        if(washStep === 5) endGame(true, 'Руки идеально чистые! 🧼', 70, 45, 1);
        else updWash();
      } else endGame(false, 'Не тот шаг! Вспоминай порядок мытья.');
    };
    $('wash-grid').appendChild(b);
  });
}
function updWash(){ $('wash-hint').textContent = 'Шаг ' + (washStep+1) + ' из 5'; }

/* --- 14. Мозаика --- */
const PUZZLE_EMO = ['🌸','🌼','🌻','🦋','🐝','🌈','☀️','🍓','🍃'];
function initPuzzle(){
  const order = shuffle(PUZZLE_EMO.map((e,i)=>({e,i})));
  let next = 0;
  const c = $('minigame-container');
  c.innerHTML = '<h2 class="mg-title">Цветочная мозаика</h2><p class="mg-desc">Тапай плитки по порядку: 1 → 9!</p><p class="mg-sub" id="pz-next"></p><div class="memory-grid" id="pz-grid"></div>';
  const upd = ()=>{ $('pz-next').textContent = next < 9 ? 'Следующая: ' + PUZZLE_EMO[next] : ''; };
  upd();
  order.forEach(t=>{
    const b = document.createElement('button');
    b.className = 'memory-card'; b.textContent = '❓';
    b.onclick = ()=>{
      if(t.i === next){
        b.textContent = t.e; b.style.background = 'rgba(76,175,80,.25)';
        next++; upd();
        if(next === 9) endGame(true, 'Мозаика собрана! 🌸', 75, 50, 1);
      } else endGame(false, 'Не та плитка! Начинай сначала…');
    };
    $('pz-grid').appendChild(b);
  });
}

/* --- 15. Режим дня --- */
const DAYPLAN = [
  {q:'Зарядка и завтрак', a:'🌅 Утро'},
  {q:'Прогулка и обед', a:'☀️ День'},
  {q:'Ужин и настольные игры', a:'🌆 Вечер'},
  {q:'Крепкий сон', a:'🌙 Ночь'}
];
const DAY_OPTS = ['🌅 Утро','☀️ День','🌆 Вечер','🌙 Ночь'];
function initDayplan(){
  let qi = 0;
  const c = $('minigame-container');
  const render = ()=>{
    if(qi >= DAYPLAN.length){ endGame(true, 'Режим дня — под контролем! ⏰', 75, 50, 1); return; }
    const q = DAYPLAN[qi];
    c.innerHTML = '<h2 class="mg-title">Режим дня</h2><p class="mg-desc">Когда это делают? «' + q.q + '»</p><div class="grid-2x3" id="dp-opts"></div>';
    DAY_OPTS.forEach(o=>{
      const b = document.createElement('button');
      b.className = 'action-btn'; b.textContent = o;
      b.onclick = ()=>{ if(o === q.a){ qi++; render(); } else endGame(false, 'Не то время суток! Подумай ещё.'); };
      $('dp-opts').appendChild(b);
    });
  };
  render();
}

/* --- 16. Одень по погоде --- */
const WEATHER = [
  {sky:'🌧️', name:'Дождь', ok:'☂️ Зонт', bad:['🩳 Шорты','🕶️ Солнечные очки','🩱 Купальник']},
  {sky:'🔥', name:'Жара', ok:'👒 Панама', bad:['🧣 Шарф','🧤 Рукавички','🧥 Куртка']},
  {sky:'❄️', name:'Мороз', ok:'🧥 Тёплая куртка', bad:['🩳 Шорты','👡 Сандалии','🕶️ Очки']}
];
function initWeather(){
  let wi = 0;
  const c = $('minigame-container');
  const render = ()=>{
    if(wi >= WEATHER.length){ endGame(true, 'Одета идеально — ни дождь, ни мороз не страшны! 🧥', 80, 50, 1); return; }
    const w = WEATHER[wi];
    const opts = shuffle([w.ok].concat(w.bad));
    c.innerHTML = '<h2 class="mg-title">Одень по погоде</h2><p class="mg-desc">На улице ' + w.sky + ' ' + w.name + '! Что наденем?</p><div class="grid-2x3" id="w-opts"></div>';
    opts.forEach(o=>{
      const b = document.createElement('button');
      b.className = 'action-btn'; b.textContent = o;
      b.onclick = ()=>{ if(o === w.ok){ wi++; render(); } else endGame(false, 'В такой одежде простынешь! Правильно: ' + w.ok); };
      $('w-opts').appendChild(b);
    });
  };
  render();
}

/* --- 17. Найди лишнее --- */
function initSpotdiff(){
  let round = 0, lives = 3;
  const POOL = ['🍎','🌼','🐱','⭐','🦋','🍓','💙'];
  const c = $('minigame-container');
  const render = ()=>{
    if(round >= 5){ endGame(true, 'Все 5 отличий найдены! 👀', 80, 55, 1); return; }
    const base = pick(POOL);
    let odd = pick(POOL); while(odd === base) odd = pick(POOL);
    const oddIdx = rnd(12);
    c.innerHTML = '<h2 class="mg-title">Найди лишнее</h2><p class="mg-desc">Один предмет не такой! (' + (round+1) + '/5)</p><p class="mg-sub">Попытки: ' + '❤️'.repeat(Math.max(0,lives)) + '</p><div class="spot-grid" id="sp-grid"></div>';
    for(let i=0;i<12;i++){
      const b = document.createElement('button');
      b.className = 'spot-cell';
      b.textContent = i === oddIdx ? odd : base;
      b.onclick = ()=>{
        if(i === oddIdx){ round++; render(); }
        else { lives--; if(lives <= 0) endGame(false, 'Слишком много ошибок!'); else render(); }
      };
      $('sp-grid').appendChild(b);
    }
  };
  render();
}

/* --- 18. Шарики --- */
function initBalloon(){
  const COLORS = [
    {cls:'bal-red', name:'красные', icon:'🔴'},
    {cls:'bal-blue', name:'синие', icon:'🔵'},
    {cls:'bal-green', name:'зелёные', icon:'🟢'},
    {cls:'bal-yellow', name:'жёлтые', icon:'🟡'}
  ];
  const target = pick(COLORS);
  let popped = 0, lives = 3;
  const c = $('minigame-container');
  c.innerHTML = '<h2 class="mg-title">Праздничные шарики</h2><p class="mg-desc">Лопай только ' + target.icon + ' ' + target.name + ' шарики!</p><div class="balloon-area" id="bl-area"></div><p class="mg-sub" id="bl-info"></p>';
  const upd = ()=>{ $('bl-info').textContent = 'Лопнуто: ' + popped + '/8 · Попытки: ' + '❤️'.repeat(Math.max(0,lives)); };
  upd();
  let tLeft = 30; setHudTimer('30с');
  const tick = setInterval(()=>{
    tLeft--; setHudTimer(tLeft + 'с');
    if(tLeft <= 0){ clearInterval(tick); if(popped < 8) endGame(false, 'Время вышло! Лопнуто только ' + popped + ' из 8.'); }
  }, 1000);
  activeIntervals.push(tick);
  const spawn = setInterval(()=>{
    const area = $('bl-area'); if(!area || !mgActive) return;
    const col = pick(COLORS);
    const b = document.createElement('button');
    b.className = 'balloon-btn ' + col.cls;
    b.style.left = rnd(85) + '%'; b.style.top = rnd(75) + '%';
    b.onclick = ()=>{
      if(col.cls === target.cls){
        popped++; setHudScore(popped); upd(); b.remove();
        if(popped >= 8){ activeIntervals.forEach(clearInterval); activeIntervals = []; endGame(true, 'Праздник удался! 🎈', 85, 55, 1); }
      } else {
        lives--; upd();
        if(lives <= 0){ activeIntervals.forEach(clearInterval); activeIntervals = []; endGame(false, 'Это не тот цвет! Шарик был ' + col.name + '.'); }
      }
    };
    area.appendChild(b);
    setTimeout(()=>{ if(b.parentNode) b.remove(); }, 2200);
  }, 600);
  activeIntervals.push(spawn);
}

/* --- 19. Уборка --- */
function initCleaning(){
  let cleaned = 0; const need = 12;
  const c = $('minigame-container');
  c.innerHTML = '<h2 class="mg-title">Генеральная уборка</h2><p class="mg-desc">Тапай по пылинкам 💨 метёлкой!</p><div id="bacteria-area"><div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:60px;pointer-events:none">🧹</div></div><p class="mg-sub" id="cl-info">0 / ' + need + '</p>';
  let tLeft = 25; setHudTimer('25с');
  const tick = setInterval(()=>{
    tLeft--; setHudTimer(tLeft + 'с');
    if(tLeft <= 0){ clearInterval(tick); if(cleaned < need) endGame(false, 'Время вышло! Комната ещё не вся чистая.'); }
  }, 1000);
  activeIntervals.push(tick);
  const spawn = setInterval(()=>{
    const area = $('bacteria-area'); if(!area || !mgActive) return;
    const d = document.createElement('div');
    d.className = 'bacteria'; d.textContent = '💨';
    d.style.left = (rnd(80)+5) + '%'; d.style.top = (rnd(70)+10) + '%';
    d.onclick = ()=>{
      d.remove(); cleaned++; state.stats.heals++; setHudScore(cleaned);
      $('cl-info').textContent = cleaned + ' / ' + need;
      if(cleaned >= need){ activeIntervals.forEach(clearInterval); activeIntervals = []; endGame(true, 'Комната сияет чистотой! ✨', 70, 45, 1); }
    };
    area.appendChild(d);
    setTimeout(()=>{ if(d.parentNode) b.parentNode && b.remove(); }, 1600);
  }, 550);
  activeIntervals.push(spawn);
}

/* --- 20. Часы лекарства --- */
function initClock(){
  const hour = 2 + rnd(10);
  const leftPct = (hour-1)/11*84 + 8;
  let x = 0, dir = 1, tries = 3;
  const c = $('minigame-container');
  c.innerHTML = '<h2 class="mg-title">Приём по часам</h2><p class="mg-desc">Останови стрелку на ' + hour + ':00!</p>'
    + '<div class="slider-track"><div class="slider-target" style="left:' + leftPct + '%;width:10%"></div><div id="slider-thumb" class="slider-thumb"></div></div>'
    + '<button class="main-btn" onclick="stopClock()">Стоп!</button>'
    + '<div class="temp-hearts" id="clock-hearts">Попытки: ❤️❤️❤️</div>';
  x = 0; dir = 1; sliderActive = true;
  const animate = ()=>{
    if(!sliderActive || !mgActive) return;
    x += dir * 1.8;
    if(x > 100){ x = 100; dir = -1; }
    if(x < 0){ x = 0; dir = 1; }
    const t = $('slider-thumb'); if(t) t.style.left = x + '%';
    activeTimer = requestAnimationFrame(animate);
  };
  animate();
  window.stopClock = function(){
    if(!mgActive) return;
    sliderActive = false;
    if(x >= leftPct && x <= leftPct + 10) endGame(true, 'Принято точно по часам! ⏰', 75, 50, 1);
    else {
      tries--;
      if(tries <= 0) endGame(false, 'Три промаха! Лекарство принято не вовремя…');
      else {
        $('clock-hearts').textContent = 'Попытки: ' + '❤️'.repeat(tries) + '🖤'.repeat(3-tries);
        x = 0; dir = 1; sliderActive = true; animate();
      }
    }
  };
}

/* --- 21. Чистка зубов --- */
function initTeeth(){
  const c = $('minigame-container');
  c.innerHTML = '<h2 class="mg-title">Почисти зубки</h2><p class="mg-desc">Каждый зуб — 3 раза щёточкой! Успей за 25 секунд.</p><div class="teeth-grid" id="te-grid"></div>';
  let done = 0, tLeft = 25; setHudTimer('25с');
  const tick = setInterval(()=>{
    tLeft--; setHudTimer(tLeft + 'с');
    if(tLeft <= 0){ clearInterval(tick); if(done < 12) endGame(false, 'Время вышло! Не все зубки чистые.'); }
  }, 1000);
  activeIntervals.push(tick);
  for(let i=0;i<4;i++){
    let n = 0;
    const b = document.createElement('button');
    b.className = 'tooth'; b.textContent = '🦷';
    b.onclick = ()=>{
      n++; done++; setHudScore(done);
      if(n >= 3){ b.textContent = '✨'; b.disabled = true; }
      if(done >= 12){ activeIntervals.forEach(clearInterval); activeIntervals = []; endGame(true, 'Зубки блестят! 😁', 80, 50, 1); }
    };
    $('te-grid').appendChild(b);
  }
}

/* --- 22. Букет для мамы --- */
function initGarden(){
  let picked = 0; const need = 6;
  const c = $('minigame-container');
  c.innerHTML = '<h2 class="mg-title">Букет для мама</h2><p class="mg-desc">Собери 6 цветков 🌷. Пчёл 🐝 не трогай!</p><div id="bacteria-area"><div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:60px;pointer-events:none">🧺</div></div><p class="mg-sub" id="gd-info">0 / ' + need + '</p>';
  let tLeft = 30; setHudTimer('30с');
  const tick = setInterval(()=>{
    tLeft--; setHudTimer(tLeft + 'с');
    if(tLeft <= 0){ clearInterval(tick); if(picked < need) endGame(false, 'Время вышло! Букет не собран.'); }
  }, 1000);
  activeIntervals.push(tick);
  const spawn = setInterval(()=>{
    const area = $('bacteria-area'); if(!area || !mgActive) return;
    const bee = Math.random() < 0.2;
    const d = document.createElement('div');
    d.className = 'bacteria';
    d.textContent = bee ? '🐝' : '🌷';
    d.style.left = (rnd(80)+5) + '%'; d.style.top = (rnd(70)+10) + '%';
    d.onclick = ()=>{
      if(bee){ endGame(false, 'Ай! Пчела укусила… Букет собран не до конца.'); return; }
      d.remove(); picked++; setHudScore(picked);
      $('gd-info').textContent = picked + ' / ' + need;
      if(picked >= need){ activeIntervals.forEach(clearInterval); activeIntervals = []; endGame(true, 'Мама в восторге от букета! 💐', 80, 50, 1); }
    };
    area.appendChild(d);
    setTimeout(()=>{ if(d.parentNode) d.remove(); }, 1700);
  }, 650);
  activeIntervals.push(spawn);
}

/* --- 23. Восемь глотков --- */
function initWater(){
  let sips = 0; const need = 8;
  const c = $('minigame-container');
  c.innerHTML = '<h2 class="mg-title">Восемь глотков воды</h2><p class="mg-desc">Тапай кнопку и остановись ровно на ' + need + '!</p><p class="mg-sub" id="wt-count">💧 0 / ' + need + '</p><button class="main-btn" id="wt-btn" style="font-size:24px;padding:24px">🥤 Глоток!</button>';
  $('wt-btn').onclick = ()=>{
    sips++; setHudScore(sips);
    $('wt-count').textContent = '💧 ' + sips + ' / ' + need;
    if(sips === need) endGame(true, 'Ровно восемь глотков — как велел доктор! 💧', 70, 45, 1);
    else if(sips > need) endGame(false, 'Перебор! Глотков было ' + sips + ', а нужно ровно ' + need + '.');
  };
}

/* =================== РЕЕСТР МИНИ-ИГР =================== */
const MG = {
  aid:initAid, bacteria:()=>initBacteria(false), temp:initTemp, memory:initMemory,
  recipe:initRecipe, handwash:initHandwash, dosage:initDosage, breathing:initBreathing,
  vitamins:()=>initVitamins(false), quiz:initQuiz, sorting:initSorting, melody:initMelody,
  puzzle:initPuzzle, dayplan:initDayplan, target:initTarget, weather:initWeather,
  spotdiff:initSpotdiff, balloon:initBalloon, cleaning:initCleaning, clock:initClock,
  teeth:initTeeth, garden:initGarden, water:initWater, finale:mgFinale
};

/* =================== СВОБОДНАЯ ИГРА =================== */
const FREE_GAMES = [
  {id:'aid', name:'Аптечка 🩹'}, {id:'bacteria', name:'Бактерии 🦠'}, {id:'temp', name:'Термометр 🌡️'},
  {id:'memory', name:'Память 🧠'}, {id:'recipe', name:'Рецепт 🥗'}, {id:'handwash', name:'Мытьё рук 🧼'},
  {id:'dosage', name:'Дозировка 💊'}, {id:'breathing', name:'Дыхание 🌬️'}, {id:'vitamins', name:'Витамины 🍎'},
  {id:'quiz', name:'Викторина 🤓'}, {id:'sorting', name:'Сортировка 🧺'}, {id:'melody', name:'Мелодия 🎵'},
  {id:'puzzle', name:'Мозаика 🌸'}, {id:'dayplan', name:'Режим дня ⏰'}, {id:'target', name:'Реакция 🎯'},
  {id:'weather', name:'Погода ☂️'}, {id:'spotdiff', name:'Найди лишнее 👀'}, {id:'balloon', name:'Шарики 🎈'},
  {id:'cleaning', name:'Уборка 🧹'}, {id:'clock', name:'Часы лекарства ⏰'}, {id:'teeth', name:'Зубки 🦷'},
  {id:'garden', name:'Букет 💐'}, {id:'water', name:'Глотки 💧'}
];
function renderFreePlay(){
  const list = $('freeplay-list');
  if(!list) return;
  list.innerHTML = '';
  FREE_GAMES.forEach(g=>{
    const btn = document.createElement('button');
    btn.className = 'main-btn';
    btn.textContent = g.name;
    btn.onclick = ()=>{ isStoryMode = false; curCh = null; startMinigame(g.id); };
    list.appendChild(btn);
  });
}

/* =================== МАГАЗИН =================== */
let shopTab = 'up';
function setShopTab(tab){
  shopTab = tab;
  ['up','boost','packs'].forEach(t=>$('tab-'+t).classList.toggle('active', t === tab));
  renderShop();
}
function shopRow(label, price, onBuy){
  const div = document.createElement('div');
  div.className = 'shop-item';
  div.innerHTML = '<div><b>' + label + '</b><br><small>Цена: ' + price + ' 🪙</small></div>';
  const btn = document.createElement('button');
  btn.className = 'main-btn small';
  btn.textContent = 'Купить';
  btn.onclick = onBuy;
  div.appendChild(btn);
  return div;
}
function renderShop(){
  const list = $('shop-list');
  if(!list) return;
  list.innerHTML = '';
  if(shopTab === 'up'){
    [
      {id:'energy', name:'⚡ Макс. энергия +1', desc:'Больше ходов за день', price:50*state.maxEnergy},
      {id:'coin', name:'🪙 Множитель монет +1', desc:'Больше монет с игр', price:100*state.coinMult},
      {id:'regen', name:'⏱ Быстрый реген', desc:'Энергия копится быстрее', price:80*state.energyRegenMin},
      {id:'luck', name:'🍀 Удача +1', desc:'+10% к монетам', price:150*(state.luck+1)}
    ].forEach(u=>{
      list.appendChild(shopRow(u.name + '<br><small>' + u.desc + '</small>', u.price, ()=>buyUpgrade(u.id, u.price)));
    });
  }
  if(shopTab === 'boost'){
    [
      {id:'x2', name:'🪙 Монеты ×2 на 30 мин', desc:'Удвоенный доход', price:60},
      {id:'skip', name:'💊 Пропуск мини-игры', desc:'Мгновенная победа', price:40},
      {id:'energy3', name:'⚡ +3 энергии сейчас', desc:'Мгновенно', price:50}
    ].forEach(b=>{
      list.appendChild(shopRow(b.name + '<br><small>' + b.desc + '</small>', b.price, ()=>buyBooster(b.id, b.price)));
    });
  }
  if(shopTab === 'packs'){
    [
      {id:'starter', name:'🎒 Стартовый набор', desc:'100 🪙 + 1 💊 пропуск', price:150, apply:()=>{ state.coins += 100; state.stats.earned += 100; state.boosters.skips++; }},
      {id:'premium', name:'👑 Премиум-набор', desc:'Тема Карамелька 🍬 + 5 💎', price:0, care:20, apply:()=>{ if(!state.unlockedThemes.includes('caramel')) state.unlockedThemes.push('caramel'); state.crystals += 5; }},
      {id:'family', name:'👨‍👩‍👧 Семейный набор', desc:'300 🪙 + 3 💎 + 2 💊', price:400, apply:()=>{ state.coins += 300; state.stats.earned += 300; state.crystals += 3; state.boosters.skips += 2; }}
    ].forEach(p=>{
      const div = document.createElement('div');
      div.className = 'shop-item';
      div.innerHTML = '<div><b>' + p.name + '</b><br><small>' + p.desc + ' · ' + (p.care ? p.care + ' 💝' : p.price + ' 🪙') + '</small></div>';
      const btn = document.createElement('button');
      btn.className = 'main-btn small';
      btn.textContent = 'Купить';
      btn.onclick = ()=>{
        if(p.care){
          if(state.care >= p.care){ state.care -= p.care; p.apply(); toast('Набор куплен!', '👑'); }
          else toast('Не хватает очков заботы!', '💝');
        } else {
          if(state.coins >= p.price){ state.coins -= p.price; p.apply(); toast('Набор куплен!', '🎒'); }
          else toast('Мало монет!', '🪙');
        }
        updateUI();
      };
      div.appendChild(btn);
      list.appendChild(div);
    });
  }
}
function buyUpgrade(id, price){
  if(state.coins < price){ toast('Мало монет!', '🪙'); return; }
  state.coins -= price;
  if(id === 'energy') state.maxEnergy++;
  if(id === 'coin') state.coinMult++;
  if(id === 'regen') state.energyRegenMin = Math.max(1, state.energyRegenMin - 2);
  if(id === 'luck') state.luck++;
  toast('Улучшение куплено!', '✨');
  updateUI();
}
function buyBooster(id, price){
  if(state.coins < price){ toast('Мало монет!', '🪙'); return; }
  state.coins -= price;
  if(id === 'x2') state.boosters.x2until = Date.now() + 30*60000;
  if(id === 'skip') state.boosters.skips++;
  if(id === 'energy3'){ state.energy = Math.min(state.maxEnergy, state.energy + 3); state.lastEnergyTs = Date.now(); }
  toast('Бустер куплен!', '✨');
  updateUI();
}

/* =================== ЗАДАНИЯ И ПОДАРКИ =================== */
const DAILY_POOL = [
  {id:1, text:'Сыграй 3 мини-игры', type:'game', target:3, reward:50},
  {id:2, text:'Заработай 100 монет', type:'coins', target:100, reward:60},
  {id:3, text:'Пройди 1 главу сюжета', type:'chapter', target:1, reward:80},
  {id:4, text:'Победи 10 бактерий', type:'bugs', target:10, reward:50},
  {id:5, text:'Прочитай статью энциклопедии', type:'read', target:1, reward:40},
  {id:6, text:'Победи 2 боссов', type:'boss', target:2, reward:100}
];
const GIFTS = [
  {coins:20,  crystals:0, energy:1, label:'День 1: 20 🪙 + 1 ⚡'},
  {coins:30,  crystals:1, energy:1, label:'День 2: 30 🪙 + 1 💎 + 1 ⚡'},
  {coins:40,  crystals:1, energy:2, label:'День 3: 40 🪙 + 1 💎 + 2 ⚡'},
  {coins:50,  crystals:2, energy:2, label:'День 4: 50 🪙 + 2 💎 + 2 ⚡'},
  {coins:100, crystals:3, energy:5, label:'День 5: 100 🪙 + 3 💎 + 5 ⚡ 🎉'}
];
function checkDailyReset(){
  const today = new Date().toDateString();
  if(state.lastPlayed !== today){
    if(state.lastPlayed){
      const y = new Date(); y.setDate(y.getDate() - 1);
      state.streak = (state.lastPlayed === y.toDateString()) ? state.streak + 1 : 1;
    } else state.streak = 1;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    state.lastPlayed = today;
    state.dailyDay = (state.dailyDay + 1) % 1000;
    state.dailyTasks = shuffle(DAILY_POOL.slice()).slice(0,3).map(t=>({id:t.id, text:t.text, type:t.type, target:t.target, current:0, reward:t.reward, done:false}));
    saveGame();
  }
}
function progressTask(type, amount){
  let changed = false;
  state.dailyTasks.forEach(t=>{
    if(t.done || t.type !== type) return;
    if(t.current < t.target){ t.current = Math.min(t.target, t.current + amount); changed = true; }
  });
  if(changed && $('screen-daily').classList.contains('active')) renderDailyTasks();
}
function renderDailyTasks(){
  const list = $('daily-tasks-list');
  if(!list) return;
  list.innerHTML = '';
  $('ui-streak').textContent = state.streak;
  $('ui-best-streak').textContent = state.bestStreak;
  /* Исправление: подарок обновляется всегда, даже если заданий нет */
  const giftReady = state.giftDate !== new Date().toDateString();
  const g = GIFTS[Math.min(state.giftDay, 4)];
  $('gift-info').textContent = giftReady ? 'Сегодня: ' + g.label : 'Подарок уже забран — приходи завтра!';
  const gbtn = $('gift-btn');
  gbtn.disabled = !giftReady;
  gbtn.style.opacity = giftReady ? '1' : '.5';
  if(!state.dailyTasks || !state.dailyTasks.length){
    list.innerHTML = '<div class="task-item"><div><b>Заданий пока нет</b><br><small>Играй — и мама даст задания!</small></div></div>';
    return;
  }
  state.dailyTasks.forEach(t=>{
    const ready = t.current >= t.target;
    const div = document.createElement('div');
    div.className = 'task-item' + (t.done ? ' done' : '');
    div.innerHTML = '<div><b>' + t.text + '</b><br><small>' + t.current + '/' + t.target + (t.done ? ' · забрано' : '') + '</small></div>';
    if(t.done){
      div.innerHTML += '<span>✅</span>';
    } else {
      const btn = document.createElement('button');
      btn.className = 'main-btn small';
      btn.textContent = 'Забрать';
      btn.disabled = !ready;
      btn.onclick = ()=>claimTask(t.id);
      div.appendChild(btn);
    }
    list.appendChild(div);
  });
}
function claimTask(id){
  const t = state.dailyTasks.find(x=>x.id === id);
  if(!t || t.done) return;
  if(t.current < t.target){ toast('Задание ещё не выполнено!', '⏳'); return; }
  t.done = true;
  addCoins(t.reward);
  confetti(15);
  toast('Задание выполнено! +' + t.reward + ' 🪙', '📅');
  checkAchievements();
  updateUI();
}
function claimGift(){
  if(state.giftDate === new Date().toDateString()){ toast('Подарок уже забран!', '🎁'); return; }
  const g = GIFTS[Math.min(state.giftDay, 4)];
  addCoins(g.coins);
  state.crystals += g.crystals;
  state.energy = Math.min(state.maxEnergy, state.energy + g.energy);
  state.giftDay = (state.giftDay + 1) % 5;
  state.giftDate = new Date().toDateString();
  confetti(20);
  toast('Подарок получен: +' + g.coins + ' 🪙 +' + g.crystals + ' 💎 +' + g.energy + ' ⚡', '🎁');
  checkAchievements();
  updateUI();
}
/* =================== ДОСТИЖЕНИЯ =================== */
const ACH = [
  {id:'first', name:'Первый шаг', desc:'Сыграй 1 игру', check:s=>s.stats.games >= 1},
  {id:'healer', name:'Целитель', desc:'Пройди 5 глав', check:s=>s.chapter >= 5},
  {id:'doctor2', name:'Половина пути', desc:'Пройди 15 глав', check:s=>s.chapter >= 15},
  {id:'finale', name:'Полное выздоровление', desc:'Пройди весь сюжет', check:s=>s.storyDone},
  {id:'rich', name:'Богач', desc:'Накопи 1000 монет', check:s=>s.coins >= 1000},
  {id:'tycoon', name:'Магнат', desc:'Заработай 5000 всего', check:s=>s.stats.earned >= 5000},
  {id:'clean', name:'Чистюля', desc:'10 обработок', check:s=>s.stats.heals >= 10},
  {id:'bugslayer', name:'Гроза бактерий', desc:'Победи 50 бактерий', check:s=>s.stats.bugs >= 50},
  {id:'boss1', name:'Палач боссов', desc:'Победи 1 босса', check:s=>s.stats.bossWins >= 1},
  {id:'boss3', name:'Кошмар боссов', desc:'Победи 3 боссов', check:s=>s.stats.bossWins >= 3},
  {id:'streak7', name:'Неделя заботы', desc:'Стрик 7 дней', check:s=>s.bestStreak >= 7},
  {id:'scholar', name:'Учёный', desc:'Прочти все статьи', check:s=>s.encyclopediaRead.length >= 5},
  {id:'collector', name:'Коллекционер', desc:'3 награды заботы', check:s=>s.careUnlocks.length >= 3}
];
function renderAchievements(){
  const list = $('achievements-list');
  if(!list) return;
  list.innerHTML = '';
  ACH.forEach(a=>{
    const unlocked = state.achievements.includes(a.id);
    const div = document.createElement('div');
    div.className = 'ach-item' + (unlocked ? '' : ' locked');
    div.innerHTML = '<div><b>' + a.name + '</b><br><small>' + a.desc + '</small></div><span>' + (unlocked ? '🏆' : '🔒') + '</span>';
    list.appendChild(div);
  });
}

/* =================== ЭНЦИКЛОПЕДИЯ =================== */
const ENCYCLOPEDIA = [
  {icon:'🧼', title:'Как мыть руки',
   body:'Намочи руки тёплой водой.\nНамыль 20 секунд — можно спеть песенку «С днём рождения»!\nПромой между пальцами и под ногтями.\nВытри чистым полотенцем.\n\nМой руки перед едой, после улицы и после туалета!',
   quote:'«Чистые руки — лучший щит от микробов!» — Доктор Плюшкин'},
  {icon:'🌡️', title:'Что делать при температуре',
   body:'Скажи взрослым сразу.\nПей больше тёплой воды и морса.\nЛежи и отдыхай — организм борется!\nНе кутайся слишком сильно.\n\nВзрослые дадут лекарство, если нужно.',
   quote:'«Отдых и вода — первые лекарства.» — Мама'},
  {icon:'🍎', title:'Витамины и еда',
   body:'Яблоки и морковь — для силы и зрения.\nЯгоды — витамин C для иммунитета.\nМолоко и творог — крепкие косточки.\nПей воду каждый день!\n\nСладкое — иногда, а овощи — всегда.',
   quote:'«Яркая тарелка — здоровый животик!» — Медсестра Света'},
  {icon:'🩹', title:'Ранки и пластыри',
   body:'Промой ранку чистой водой.\nОбработай антисептиком (может слегка щипать — это нормально).\nНаклей пластырь — он защитит от грязи.\nМеняй пластырь каждый день.',
   quote:'«Пластырь — маленький щит для ранки.» — Медсестра Света'},
  {icon:'😴', title:'Зачем нужен сон',
   body:'Во сне организм «чинит сам себя».\nРастут мышцы и крепнет память.\nСпать нужно 9–11 часов.\nЛожись в одно и то же время — так проще засыпать.',
   quote:'«Во сне организм чинит сам себя.» — Кот Мурзик'}
];
function renderEncyclopedia(){
  const list = $('enc-list');
  if(!list) return;
  list.innerHTML = '';
  ENCYCLOPEDIA.forEach((art, i)=>{
    const read = state.encyclopediaRead.includes(i);
    const div = document.createElement('div');
    div.className = 'enc-item' + (read ? ' read' : '');
    div.innerHTML = '<div><b>' + art.icon + ' ' + art.title + (read ? ' ✅' : '') + '</b><br><small>Нажми, чтобы прочитать</small></div><span>' + (read ? '📖' : '🔒') + '</span>';
    div.onclick = ()=>readArticle(i);
    list.appendChild(div);
  });
}
function readArticle(i){
  const art = ENCYCLOPEDIA[i];
  showModal(art.icon + ' ' + art.title, art.body, art.quote);
  if(!state.encyclopediaRead.includes(i)){
    state.encyclopediaRead.push(i);
    addCare(1);
    progressTask('read', 1);
    renderEncyclopedia();
    checkAchievements();
    updateUI();
  }
}

/* =================== НАГРАДЫ ЗАБОТЫ =================== */
const CARE_REWARDS = [
  {id:'sticker',    name:'🌸 Наклейка «Смелость»',  cost:5,  desc:'Первая награда за заботу'},
  {id:'bg_garden',  name:'🌿 Фон «Сад»',             cost:15, desc:'Меню зацветёт цветами'},
  {id:'bow',        name:'🎀 Бантик для Арины',      cost:25, desc:'Аринка будет носить бантик'},
  {id:'bell',       name:'🔔 Волшебный колокольчик', cost:35, desc:'+12 конфетти к каждой победе'},
  {id:'theme_gold', name:'👑 Тема «Золото»',         cost:50, desc:'Откроет тему в настройках'}
];
function renderCareRewards(){
  const list = $('rewards-list');
  if(!list) return;
  list.innerHTML = '';
  $('rewards-care').textContent = state.care;
  CARE_REWARDS.forEach(r=>{
    const owned = state.careUnlocks.includes(r.id);
    const div = document.createElement('div');
    div.className = 'ach-item' + (owned ? '' : ' locked');
    div.innerHTML = '<div><b>' + r.name + '</b><br><small>' + r.desc + ' · ' + r.cost + ' 💝</small></div><span>' + (owned ? '✅' : '🔒') + '</span>';
    if(!owned){
      div.style.cursor = 'pointer';
      div.onclick = ()=>{
        if(state.care >= r.cost){
          state.care -= r.cost;
          state.careUnlocks.push(r.id);
          if(r.id === 'theme_gold' && !state.unlockedThemes.includes('gold')) state.unlockedThemes.push('gold');
          confetti(20);
          toast('Награда получена: ' + r.name, '💝');
          updateUI();
        } else toast('Не хватает ' + (r.cost - state.care) + ' очков заботы', '💝');
      };
    }
    list.appendChild(div);
  });
}

/* =================== РЕКОРДЫ =================== */
const RIVAL_NAMES = ['Кот Мурзик', 'Доктор Плюшкин', 'Медсестра Света', 'Мама'];
function renderRecords(){
  const list = $('records-list');
  if(!list) return;
  list.innerHTML = '';
  const rows = [{name: state.name + ' (ты)', score: state.scores[0] || 0, me:true}];
  RIVAL_NAMES.forEach((n, i)=>rows.push({name:n, score: Math.max(3, 18 - i*4), me:false}));
  rows.sort((a,b)=>b.score - a.score);
  rows.forEach((r, i)=>{
    const div = document.createElement('div');
    div.className = 'ach-item' + (r.me ? '' : ' locked');
    div.innerHTML = '<div><b>' + (i+1) + '. ' + r.name + '</b><br><small>очков: ' + r.score + '</small></div><span>' + (r.me ? '🥇' : '🙂') + '</span>';
    list.appendChild(div);
  });
}
function startRecord(){
  if(state.energy <= 0){ toast('Нет энергии!', '⚡'); return; }
  isStoryMode = false; curCh = null;
  spendEnergy();
  lastMg = 'vitamins';
  updateUI();
  cleanupMinigame();
  mgActive = true;
  initVitamins(true);
  showScreen('screen-game');
}

/* =================== ДРУЗЬЯ =================== */
function initRef(){
  if(!state.referral.code){
    state.referral.code = 'ARINA-' + (1000 + rnd(9000));
    saveGame();
  }
  $('ref-code').textContent = state.referral.code;
  $('ref-used').style.display = state.referral.used ? 'block' : 'none';
}
function copyRef(){
  if(navigator.clipboard){
    navigator.clipboard.writeText(state.referral.code)
      .then(()=>toast('Код скопирован!', '📋'))
      .catch(()=>toast('Твой код: ' + state.referral.code, '📋'));
  } else toast('Твой код: ' + state.referral.code, '📋');
}
function submitRef(){
  const val = $('ref-input').value.trim().toUpperCase();
  if(state.referral.used){ toast('Код уже использован!', '💌'); return; }
  if(val && val.startsWith('ARINA-') && val !== state.referral.code){
    state.referral.used = true;
    addCoins(20);
    $('ref-input').value = '';
    toast('Код принят! +20 🪙 тебе и подруге!', '💌');
    updateUI();
  } else toast('Неверный код!', '❌');
}

/* =================== СРОЧНЫЙ ВЫЗОВ =================== */
const URGENT_GAMES = ['bacteria','temp','target'];
function checkUrgent(){
  const now = Date.now();
  const banner = $('urgent-banner');
  if(!banner) return;
  if(state.urgent.end && now < state.urgent.end){
    banner.style.display = 'flex';
    updateUrgentTimer();
    return;
  }
  if(state.urgent.end && now >= state.urgent.end){
    state.urgent.end = 0;
    banner.style.display = 'none';
    return;
  }
  if(now >= state.urgent.next){
    state.urgent.end = now + 10*60000;
    state.urgent.next = now + 24*3600*1000;
    saveGame();
    banner.style.display = 'flex';
    updateUrgentTimer();
    toast('Срочный вызов! У тебя 10 минут!', '🚨');
  } else banner.style.display = 'none';
}
function updateUrgentTimer(){
  const el = $('urgent-timer');
  if(!el || !state.urgent.end) return;
  const left = Math.max(0, Math.floor((state.urgent.end - Date.now())/1000));
  if(left <= 0){
    $('urgent-banner').style.display = 'none';
    state.urgent.end = 0;
    saveGame();
    return;
  }
  el.textContent = Math.floor(left/60) + ':' + String(left%60).padStart(2,'0');
}
function playUrgent(){
  if(!state.urgent.end || Date.now() > state.urgent.end){ toast('Вызов уже закончился!', '🚨'); return; }
  isStoryMode = false; curCh = null;
  urgentRun = true;
  startMinigame(pick(URGENT_GAMES));
}

/* =================== СЕКРЕТЫ И ТАПЫ =================== */
const SECRET_CODES = {ARINA:'code_arina'};
const SECRETS = [
  {id:'shadow',     name:'Кто под шляпой?',  hint:'5 раз дотронься до тени под Аринкой'},
  {id:'coins',      name:'Золотая монетка',  hint:'10 раз дотронься до монетки в панели'},
  {id:'cat',        name:'Кошачья нежность', hint:'10 раз погладь кота Мурзика'},
  {id:'code_arina', name:'Волшебное слово',  hint:'Введи код ARINA в настройках'},
  {id:'welcome',    name:'Звёздный вход',    hint:'5 раз коснись Арины на заставке'}
];
const CAT_PHRASES = [
  'Мур-р-р! Приятно!',
  'Мяу! Погладь ещё!',
  'Мур! А ты хороша!',
  'Мяу-мяу! Мне нравится!',
  'Мур-р! Я самый счастливый кот!'
];
function unlockSecret(id){
  if(state.secrets[id]) return;
  state.secrets[id] = true;
  state.crystals += 3;
  const s = SECRETS.find(x=>x.id === id);
  toast('Секрет найден: ' + s.name + '! +3 💎', '🕵️');
  saveGame();
}
function tapShadow(){ state.taps.shadow++; if(state.taps.shadow >= 5) unlockSecret('shadow'); }
function tapCoins(){ state.taps.coins++; if(state.taps.coins >= 10) unlockSecret('coins'); }
function tapCat(){
  state.taps.cat++;
  if(state.taps.cat >= 10) unlockSecret('cat');
  toast(pick(CAT_PHRASES), '🐱');
}
function tapWelcome(){ state.taps.welcome++; if(state.taps.welcome >= 5) unlockSecret('welcome'); }
function enterCode(){
  const val = $('code-input').value.trim().toUpperCase();
  if(SECRET_CODES[val]){ unlockSecret(SECRET_CODES[val]); $('code-input').value = ''; }
  else toast('Код не подошёл…', '❌');
}
function renderSecrets(){
  const list = $('secrets-list');
  if(!list) return;
  list.innerHTML = '';
  SECRETS.forEach(s=>{
    const found = !!state.secrets[s.id];
    const div = document.createElement('div');
    div.className = 'ach-item' + (found ? '' : ' locked');
    div.innerHTML = '<div><b>' + (found ? s.name : '???') + '</b><br><small>' + (found ? 'Найден!' : s.hint) + '</small></div><span>' + (found ? '⭐' : '🔍') + '</span>';
    list.appendChild(div);
  });
}

/* =================== НАСТРОЙКИ =================== */
function renderThemes(){
  const grid = $('theme-buttons');
  if(!grid) return;
  grid.innerHTML = '';
  THEMES.forEach(t=>{
    const locked = !state.unlockedThemes.includes(t.id);
    const btn = document.createElement('button');
    btn.className = 'tab-btn';
    btn.textContent = t.label + (locked ? ' 🔒' : '');
    btn.classList.toggle('active', !state.themeAuto && state.theme === t.id);
    btn.onclick = ()=>{
      if(locked){
        toast(t.id === 'caramel' ? 'Тема продаётся в наборе «Премиум»' : t.id === 'gold' ? 'Тема открывается за очки заботы 💝' : 'Тема заблокирована', '🔒');
        return;
      }
      state.theme = t.id;
      state.themeAuto = false;
      toast('Тема изменена!', '🎨');
      updateUI();
    };
    grid.appendChild(btn);
  });
  $('auto-theme-btn').textContent = '🌗 Авто-тема: ' + (state.themeAuto ? 'ВКЛ' : 'ВЫКЛ');
}
function toggleThemeAuto(){
  state.themeAuto = !state.themeAuto;
  toast(state.themeAuto ? 'Авто-тема включена' : 'Авто-тема выключена', '🌗');
  updateUI();
}
function saveName(){
  const v = $('name-input').value.trim();
  if(v){
    state.name = v.slice(0, 16);
    toast('Имя сохранено, ' + state.name + '!', '✨');
    updateUI();
  }
}
function exportSave(){
  if(navigator.clipboard){
    navigator.clipboard.writeText(JSON.stringify(state))
      .then(()=>toast('Прогресс скопирован!', '💾'))
      .catch(()=>toast('Не удалось скопировать', '❌'));
  } else toast('Буфер обмена недоступен', '❌');
}
function resetProgress(){
  if(confirm('Сбросить весь прогресс? Это нельзя отменить!')){
    localStorage.removeItem(SAVE_KEY);
    location.reload();
  }
}

/* =================== ОТДЫХ =================== */
function claimRest(){
  const now = Date.now();
  const cd = 30*60000;
  if(now < (state.lastRestTs||0) + cd){
    toast('Аринка ещё отдыхает! Осталось ' + Math.ceil(((state.lastRestTs||0)+cd-now)/60000) + ' мин.', '💤');
    return;
  }
  state.lastRestTs = now;
  const amount = Math.min(2, state.maxEnergy - state.energy);
  state.energy += amount;
  state.lastEnergyTs = now;
  toast('Аринка подремала: +' + amount + ' ⚡', '💤');
  updateUI();
}
function updateRestBtn(){
  const btn = $('btn-rest');
  if(!btn) return;
  const now = Date.now();
  const cd = 30*60000;
  const ready = now >= (state.lastRestTs||0) + cd;
  btn.textContent = ready ? '💤 Отдохнуть (+2 ⚡)' : '💤 Отдых… ' + Math.ceil(((state.lastRestTs||0)+cd-now)/60000) + ' мин';
  btn.disabled = !ready;
}

/* =================== ЛЕПЕСТКИ В МЕНЮ =================== */
let petalTimer = null;
function startPetals(){
  if(petalTimer) return;
  petalTimer = setInterval(()=>{
    if(!$('screen-menu').classList.contains('active')) return;
    const layer = $('petals-layer');
    if(!layer || layer.children.length > 14) return;
    const p = document.createElement('span');
    p.className = 'petal';
    p.textContent = pick(['🌸','🌷','🌼','🍃']);
    p.style.left = (Math.random()*96+2) + '%';
    p.style.fontSize = (14+Math.random()*14) + 'px';
    p.style.animationDuration = (6+Math.random()*5) + 's';
    layer.appendChild(p);
    setTimeout(()=>p.remove(), 13000);
  }, 900);
}

/* =================== ОБНОВЛЕНИЕ UI =================== */
function updateUI(){
  $('ui-coins').textContent = state.coins;
  $('ui-crystals').textContent = state.crystals;
  $('ui-care').textContent = state.care;
  $('ui-energy').textContent = state.energy;
  $('ui-maxenergy').textContent = state.maxEnergy;
  $('ui-chapter').textContent = state.storyDone ? 'Финал' : state.chapter;
  $('ui-level-text').textContent = 'Уровень ' + state.level;
  $('ui-exp-fill').style.width = Math.min(100, state.exp/(state.level*100)*100) + '%';
  $('ui-avatar').textContent = arinaEmoji();
  $('ui-bow').style.display = state.careUnlocks.includes('bow') ? 'block' : 'none';
  $('stat-games').textContent = state.stats.games;
  $('stat-bugs').textContent = state.stats.bugs;
  $('stat-heals').textContent = state.stats.heals;
  $('stat-boss').textContent = state.stats.bossWins;
  $('stat-urgent').textContent = state.stats.urgentDone;
  $('stat-earned').textContent = state.stats.earned;
  updateRestBtn();
  checkDailyReset();
  applyTheme();
  checkUrgent();
  saveGame();
}

/* =================== МУЗЫКА (2 ТРЕКА ПО ОЧЕРЕДИ) =================== */
let musicOn = false, musicCur = null, musicFadeTimer = null;

function musicStart(){
  if(musicCur && !musicCur.paused) return;
  const a = $('music-a'), b = $('music-b');
  a.volume = 0;
  musicCur = a;
  musicCur.play().catch(()=>{});
  fadeTo(musicCur, 0.35, 1500);
  musicOn = true;
  $('music-btn').textContent = '🔊';
}
function fadeTo(audio, target, ms){
  if(musicFadeTimer) clearInterval(musicFadeTimer);
  const steps = 20, delta = (target - audio.volume) / steps;
  let n = 0;
  musicFadeTimer = setInterval(()=>{
    audio.volume = Math.max(0, Math.min(1, audio.volume + delta));
    if(++n >= steps) clearInterval(musicFadeTimer);
  }, ms / steps);
}
function toggleMusic(){
  if(!musicOn){
    musicStart();
    toast('Музыка включена', '🎵');
  } else {
    /* Исправление: гасим оба трека одним таймером, а не двумя */
    const a = $('music-a'), b = $('music-b');
    if(musicFadeTimer) clearInterval(musicFadeTimer);
    const steps = 10;
    let n = 0;
    musicFadeTimer = setInterval(()=>{
      a.volume = Math.max(0, a.volume - 0.35/steps);
      b.volume = Math.max(0, b.volume - 0.35/steps);
      if(++n >= steps){
        clearInterval(musicFadeTimer);
        a.pause(); b.pause();
        a.currentTime = 0; b.currentTime = 0;
        musicCur = null;
      }
    }, 500 / steps);
    musicOn = false;
    $('music-btn').textContent = '🔇';
  }
}
function initMusicCycle(){
  const a = $('music-a'), b = $('music-b');
  a.addEventListener('timeupdate', ()=>{
    if(musicOn && musicCur === a && a.duration && a.currentTime > a.duration - 2) switchTo(b);
  });
  b.addEventListener('timeupdate', ()=>{
    if(musicOn && musicCur === b && b.duration && b.currentTime > b.duration - 2) switchTo(a);
  });
}
function switchTo(next){
  const prev = musicCur;
  if(!prev || prev === next) return;
  fadeTo(prev, 0, 1800);
  next.currentTime = 0;
  next.volume = 0;
  next.play().catch(()=>{});
  setTimeout(()=>fadeTo(next, 0.35, 1800), 300);
  musicCur = next;
  setTimeout(()=>{ if(musicCur !== prev) prev.pause(); }, 2000);
}

/* =================== ФОТО АРИНКИ В ДИАЛОГАХ =================== */
const ARINA_PHOTOS = ['npc_arina.png','npc_arina.jpg','npc_arina.jpeg','arina.png','arina.jpg'];
let arinaPhoto = null;
function loadArinaPhoto(){
  const probe = new Image();
  let i = 0;
  const next = ()=>{
    if(i >= ARINA_PHOTOS.length) return;
    probe.onerror = next;
    probe.src = ARINA_PHOTOS[i] + '?v=' + Date.now();
    i++;
  };
  probe.onload = ()=>{ arinaPhoto = probe.src.split('?')[0]; };
  next();
}
function setCharPhoto(who){
  const img = $('char-img'), emoji = $('char-emoji');
  if(!img || !emoji) return;
  if(who === 'arina' && arinaPhoto){
    if(img.getAttribute('src') !== arinaPhoto) img.src = arinaPhoto;
    img.style.display = 'block';
    img.style.opacity = '1';
    img.style.filter = 'none';
    emoji.style.display = 'none';
  } else {
    img.style.display = 'none';
    emoji.style.display = 'block';
  }
}

/* =================== ЗАПУСК =================== */
function closeWelcome(){
  const w = $('welcome-screen');
  if(!w || w.classList.contains('hidden')) return;
  w.classList.add('hidden');
  setTimeout(()=>{ w.style.display = 'none'; }, 700);
}
window.addEventListener('load', ()=>{
  regenEnergy();
  checkDailyReset();
  initRef();
  $('name-input').value = state.name === 'Игрок' ? '' : state.name;
  loadSmartImg('avatar-photo', ['arina.jpg','arina.jpeg','arina.png']);
  loadSmartImg('doctor-photo', ['welcome_doctor.jpg','welcome_doctor.jpeg','welcome_doctor.png']);
  updateUI();
  setInterval(updateRestBtn, 15000);
  initMusicCycle();
  loadArinaPhoto();
  const startMusic = ()=>{
    if(!musicOn) musicStart();
    document.removeEventListener('pointerdown', startMusic);
  };
  document.addEventListener('pointerdown', startMusic);
  startPetals();
  setTimeout(closeWelcome, 6000);
});

/* =================== УМНАЯ ЗАГРУЗКА ФОТО =================== */
function loadSmartImg(imgId, variants){
  const img = $(imgId);
  if(!img || img.dataset.tried) return;
  img.dataset.tried = '1';
  let i = 0;
  const next = ()=>{
    if(i >= variants.length){ img.style.display = 'none'; return; }
    img.onerror = next;
    img.src = variants[i] + '?v=' + Date.now();
    i++;
  };
  img.onload = ()=>{
    img.style.display = 'block';
    const twin = imgId === 'avatar-photo' ? $('ui-avatar') : $('welcome-emoji-txt');
    if(twin) twin.style.display = 'none';
  };
  next();
}
