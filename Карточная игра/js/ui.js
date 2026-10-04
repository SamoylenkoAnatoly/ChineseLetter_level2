const UI = {
  selectedAttack:null, selectedCard:null, pendingSpell:null, drag:null, question:null, qTimeout:null, qDone:false, questionStartedAt:0, attackPointer:null,
  lastDifficulty:'normal',
  el(id) { return document.getElementById(id); },
  showScreen(id) {
    document.querySelectorAll('.screen').forEach(el=>el.classList.toggle('active',el.id===id));
  },
  toast(text,kind='') {
    const el=document.createElement('div'); el.className='toast '+kind; el.textContent=text;
    this.el('toasts').appendChild(el);
    setTimeout(()=>{ el.classList.add('fade-out'); setTimeout(()=>el.remove(),350); },2500);
  },
  escape(s) { return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); },
  time(ms) { const n=Math.ceil(Math.max(0,ms)/1000); return `${Math.floor(n/60)}:${String(n%60).padStart(2,'0')}`; },

  render() {
    const s=Game.state; if (!s?.active) return;
    this.el('player-hp').textContent=s.player.hp;
    this.el('enemy-hp').textContent=s.enemy.hp;
    this.el('enemy-deck-count').textContent=s.enemy.deck.length;
    this.el('enemy-hand').innerHTML=s.enemy.hand.map(()=>'<div class="card-back">✦</div>').join('');
    this.el('player-hero').classList.toggle('active-turn',s.turn==='player');
    this.el('enemy-hero').classList.toggle('active-turn',s.turn==='enemy');
    this.el('btn-end-turn').disabled=s.turn!=='player' || s.busy;
    this.el('turn-banner').textContent=s.turn==='player'?'✦ Ваш ход ✦':'✦ Ход соперника ✦';
    const p=s.player;
    this.el('mana-text').textContent=`${p.mana}/${p.maxMana}`;
    this.el('mana-crystals').innerHTML=Array.from({length:p.maxMana},(_,i)=>`<span class="mana-crystal ${i<p.mana?'':'empty'}"></span>`).join('');
    for (const who of ['player','enemy']) {
      const board=this.el(who+'-board');
      board.innerHTML=s[who].board.map((m,i)=>m?this.minionHTML(m,i,who):`<div class="slot" data-slot="${i}" data-who="${who}"></div>`).join('');
    }
    this.renderHand(); this.markTargets();
  },

  abilityText(d,barrier=!!d.barrier) {
    return [d.taunt?'Защитник':null,d.charge?'Натиск':null,barrier?'Щит':null,d.cleave?'Размах: 1 соседям':null].filter(Boolean).join(' · ');
  },

  minionHTML(m,i,who) {
    const d=CARD_MAP[m.id],len=d.hanzi.length>=3?'len3':d.hanzi.length===2?'len2':'';
    const ability=this.abilityText(d,m.barrier);
    return `<div class="bminion ${m.taunt?'taunt':''} ${m.barrier?'barrier':''} ${m.ready&&m.attacksLeft>0?'ready can-attack':''}" data-slot="${i}" data-who="${who}" data-uid="${m.uid}" title="${this.escape(ability)}">
      ${m.taunt?'<span class="bm-shield" aria-label="Защитник">✥</span>':''}
      ${m.barrier?'<span class="bm-barrier" aria-label="Щит">◆</span>':''}
      <span class="bm-hanzi ${len}">${this.escape(d.hanzi)}</span>
      ${ability?`<span class="bm-ability">${this.escape(ability)}</span>`:''}
      <span class="bm-atk">${m.atk}</span><span class="bm-hp ${m.hp<m.maxHp?'hurt':''}">${m.hp}</span>
    </div>`;
  },

  cardHTML(c) {
    const d=CARD_MAP[c.id],len=d.hanzi.length>=3?'len3':d.hanzi.length===2?'len2':'len1';
    const desc=d.type==='spell'?d.description:this.abilityText(d);
    const unplayable=!Game.canBegin('player',c);
    return `<div class="hand-card ${d.type} ${d.taunt?'taunt':''} ${d.barrier?'barrier':''} ${unplayable?'unplayable':''} ${this.selectedCard?.uid===c.uid?'picked':''}" data-uid="${c.uid}">
      <span class="hc-cost">${d.cost}</span>${d.taunt?'<span class="hc-shield" aria-label="Защитник">✥</span>':''}
      <div class="hc-art"><span class="hc-hanzi ${len}">${this.escape(d.hanzi)}</span></div>
      <div class="hc-desc">${this.escape(desc)}</div>
      ${d.type==='minion'?`<span class="hc-atk">${d.atk}</span><span class="hc-hp">${d.hp}</span>`:''}
      ${c.locked?'<span class="hc-lock">⊘</span>':''}
    </div>`;
  },

  renderHand() {
    const cards=Game.state.player.hand, hand=this.el('hand');
    hand.innerHTML=cards.map(c=>this.cardHTML(c)).join('');
    if (window.innerWidth<=760) {
      hand.querySelectorAll('.hand-card').forEach(el=>{ el.style.transform=''; el.style.zIndex=''; });
      return;
    }
    const n=cards.length;
    const w=hand.clientWidth;
    const cardW=window.innerWidth<=1100?112:132;
    const step=Math.min(cardW*0.78,(w-cardW)/Math.max(1,n-1));
    hand.querySelectorAll('.hand-card').forEach((el,i)=>{
      const x=(i-(n-1)/2)*step-cardW/2;
      const angle=(i-(n-1)/2)*Math.min(5,24/Math.max(1,n-1));
      const lift=Math.abs(i-(n-1)/2)*3;
      el.style.transform=`translateX(${x}px) translateY(${lift}px) rotate(${angle}deg)`;
      el.style.zIndex=i+1;
      el.addEventListener('pointerenter',()=>{ if (!this.drag && !this.selectedCard) { el.style.transform=`translateX(${x}px) translateY(${lift-24}px) rotate(0deg) scale(1.1)`; el.style.zIndex=50; } });
      el.addEventListener('pointerleave',()=>{ if (!this.drag) { el.style.transform=`translateX(${x}px) translateY(${lift}px) rotate(${angle}deg)`; el.style.zIndex=i+1; } });
    });
  },

  startDrag(ev) {
    const el=ev.target.closest('.hand-card');
    if (!el || (ev.pointerType==='mouse' && ev.button!==0) || this.question || this.pendingSpell || this.selectedAttack) return;
    const card=Game.state?.player.hand.find(c=>c.uid===Number(el.dataset.uid));
    if (!card) return;
    if (!Game.canBegin('player',card)) {
      const s=Game.state,def=CARD_MAP[card.id];
      if (s?.active && s.turn==='player' && !s.busy) {
        const reason=card.locked?'Карта заблокирована до следующего хода.':def.cost>s.player.mana?
          `Нужно ${def.cost} маны, сейчас ${s.player.mana}.`:
          'Для этой карты нужна свободная ячейка или подходящая цель.';
        this.toast(reason,'bad');
      }
      return;
    }
    ev.preventDefault();
    this.cancelTarget();
    this.el('hand').setPointerCapture?.(ev.pointerId);
    const ghost=el.cloneNode(true);
    ghost.id='drag-ghost'; ghost.classList.remove('picked');
    ghost.style.zIndex='100';
    ghost.style.transform='translate(-50%, -50%) scale(1.12) rotate(3deg)';
    ghost.style.left=ev.clientX+'px'; ghost.style.top=ev.clientY+'px';
    document.body.appendChild(ghost);
    this.drag={card,ghost,pointerId:ev.pointerId,x:ev.clientX,y:ev.clientY,moved:false};
    el.classList.add('drag-source');
    if (CARD_MAP[card.id].type==='spell') this.el('table-zone').classList.add('spell-drop');
  },

  moveDrag(ev) {
    const d=this.drag;
    if (!d || ev.pointerId!==d.pointerId) return;
    if (!d.moved && Math.hypot(ev.clientX-d.x,ev.clientY-d.y)>5) d.moved=true;
    d.ghost.style.left=ev.clientX+'px'; d.ghost.style.top=ev.clientY+'px';
    document.querySelectorAll('.slot.drop-hover').forEach(x=>x.classList.remove('drop-hover'));
    const hit=document.elementFromPoint(ev.clientX,ev.clientY);
    const slot=hit?.closest('#player-board .slot');
    if (slot && CARD_MAP[d.card.id].type==='minion') slot.classList.add('drop-hover');
  },

  cancelDrag() {
    if (!this.drag) return;
    this.drag.ghost.remove(); this.drag=null;
    this.el('hand').querySelectorAll('.drag-source').forEach(el=>el.classList.remove('drag-source'));
    this.el('table-zone').classList.remove('spell-drop');
    document.querySelectorAll('.slot.drop-hover').forEach(x=>x.classList.remove('drop-hover'));
  },

  endDrag(ev) {
    const d=this.drag;
    if (!d || ev.pointerId!==d.pointerId) return;
    const {card,moved}=d;
    this.cancelDrag();
    if (!moved) { this.selectCard(card); return; }
    const hit=document.elementFromPoint(ev.clientX,ev.clientY);
    const def=CARD_MAP[card.id];
    if (def.type==='minion') {
      const slot=hit?.closest('#player-board .slot');
      const board=hit?.closest('#player-board');
      if (!slot && !board) return;
      const i=slot?Number(slot.dataset.slot):Game.state.player.board.findIndex(x=>!x);
      if (Game.canPlay('player',card,i)) this.ask(card,()=>Game.playCard('player',card,i));
    } else {
      if (!hit?.closest('#table-zone')) return;
      this.prepareSpell(card);
    }
  },

  selectCard(card) {
    if (!Game.canBegin('player',card)) return;
    if (this.selectedCard===card) { this.cancelTarget(); return; }
    this.cancelTarget(); this.selectedCard=card;
    if (CARD_MAP[card.id].type==='spell') this.prepareSpell(card);
    else { this.showTargetHint('Коснись свободной ячейки или перетащи карту'); this.renderHand(); }
  },

  prepareSpell(card) {
    this.selectedCard=null;
    const def=CARD_MAP[card.id];
    if (['damage','bounce','weaken','buff'].includes(def.effect)) {
      this.pendingSpell=card; this.markTargets(); this.showTargetHint('Выбери цель заклинания');
    } else this.ask(card,()=>Game.playCard('player',card));
  },

  handleBoardClick(ev) {
    if (this.attackPointer?.moved) { this.attackPointer=null; return; }
    const s=Game.state;
    if (!s?.active || s.turn!=='player' || s.busy || this.question) return;
    if (this.selectedCard && ev.currentTarget.id==='player-board') {
      const slot=ev.target.closest('.slot');
      if (slot && Game.canPlay('player',this.selectedCard,Number(slot.dataset.slot))) {
        const card=this.selectedCard,i=Number(slot.dataset.slot);
        this.cancelTarget(); this.ask(card,()=>Game.playCard('player',card,i));
      }
      return;
    }
    const node=ev.target.closest('.bminion'); if (!node) return;
    const who=node.dataset.who,slot=Number(node.dataset.slot);
    if (this.pendingSpell) {
      const target={who,slot};
      if (this.spellTargetValid(this.pendingSpell,target)) this.resolveSpell(target);
      return;
    }
    if (this.selectedAttack!==null) {
      if (who==='player') {
        if (slot===this.selectedAttack) this.cancelTarget();
        else if (s.player.board[slot]?.ready && s.player.board[slot]?.attacksLeft>0) {
          this.selectedAttack=slot; this.markTargets();
        }
      } else {
        const target={who,slot};
        if (Game.canAttack('player',this.selectedAttack,target)) this.fireAttack(target);
      }
      return;
    }
    if (who==='player' && s.player.board[slot]?.ready && s.player.board[slot]?.attacksLeft>0) {
      this.selectedAttack=slot; this.markTargets(); this.showTargetHint('Выбери цель атаки');
    }
  },

  handleHeroClick(who) {
    if (this.attackPointer?.moved) { this.attackPointer=null; return; }
    if (who!=='enemy') return;
    const target={who:'enemy',hero:true};
    if (this.pendingSpell && this.spellTargetValid(this.pendingSpell,target)) this.resolveSpell(target);
    else if (this.selectedAttack!==null && Game.canAttack('player',this.selectedAttack,target)) this.fireAttack(target);
  },

  spellTargetValid(card,target) {
    const d=CARD_MAP[card.id],s=Game.state;
    if (d.effect==='damage') return Game.validTarget('player',target,false);
    if (d.effect==='buff') return target.who==='player' && Number.isInteger(target.slot) && !!s.player.board[target.slot];
    return target.who==='enemy' && Number.isInteger(target.slot) && !!s.enemy.board[target.slot];
  },

  resolveSpell(target) {
    const card=this.pendingSpell;
    this.cancelTarget();
    this.ask(card,()=>Game.playCard('player',card,null,target));
  },

  fireAttack(target) {
    const slot=this.selectedAttack; this.cancelTarget();
    Game.attack('player',slot,target);
  },

  startAttackDrag(ev) {
    const node=ev.target.closest('.bminion[data-who="player"]');
    if (!node || ev.button!==0 || this.question || this.pendingSpell || !Game.state?.active || Game.state.turn!=='player' || Game.state.busy) return;
    const slot=Number(node.dataset.slot),m=Game.state.player.board[slot];
    if (!m?.ready || m.attacksLeft<=0 || m.atk<=0) return;
    this.attackPointer={slot,x:ev.clientX,y:ev.clientY,moved:false};
  },

  moveAttackDrag(ev) {
    const p=this.attackPointer;
    if (!p || (!p.moved && Math.hypot(ev.clientX-p.x,ev.clientY-p.y)<8)) return;
    if (!p.moved) {
      ev.preventDefault();
      p.moved=true; this.selectedAttack=p.slot;
      this.markTargets(); this.showTargetHint('Отпусти над целью');
    }
    const source=this.el('player-board').querySelector(`[data-slot="${p.slot}"]`);
    if (!source) return;
    const r=source.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2;
    this.el('arrow-svg').innerHTML=`<defs><marker id="arr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 Z" fill="#ffb15e"/></marker></defs><line x1="${x}" y1="${y}" x2="${ev.clientX}" y2="${ev.clientY}" stroke="#ffb15e" stroke-width="5" marker-end="url(#arr)"/>`;
  },

  endAttackDrag(ev) {
    const p=this.attackPointer;
    if (!p) return;
    if (!p.moved) { this.attackPointer=null; return; }
    this.el('arrow-svg').innerHTML='';
    const hit=document.elementFromPoint(ev.clientX,ev.clientY);
    const minion=hit?.closest('#enemy-board .bminion');
    const target=minion?{who:'enemy',slot:Number(minion.dataset.slot)}:
      hit?.closest('#enemy-hero')?{who:'enemy',hero:true}:null;
    if (target && Game.canAttack('player',p.slot,target)) this.fireAttack(target);
    else this.cancelTarget();
    setTimeout(()=>{ if (this.attackPointer===p) this.attackPointer=null; },0);
  },

  showTargetHint(text) { this.el('targeting-hint').firstChild.textContent=text+' '; this.el('targeting-hint').classList.remove('hidden'); },
  cancelTarget() {
    this.selectedAttack=null; this.selectedCard=null; this.pendingSpell=null;
    if (this.attackPointer && !this.attackPointer.moved) this.attackPointer=null;
    this.el('targeting-hint').classList.add('hidden'); this.el('arrow-svg').innerHTML='';
    this.el('hand').querySelectorAll('.picked').forEach(el=>el.classList.remove('picked'));
    this.markTargets();
  },

  markTargets() {
    document.querySelectorAll('.targetable,.selected').forEach(el=>el.classList.remove('targetable','selected'));
    if (!Game.state?.active) return;
    if (this.selectedAttack!==null) {
      const from=this.el('player-board').querySelector(`[data-slot="${this.selectedAttack}"]`);
      from?.classList.add('selected');
      for (let i=0;i<6;i++) {
        const t={who:'enemy',slot:i};
        if (Game.canAttack('player',this.selectedAttack,t)) this.el('enemy-board').querySelector(`[data-slot="${i}"]`)?.classList.add('targetable');
      }
      if (Game.canAttack('player',this.selectedAttack,{who:'enemy',hero:true})) this.el('enemy-hero').classList.add('targetable');
    }
    if (this.pendingSpell) {
      const d=CARD_MAP[this.pendingSpell.id];
      const who=d.effect==='buff'?'player':'enemy';
      for (let i=0;i<6;i++) {
        if (this.spellTargetValid(this.pendingSpell,{who,slot:i}))
          this.el(who+'-board').querySelector(`[data-slot="${i}"]`)?.classList.add('targetable');
      }
      if (this.spellTargetValid(this.pendingSpell,{who:'enemy',hero:true})) this.el('enemy-hero').classList.add('targetable');
    }
  },

  makeQuestion(def) {
    const modes=['translate','hanzi','pinyin'];
    const mode=modes[Math.floor(Math.random()*modes.length)];
    const pool=CARDS.filter(c=>c.id!==def.id && (c.category===def.category || (def.category==='десятки' && c.category==='числа'))
      && c.meaning!==def.meaning && (mode!=='pinyin'||c.pinyin!==def.pinyin));
    const fallback=CARDS.filter(c=>c.id!==def.id && c.meaning!==def.meaning && (mode!=='pinyin'||c.pinyin!==def.pinyin));
    const shuffled=a=>[...a].sort(()=>Math.random()-0.5);
    const distractors=shuffled(pool).slice(0,3);
    if (distractors.length<3) for (const c of shuffled(fallback)) {
      if (distractors.length>=3) break;
      if (!distractors.some(x=>x.id===c.id)) distractors.push(c);
    }
    const options=shuffled([def,...distractors]);
    return {
      mode,options,answer:def.id,
      label:mode==='translate'?'Что означает этот иероглиф?':mode==='hanzi'?'Какой иероглиф означает это слово?':'Какой иероглиф читается так?',
      prompt:mode==='translate'?def.hanzi:mode==='hanzi'?def.meaning:def.pinyin
    };
  },

  ask(card,onSuccess) {
    const def=CARD_MAP[card.id],q=this.makeQuestion(def); this.question=card; this.qDone=false; this.questionStartedAt=Date.now();
    this.el('q-mode-label').textContent=q.label;
    const prompt=this.el('q-prompt-text'); prompt.textContent=q.prompt;
    prompt.className=q.mode==='hanzi'?'text-prompt':q.mode==='pinyin'?'pinyin-prompt':'';
    this.el('q-options').innerHTML='';
    q.options.forEach(opt=>{
      const btn=document.createElement('button'); btn.className='q-opt '+(q.mode==='translate'?'ru':'');
      btn.textContent=q.mode==='translate'?opt.meaning:opt.hanzi;
      btn.addEventListener('click',()=>this.answerQuestion(btn,opt.id===q.answer,def,card,onSuccess));
      this.el('q-options').appendChild(btn);
    });
    this.el('question-modal').classList.remove('hidden');
    const bar=this.el('q-timer-bar'); bar.classList.remove('ticking'); void bar.offsetWidth; bar.classList.add('ticking');
    this.qTimeout=setTimeout(()=>this.answerQuestion(null,false,def,card,onSuccess),15000);
  },

  answerQuestion(btn,correct,def,card,onSuccess) {
    if (this.qDone) return;
    this.qDone=true; clearTimeout(this.qTimeout);
    if (btn) btn.classList.add(correct?'correct':'wrong');
    const s=Game.state;
    if (!s?.active || s.turn!=='player' || !s.player.hand.includes(card) || card.locked) {
      this.el('question-modal').classList.add('hidden'); this.question=null; this.render(); return;
    }
    Game.recordAnswer(def.id,correct);
    Sound.play(correct?'correct':'wrong');
    if (!correct) {
      card.locked=true;
      this.toast(`Ошибка: ${def.hanzi} (${def.pinyin}) — ${def.meaning}. Карта под замком до следующего хода.`, 'bad');
    } else this.toast(`Верно! ${def.hanzi} (${def.pinyin}) — ${def.meaning}`, 'good');
    setTimeout(()=>{
      this.el('question-modal').classList.add('hidden'); this.question=null;
      if (correct && Game.state===s && s.active && s.turn==='player' && s.player.hand.includes(card)) onSuccess();
      this.render();
    },700);
  },

  animateDamage(d) {
    const selector=d.hero?`#${d.who}-hero`:`#${d.who}-board [data-slot="${d.slot}"]`;
    const el=document.querySelector(selector); if (!el) return;
    const r=el.getBoundingClientRect();
    const floater=document.createElement('div'); floater.className='float-num '+(d.kind==='fatigue'?'fatigue':d.kind==='cleave'?'cleave':'dmg');
    floater.textContent='−'+d.amount; floater.style.left=(r.left+r.width/2-15)+'px'; floater.style.top=(r.top+r.height/3)+'px';
    document.body.appendChild(floater); setTimeout(()=>floater.remove(),1050);
    el.classList.add(d.kind==='cleave'?'splash-hit':'hit'); setTimeout(()=>el.classList.remove('hit','splash-hit'),350);
    if (d.kind!=='cleave') {
      this.el('table-zone').classList.remove('shake'); void this.el('table-zone').offsetWidth; this.el('table-zone').classList.add('shake');
    }
    Sound.play(d.kind==='cleave'?'cleave':'hit');
  },

  animateBarrier(d) {
    const el=this.el(d.who+'-board').querySelector(`[data-slot="${d.slot}"]`);
    if (!el) return;
    const r=el.getBoundingClientRect(),f=document.createElement('div');
    f.className='float-num barrier-break'; f.textContent='◆';
    f.style.left=(r.left+r.width/2-15)+'px'; f.style.top=(r.top+r.height/3)+'px';
    document.body.appendChild(f); setTimeout(()=>f.remove(),1050);
    el.classList.add('shield-hit'); setTimeout(()=>el.classList.remove('shield-hit'),400);
    Sound.play('barrier');
  },

  animateHeal(d) {
    const el=this.el(d.who+'-hero'); if (!el) return;
    const r=el.getBoundingClientRect(),f=document.createElement('div'); f.className='float-num heal';
    f.textContent='+'+d.amount; f.style.left=(r.left+r.width/2-15)+'px'; f.style.top=(r.top+r.height/3)+'px';
    document.body.appendChild(f); setTimeout(()=>f.remove(),1050);
    Sound.play('heal');
  },

  attackStart(d) {
    const from=this.el(d.who+'-board').querySelector(`[data-slot="${d.slot}"]`);
    const to=d.target.hero?this.el(d.target.who+'-hero'):this.el(d.target.who+'-board').querySelector(`[data-slot="${d.target.slot}"]`);
    if (!from||!to) return;
    const a=from.getBoundingClientRect(),b=to.getBoundingClientRect();
    const x1=a.left+a.width/2,y1=a.top+a.height/2,x2=b.left+b.width/2,y2=b.top+b.height/2;
    this.el('arrow-svg').innerHTML=`<defs><marker id="arr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8 Z" fill="#ffb15e"/></marker></defs><line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#ffb15e" stroke-width="5" stroke-dasharray="10 5" marker-end="url(#arr)"/>`;
    from.style.transition='transform 0.25s ease-in';
    from.style.transform=`translate(${(x2-x1)*0.72}px,${(y2-y1)*0.72}px) scale(1.2)`;
    from.style.zIndex='70';
    Sound.play('attack');
    setTimeout(()=>{ if (from.isConnected) { from.style.transform=''; from.style.zIndex=''; } this.el('arrow-svg').innerHTML=''; },410);
  },

  onGameEvent(type,d) {
    switch(type) {
      case 'tick':
        if (this.question && !this.qDone && Date.now()-this.questionStartedAt>=15000)
          this.answerQuestion(null,false,CARD_MAP[this.question.id],this.question,()=>{});
        this.el('match-timer').textContent=this.time(d.remaining);
        this.el('match-timer').classList.toggle('low',d.remaining<60000);
        this.el('turn-timer-bar').style.width=(d.turnRemaining/600)+'%';
        break;
      case 'damage': this.render(); this.animateDamage(d); break;
      case 'barrierBreak': this.render(); this.animateBarrier(d); break;
      case 'heal': this.animateHeal(d); this.render(); break;
      case 'attackStart': this.attackStart(d); break;
      case 'attackEnd': this.render(); break;
      case 'death': Sound.play('death'); break;
      case 'turnStart':
        this.cancelDrag(); this.cancelTarget();
        if (this.question && d.who!=='player') {
          clearTimeout(this.qTimeout); this.qDone=true; this.question=null;
          this.el('question-modal').classList.add('hidden');
        }
        this.render(); Sound.play('turn');
        this.toast(d.who==='player'?'Ваш ход!':'Ход хозяина таверны'); break;
      case 'turnTimeout': this.toast('Время хода истекло!','bad'); break;
      case 'fatigue': this.toast('Колода пуста! Усталость: −'+d.amount+' HP','bad'); break;
      case 'burn': this.toast('Рука полна! Карта сгорела.','bad'); break;
      case 'play': this.render(); if (d.card.type==='minion') {
        const el=this.el(d.who+'-board').querySelector(`[data-slot="${d.slot}"]`);
        el?.classList.add('summoned'); setTimeout(()=>el?.classList.remove('summoned'),500);
        Sound.play('summon');
      } break;
      case 'draw': this.render(); break;
      case 'started': this.render(); break;
      case 'finish':
        this.cancelDrag(); this.cancelTarget(); clearTimeout(this.qTimeout); this.el('question-modal').classList.add('hidden');
        this.question=null; Storage.saveMatch(Game.state); this.showResults(Game.state); break;
    }
  },

  showResults(s) {
    this.showScreen('screen-results');
    const title=s.result==='player'?'Победа!':s.result==='enemy'?'Поражение...':'Ничья!';
    this.el('result-title').textContent=title;
    this.el('result-sub').textContent=`${s.reason} · ${this.time(s.duration)} · ${s.player.hp} : ${s.enemy.hp} HP`;
    const stats=Object.entries(s.matchStats),right=stats.reduce((n,[,v])=>n+v.correct,0),wrong=stats.reduce((n,[,v])=>n+v.wrong,0);
    this.el('result-summary').textContent=`Правильных ответов: ${right} · Ошибок: ${wrong} · Точность: ${right+wrong?Math.round(right/(right+wrong)*100):0}%`;
    this.el('victory-code').classList.toggle('hidden',s.result!=='player' || s.difficulty!=='normal');
    this.el('result-table').innerHTML='<thead><tr><th>Иероглиф</th><th>Пиньинь</th><th>Перевод</th><th>✓</th><th>✗</th></tr></thead><tbody>'+
      (stats.length?stats.map(([id,v])=>{
        const c=CARD_MAP[id];
        return `<tr><td class="hz">${this.escape(c.hanzi)}</td><td class="py">${this.escape(c.pinyin)}</td><td>${this.escape(c.meaning)}</td><td class="ok">${v.correct}</td><td class="err">${v.wrong}</td></tr>`;
      }).join(''):'<tr><td colspan="5">В этом матче пока нет ответов</td></tr>')+'</tbody>';
  },

  showStats() {
    const data=Storage.load(), games=data.wins+data.losses+data.draws;
    this.showScreen('screen-stats');
    const learned=Object.values(data.cards).filter(v=>v.correct+v.wrong>=3 && v.correct/(v.correct+v.wrong)>=0.8).length;
    this.el('stats-summary').textContent=`Матчей: ${games} · Побед: ${data.wins} · Поражений: ${data.losses} · Ничьих: ${data.draws} · Винрейт: ${games?Math.round(data.wins/games*100):0}% · Выучено: ${learned}`;
    const rows=Object.entries(data.cards).filter(([id])=>CARD_MAP[id]).sort((a,b)=>(b[1].correct+b[1].wrong)-(a[1].correct+a[1].wrong));
    this.el('stats-table').innerHTML='<thead><tr><th>Иероглиф</th><th>Пиньинь</th><th>Перевод</th><th>✓</th><th>✗</th><th>Точность</th></tr></thead><tbody>'+
      (rows.length?rows.map(([id,v])=>{
        const c=CARD_MAP[id],total=v.correct+v.wrong,pct=Math.round(v.correct/total*100);
        return `<tr><td class="hz">${this.escape(c.hanzi)}</td><td class="py">${this.escape(c.pinyin)}</td><td>${this.escape(c.meaning)}</td><td class="ok">${v.correct}</td><td class="err">${v.wrong}</td><td>${pct}%${total>=3&&pct>=80?'<span class="badge-learned">выучено</span>':''}</td></tr>`;
      }).join(''):'<tr><td colspan="6">Пока нет ответов</td></tr>')+'</tbody>';
  },

  init() {
    const hand=this.el('hand');
    hand.addEventListener('pointerdown',e=>this.startDrag(e));
    hand.addEventListener('pointermove',e=>this.moveDrag(e));
    hand.addEventListener('pointerup',e=>this.endDrag(e));
    hand.addEventListener('pointercancel',()=>this.cancelDrag());
    hand.addEventListener('dragstart',e=>e.preventDefault());
    this.el('player-board').addEventListener('click',e=>this.handleBoardClick(e));
    this.el('player-board').addEventListener('pointerdown',e=>this.startAttackDrag(e));
    window.addEventListener('pointermove',e=>this.moveAttackDrag(e));
    window.addEventListener('pointerup',e=>this.endAttackDrag(e));
    this.el('enemy-board').addEventListener('click',e=>this.handleBoardClick(e));
    this.el('enemy-hero').addEventListener('click',()=>this.handleHeroClick('enemy'));
    this.el('btn-cancel-target').addEventListener('click',()=>this.cancelTarget());
    window.addEventListener('keydown',e=>{ if (e.key==='Escape') this.cancelTarget(); });
    window.addEventListener('resize',()=>{ if (Game.state?.active) this.renderHand(); });
  }
};
