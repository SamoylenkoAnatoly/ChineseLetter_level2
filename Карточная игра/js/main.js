document.addEventListener('DOMContentLoaded',()=>{
  Sound.init(); UI.init(); Game.onEvent=(type,data)=>UI.onGameEvent(type,data);
  const $=id=>document.getElementById(id);
  const syncSound=()=>{
    $('btn-sound-menu').textContent=Sound.enabled?'♪ Звук: вкл':'♪ Звук: выкл';
    $('btn-sound-game').textContent=Sound.enabled?'♪':'♪̸';
  };
  syncSound();
  $('btn-sound-menu').addEventListener('click',()=>{ Sound.toggle(); syncSound(); });
  $('btn-sound-game').addEventListener('click',()=>{ Sound.toggle(); syncSound(); });
  const start=level=>{
    UI.lastDifficulty=level; UI.cancelTarget(); UI.showScreen('screen-game');
    UI.el('match-timer').textContent='10:00';
    UI.el('match-timer').classList.remove('low');
    const portraits={easy:'♟',normal:'♜',hard:'♛'};
    const names={easy:'Пьяный крестьянин',normal:'Хозяин таверны',hard:'Дракон-шинобист'};
    $('enemy-portrait').textContent=portraits[level];
    $('enemy-hero').querySelector('.hero-name').textContent=names[level];
    Game.start(level);
    UI.toast('Перетащи карту на стол или коснись карты и ячейки. Ответь на вопрос!');
  };
  $('btn-easy').addEventListener('click',()=>start('easy'));
  $('btn-normal').addEventListener('click',()=>start('normal'));
  $('btn-hard').addEventListener('click',()=>start('hard'));
  $('btn-end-turn').addEventListener('click',()=>{
    if (!Game.state?.active || Game.state.turn!=='player' || Game.state.busy || UI.question) return;
    UI.cancelTarget(); Game.endPlayerTurn();
  });
  $('btn-concede').addEventListener('click',()=>{
    if (Game.state?.active && confirm('Сдаться и завершить матч?')) Game.finish('enemy','Ты сдался');
  });
  $('btn-help').addEventListener('click',()=>$('help-modal').classList.remove('hidden'));
  $('btn-help-game').addEventListener('click',()=>$('help-modal').classList.remove('hidden'));
  $('btn-help-close').addEventListener('click',()=>$('help-modal').classList.add('hidden'));
  $('btn-stats').addEventListener('click',()=>UI.showStats());
  $('btn-stats-back').addEventListener('click',()=>UI.showScreen('screen-menu'));
  $('btn-stats-reset').addEventListener('click',()=>{ if (confirm('Стереть всю статистику обучения?')) { Storage.reset(); UI.showStats(); } });
  $('btn-again').addEventListener('click',()=>start(UI.lastDifficulty));
  $('btn-menu').addEventListener('click',()=>UI.showScreen('screen-menu'));
});
